from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserOut,
    UserRegisterResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new client or freelancer account"
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user (CLIENT or FREELANCER). Rejects ADMIN registration.
    """
    user = AuthService.register(db, user_in)
    return {
        "message": "Account created successfully",
        "user": user
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in using email or phone number"
)
def login(credentials: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Log in a user using an identifier (email or phone) and a password.
    Returns access and refresh tokens.
    """
    user, access_token, refresh_token = AuthService.login(db, credentials)
    
    # Set HttpOnly cookies for secure session management
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True in production (HTTPS)
        samesite="lax",
        max_age=3600  # 1 hour
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600 * 24 * 7  # 7 days
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token using refresh token"
)
def refresh_token(request_obj: Request, response: Response, request: Optional[RefreshTokenRequest] = Body(None), db: Session = Depends(get_db)):
    """
    Generate a new access token using a valid refresh token from HttpOnly cookie.
    """
    # Prefer cookie, fallback to request body
    token = request_obj.cookies.get("refresh_token")
    if not token and request:
        token = request.refresh_token
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )
        
    access_token = AuthService.refresh_access_token(db, token)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out from the session"
)
def logout(response: Response):
    """
    Logout clears the HttpOnly authentication cookies.
    """
    response.delete_cookie(key="access_token", samesite="lax")
    response.delete_cookie(key="refresh_token", samesite="lax")
    return {"detail": "Successfully logged out"}


@router.get(
    "/me",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get current logged in user details"
)
def get_me(current_user: User = Depends(get_current_active_user)):
    """
    Return the profile details of the currently authenticated active user.
    """
    return current_user


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link"
)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a password reset token and sends a reset link to the email.
    Always returns a generic success message to prevent account enumeration.
    """
    AuthService.initiate_password_reset(db, request.email)
    return {
        "message": "If an account exists with this email, password reset instructions have been sent."
    }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using a token"
)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Confirm password reset using the token sent via email and the new password.
    """
    AuthService.confirm_password_reset(db, request)
    return {"message": "Password has been reset successfully"}


@router.post(
    "/send-verification",
    status_code=status.HTTP_200_OK,
    summary="Re-send email verification link"
)
def send_verification(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Send or re-send the email verification link to the currently active user.
    """
    AuthService.send_verification_email(db, current_user)
    return {"message": "Verification email has been sent successfully"}


@router.post(
    "/verify-email",
    status_code=status.HTTP_200_OK,
    summary="Verify email using verification token"
)
def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Verify the user email address using the token.
    """
    AuthService.verify_email(db, request.token)
    return {"message": "Email address verified successfully"}
