"""
PULSE — Authentication Service

Handles Google OAuth flow + JWT token creation/validation.
"""

from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User


# --- Google OAuth Constants ---
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# Combined scopes: profile + email + YouTube read-only
GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]


# ============================================================
# JWT TOKEN HANDLING
# ============================================================

def create_access_token(user_id: str) -> str:
    """Create JWT access token for a user."""
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token


def decode_access_token(token: str) -> dict:
    """Decode + verify JWT. Raises JWTError if invalid/expired."""
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    return payload


# ============================================================
# GOOGLE OAUTH FLOW
# ============================================================

def build_google_auth_url() -> str:
    """
    Build the URL that the frontend redirects users to
    for Google login + YouTube authorization.
    """
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",       # required to get refresh_token
        "prompt": "consent select_account",            # forces refresh_token even on re-login
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    """
    Exchange the authorization code (from Google callback) for access + refresh tokens.
    """
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        response.raise_for_status()
        return response.json()


async def get_google_user_info(access_token: str) -> dict:
    """Fetch user profile from Google using the access token."""
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
        response.raise_for_status()
        return response.json()


# ============================================================
# USER MANAGEMENT
# ============================================================

def get_or_create_user(db: Session, google_info: dict) -> User:
    """
    Find existing user by Google ID, or create a new one.
    Updates last_login_at on every login.
    """
    google_id = google_info["sub"]
    email = google_info["email"]

    user = db.query(User).filter(User.google_id == google_id).first()

    if user is None:
        # New user — create
        user = User(
            google_id=google_id,
            email=email,
            name=google_info.get("name", email),
            picture_url=google_info.get("picture"),
            last_login_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        # Existing user — update last login
        user.last_login_at = datetime.utcnow()
        # Optionally refresh profile fields in case they changed
        user.name = google_info.get("name", user.name)
        user.picture_url = google_info.get("picture", user.picture_url)

    db.commit()
    db.refresh(user)
    return user


def save_youtube_connection(
    db: Session,
    user: User,
    google_info: dict,
    tokens: dict,
) -> None:
    """
    Store the user's YouTube OAuth connection.
    Called after successful Google login (since we requested YouTube scopes).
    """
    from app.models.platform_connection import PlatformConnection

    google_id = google_info["sub"]

    # Check if a YouTube connection already exists for this user
    existing = (
        db.query(PlatformConnection)
        .filter(
            PlatformConnection.user_id == user.id,
            PlatformConnection.platform == "youtube",
        )
        .first()
    )

    expires_at = None
    if tokens.get("expires_in"):
        expires_at = datetime.utcnow() + timedelta(seconds=int(tokens["expires_in"]))

    if existing:
        existing.access_token = tokens["access_token"]
        if tokens.get("refresh_token"):
            existing.refresh_token = tokens["refresh_token"]
        existing.token_expires_at = expires_at
        existing.scopes = tokens.get("scope", " ".join(GOOGLE_SCOPES))
        existing.last_used_at = datetime.utcnow()
    else:
        new_connection = PlatformConnection(
            user_id=user.id,
            platform="youtube",
            platform_user_id=google_id,  # will update with actual YT channel ID later
            platform_username=google_info.get("name"),
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            token_expires_at=expires_at,
            scopes=tokens.get("scope", " ".join(GOOGLE_SCOPES)),
        )
        db.add(new_connection)

    db.commit()