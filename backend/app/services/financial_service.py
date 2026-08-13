import os
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from typing import Dict


class FinancialService:
    @staticmethod
    def get_commission_percent() -> Decimal:
        """
        Retrieves configured platform commission percentage.
        """
        val = os.getenv("PLATFORM_COMMISSION_PERCENT", "10")
        return Decimal(val)

    @staticmethod
    def get_payout_hold_days() -> int:
        """
        Retrieves payout hold duration.
        """
        return int(os.getenv("PAYOUT_HOLD_DAYS", "2"))

    @staticmethod
    def calculate_splits(amount: Decimal) -> Dict[str, Decimal]:
        """
        Splits gross booking amount into platform commission and freelancer share.
        Ensures proper quantization to 2 decimal places.
        """
        comm_pct = FinancialService.get_commission_percent()
        
        # Calculate platform fee
        gross = Decimal(amount).quantize(Decimal("0.01"))
        fee = (gross * (comm_pct / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        free_share = gross - fee

        return {
            "gross_amount": gross,
            "commission_percent": comm_pct,
            "platform_fee_amount": fee,
            "freelancer_amount": free_share
        }

    @staticmethod
    def calculate_availability_date(completed_at: datetime) -> datetime:
        """
        Calculates when pending earnings become available based on complete date and hold settings.
        """
        hold_days = FinancialService.get_payout_hold_days()
        return completed_at + timedelta(days=hold_days)
