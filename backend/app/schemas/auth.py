"""PULSE — Auth Schemas"""

from typing import Optional

from pydantic import BaseModel, EmailStr


class GoogleLoginRequest(BaseModel):
    """Frontend sends the code received from Google OAuth."""
    code: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class GoogleAuthURL(BaseModel):
    """URL to redirect user to for Google OAuth."""
    auth_url: str