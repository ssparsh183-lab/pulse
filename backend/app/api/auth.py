"""
PULSE — Auth Routes

/api/auth/google/url         → get Google login URL
/api/auth/google/callback    → handle Google OAuth callback
/api/auth/me                 → get current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginResponse,
    UserResponse,
    GoogleAuthURL,
)
from app.services.auth_service import (
    build_google_auth_url,
    exchange_code_for_tokens,
    get_google_user_info,
    get_or_create_user,
    save_youtube_connection,
    create_access_token,
)


router = APIRouter()


@router.get("/google/url", response_model=GoogleAuthURL)
def get_google_auth_url():
    """
    Frontend calls this first to get the Google login URL.
    Redirects user to this URL for OAuth consent.
    """
    return GoogleAuthURL(auth_url=build_google_auth_url())


@router.post("/google/callback", response_model=LoginResponse)
async def google_callback(
    body: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Frontend receives 'code' from Google's redirect, sends it here.
    We exchange code for tokens, fetch user info, create/update user,
    save YouTube connection, and return a JWT.
    """
    try:
        # 1. Exchange code for Google tokens
        tokens = await exchange_code_for_tokens(body.code)

        # 2. Fetch user profile
        google_info = await get_google_user_info(tokens["access_token"])

        # 3. Create or update user
        user = get_or_create_user(db, google_info)

        # 4. Save YouTube OAuth connection (same tokens work for YouTube)
        save_youtube_connection(db, user, google_info, tokens)

        # 5. Create our own JWT for API auth
        access_token = create_access_token(user.id)

        return LoginResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth flow failed: {str(e)}",
        )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user