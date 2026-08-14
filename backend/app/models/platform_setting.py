import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SettingValueType(str, enum.Enum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    DECIMAL = "DECIMAL"
    BOOLEAN = "BOOLEAN"
    JSON = "JSON"


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    value_type = Column(Enum(SettingValueType), default=SettingValueType.STRING, nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)
    updated_by_admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    updater = relationship("User", foreign_keys=[updated_by_admin_id])

    def __repr__(self) -> str:
        return f"<PlatformSetting key='{self.key}' value='{self.value}'>"
