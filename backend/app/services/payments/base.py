from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from decimal import Decimal


class PaymentProvider(ABC):
    @abstractmethod
    def create_order(self, payment_number: str, amount: Decimal, currency: str = "INR") -> Dict[str, Any]:
        """
        Creates a payment order with the provider.
        Returns provider response payload containing order identifier.
        """
        pass

    @abstractmethod
    def verify_payment(self, payload: Dict[str, Any]) -> bool:
        """
        Verifies that payment returned signature is valid.
        """
        pass

    @abstractmethod
    def create_refund(self, provider_payment_id: str, amount: Decimal, refund_number: str) -> Dict[str, Any]:
        """
        Creates a refund with the provider.
        """
        pass

    @abstractmethod
    def create_transfer(self, amount: Decimal, destination_account_id: str, provider_payment_id: str, payout_number: str) -> Dict[str, Any]:
        """
        Transfers money to freelancer payout account (linked account) using distribution feature.
        """
        pass
