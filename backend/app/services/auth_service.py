from datetime import timedelta
import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, create_token, decode_token
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, LoginRequest, ResetPasswordRequest
from app.services.email_service import EmailService
from app.models.user import User


class AuthService:
    @staticmethod
    def register(db: Session, user_in: UserCreate) -> User:
        """
        Handle user registration, hash the password, and check for duplicates.
        """
        # Validate unique email
        if UserRepository.get_by_email(db, user_in.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists"
            )

        # Validate unique phone
        if UserRepository.get_by_phone(db, user_in.phone):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number already exists"
            )

        # Create user dict and hash password
        user_data = user_in.model_dump()
        password = user_data.pop("password")
        user_data["password_hash"] = get_password_hash(password)

        # Save to DB
        user = UserRepository.create(db, user_data)
        
        # Trigger email verification token & log/send
        verification_token = create_token(user.id, "email_verification")
        EmailService.send_email_verification(user.email, verification_token)

        return user

    @staticmethod
    def login(db: Session, credentials: LoginRequest) -> tuple[User, str, str]:
        """
        Authenticate user and return a tuple of (User, access_token, refresh_token).
        """
        user = UserRepository.get_by_email_or_phone(db, credentials.identifier)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/phone or password"
            )

        if not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/phone or password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Generate tokens
        access_token = create_token(user.id, "access", role=user.role.value)
        refresh_token = create_token(user.id, "refresh")

        return user, access_token, refresh_token

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> str:
        """
        Validate refresh token and generate a new access token.
        """
        try:
            payload = decode_token(refresh_token, "refresh")
            user_id = int(payload.get("sub"))
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired refresh token: {str(e)}"
            )

        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Generate new access token
        access_token = create_token(user.id, "access", role=user.role.value)
        return access_token

    @staticmethod
    def initiate_password_reset(db: Session, email: str) -> None:
        """
        Start the password reset flow. Does not leak if the user exists or not.
        """
        user = UserRepository.get_by_email(db, email)
        if user:
            reset_token = create_token(user.id, "password_reset")
            EmailService.send_password_reset(user.email, reset_token)

    @staticmethod
    def confirm_password_reset(db: Session, reset_in: ResetPasswordRequest) -> None:
        """
        Validate reset token and set new password.
        """
        try:
            payload = decode_token(reset_in.token, "password_reset")
            user_id = int(payload.get("sub"))
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or expired password reset token: {str(e)}"
            )

        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Update password hash
        new_password_hash = get_password_hash(reset_in.new_password)
        UserRepository.update(db, user, {"password_hash": new_password_hash})

    @staticmethod
    def send_verification_email(db: Session, user: User) -> None:
        """
        Re-send the verification email.
        """
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )
            
        verification_token = create_token(user.id, "email_verification")
        EmailService.send_email_verification(user.email, verification_token)

    @staticmethod
    def verify_email(db: Session, token: str) -> None:
        """
        Verify the email using the verification token.
        """
        try:
            payload = decode_token(token, "email_verification")
            user_id = int(payload.get("sub"))
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or expired verification token: {str(e)}"
            )

        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )

        UserRepository.update(db, user, {"is_verified": True})
