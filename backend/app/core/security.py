from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
import bcrypt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against the hashed password.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """
    Generate a hash from a plain password.
    """
    # bcrypt requires a salt and accepts bytes
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_token(
    subject: Union[str, int],
    token_type: str,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate a JWT token (Access, Refresh, Reset, or Verification).
    """
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        if token_type == "access":
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        elif token_type == "refresh":
            expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        elif token_type in ["password_reset", "email_verification"]:
            # Short-lived tokens: 30 minutes
            expire = now + timedelta(minutes=30)
        else:
            expire = now + timedelta(minutes=15)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }
    
    if role and token_type == "access":
        to_encode["role"] = role

    # Select key based on token type
    secret_key = (
        settings.JWT_REFRESH_SECRET_KEY
        if token_type == "refresh"
        else settings.JWT_SECRET_KEY
    )

    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str, expected_type: str) -> dict:
    """
    Decode and validate a JWT token, verifying its type and signature.
    """
    secret_key = (
        settings.JWT_REFRESH_SECRET_KEY
        if expected_type == "refresh"
        else settings.JWT_SECRET_KEY
    )
    
    try:
        payload = jwt.decode(
            token, secret_key, algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Verify token type
        if payload.get("type") != expected_type:
            raise jwt.InvalidTokenError("Token type does not match")
            
        return payload
    except jwt.ExpiredSignatureError:
        raise jwt.ExpiredSignatureError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid token: {str(e)}")
