import jwt
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository

# Setup bearer token scheme
security_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Dependency that optionally returns the authenticated user, or None if guest.
    """
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        return None
    try:
        payload = decode_token(token, "access")
        user_id = int(payload.get("sub"))
        return UserRepository.get_by_id(db, user_id)
    except Exception:
        return None


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that validates the JWT access token and yields the current user.
    """
    # Prefer cookie-based authentication
    token = request.cookies.get("access_token")
    
    # Fallback to Authorization Header (for API clients/mobile apps)
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token, "access")
        user_id = int(payload.get("sub"))
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserRepository.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that validates that the authenticated user is active.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return current_user


class RoleChecker:
    """
    FastAPI dependency to verify if the current user has the required roles.
    """
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(
        self, current_user: User = Depends(get_current_active_user)
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user


def require_role(role: str):
    """
    Helper function to generate role validation dependencies.
    Usage: Depends(require_role("ADMIN")) or Depends(require_role("CLIENT"))
    """
    try:
        role_enum = UserRole[role.upper()]
    except KeyError:
        raise ValueError(f"Invalid role configuration name: {role}")
    return RoleChecker([role_enum])