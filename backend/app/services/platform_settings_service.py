import json
from decimal import Decimal
from typing import Any, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.platform_setting import PlatformSetting, SettingValueType
from app.services.audit_service import AuditService

DEFAULT_SETTINGS = {
    "PLATFORM_COMMISSION_PERCENT": ("10.00", SettingValueType.DECIMAL, "Platform commission percentage from payouts"),
    "PAYOUT_HOLD_DAYS": ("7", SettingValueType.INTEGER, "Hold duration of completed bookings before payouts"),
    "MINIMUM_PAYOUT_AMOUNT": ("500.00", SettingValueType.DECIMAL, "Minimum payment total to claim payout"),
    "TOP_RATED_MIN_REVIEWS": ("5", SettingValueType.INTEGER, "Minimum reviews for top badge"),
    "TOP_RATED_MIN_RATING": ("4.5", SettingValueType.DECIMAL, "Minimum average rating for top badge"),
    "TOP_RATED_MIN_COMPLETED_BOOKINGS": ("5", SettingValueType.INTEGER, "Minimum completed bookings for top badge"),
    "MAX_IMAGE_UPLOAD_MB": ("10", SettingValueType.INTEGER, "Maximum image size limit in MB"),
    "MAX_VIDEO_UPLOAD_MB": ("100", SettingValueType.INTEGER, "Maximum video size limit in MB")
}


class PlatformSettingsService:
    @staticmethod
    def seed_defaults_if_empty(db: Session) -> None:
        count = db.query(PlatformSetting).count()
        if count == 0:
            for key, (val, val_type, desc) in DEFAULT_SETTINGS.items():
                setting = PlatformSetting(
                    key=key,
                    value=val,
                    value_type=val_type,
                    description=desc,
                    is_public=True
                )
                db.add(setting)
            db.commit()

    @staticmethod
    def get_setting_raw(db: Session, key: str) -> PlatformSetting:
        PlatformSettingsService.seed_defaults_if_empty(db)
        setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        if not setting:
            # Fallback if key not in DB but defined in defaults
            if key in DEFAULT_SETTINGS:
                val, val_type, desc = DEFAULT_SETTINGS[key]
                setting = PlatformSetting(
                    key=key,
                    value=val,
                    value_type=val_type,
                    description=desc,
                    is_public=True
                )
                db.add(setting)
                db.commit()
                db.refresh(setting)
                return setting
            raise HTTPException(status_code=404, detail=f"Configuration key '{key}' not found.")
        return setting

    @staticmethod
    def get_value(db: Session, key: str) -> Any:
        # Prevent secret extraction through settings lookup service
        # (Though database keys like JWT_SECRET aren't in platform_settings, we restrict lookup specifically to allowed keys)
        forbidden_substrings = ["secret", "password", "key", "token", "smtp", "db"]
        if any(f in key.lower() for f in forbidden_substrings):
            raise HTTPException(status_code=403, detail="Access to credentials/secrets is forbidden.")

        setting = PlatformSettingsService.get_setting_raw(db, key)
        val_str = setting.value
        val_type = setting.value_type

        try:
            if val_type == SettingValueType.INTEGER:
                return int(val_str)
            elif val_type == SettingValueType.DECIMAL:
                return Decimal(val_str)
            elif val_type == SettingValueType.BOOLEAN:
                return val_str.lower() in ("true", "1", "yes")
            elif val_type == SettingValueType.JSON:
                return json.loads(val_str)
            return val_str
        except Exception:
            # Return raw string if cast fails
            return val_str

    @staticmethod
    def update_setting(db: Session, admin_id: int, key: str, value: str) -> PlatformSetting:
        setting = PlatformSettingsService.get_setting_raw(db, key)
        
        # Type Validation
        val_type = setting.value_type
        try:
            if val_type == SettingValueType.INTEGER:
                int(value)
            elif val_type == SettingValueType.DECIMAL:
                Decimal(value)
            elif val_type == SettingValueType.BOOLEAN:
                if value.lower() not in ("true", "false", "1", "0"):
                    raise ValueError()
            elif val_type == SettingValueType.JSON:
                json.loads(value)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid format value for config type {val_type}.")

        old_value = setting.value
        setting.value = value
        setting.updated_by_admin_id = admin_id
        db.commit()
        db.refresh(setting)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=admin_id,
            action="PLATFORM_SETTING_CHANGED",
            entity_type="platform_setting",
            entity_id=setting.id,
            description=f"Updated setting key '{key}' from '{old_value}' to '{value}'",
            metadata_json={"key": key, "old_value": old_value, "new_value": value}
        )

        return setting
