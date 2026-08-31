import { api } from "@/lib/api";

export interface PaymentOrderResponse {
  payment_number: string;
  provider: string;
  provider_order_id: string;
  amount: number; // in paise
  currency: string;
  razorpay_key_id: string;
}

export interface PaymentEligibilityResponse {
  booking_id: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_stage: string;
  can_pay: boolean;
  blocking_reason: string | null;
}

export interface PaymentVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentSummaryResponse {
  booking_number: string;
  amount: number;
  currency: string;
  payment_status: string;
}

export interface PaymentResponse {
  id: number;
  payment_number: string;
  booking_id: number;
  client_id: number;
  freelancer_profile_id: number;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  currency: string;
  gross_amount: number;
  platform_fee_amount: number;
  freelancer_amount: number;
  gateway_fee_amount: number | null;
  tax_amount: number | null;
  commission_percent_snapshot: number;
  status: string;
  payment_method: string | null;
  failure_code: string | null;
  failure_description: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    full_name: string;
    email: string;
  };
  freelancer_profile?: {
    user?: {
      full_name: string;
    };
  };
}

export interface RefundResponse {
  id: number;
  refund_number: string;
  payment_id: number;
  booking_id: number;
  provider: string;
  provider_refund_id: string | null;
  amount: number;
  reason: string | null;
  requested_by: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
}

export interface EarningSummaryResponse {
  total_earned: number;
  pending: number;
  available: number;
  paid_out: number;
  currency: string;
}

export interface LedgerEntryResponse {
  id: number;
  user_id: number | null;
  freelancer_profile_id: number | null;
  booking_id: number | null;
  payment_id: number | null;
  payout_id: number | null;
  refund_id: number | null;
  entry_type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
}

export interface PayoutAccountResponse {
  id: number;
  freelancer_profile_id: number;
  provider: string;
  provider_account_id: string;
  account_holder_name: string | null;
  account_type: string;
  status: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayoutResponse {
  id: number;
  payout_number: string;
  freelancer_profile_id: number;
  provider: string;
  provider_transfer_id: string | null;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  initiated_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const paymentService = {
  async getPaymentEligibility(bookingId: number | string): Promise<PaymentEligibilityResponse> {
    return api.get(`/client/bookings/${bookingId}/payment/eligibility`);
  },

  async createPaymentOrder(bookingId: number | string): Promise<PaymentOrderResponse> {
    return api.post(`/client/bookings/${bookingId}/payment/order`, {});
  },

  async verifyPayment(bookingId: number | string, data: PaymentVerifyPayload): Promise<PaymentResponse> {
    return api.post(`/client/bookings/${bookingId}/payment/verify`, data);
  },

  async getPaymentSummary(bookingId: number | string): Promise<PaymentSummaryResponse> {
    return api.get(`/client/bookings/${bookingId}/payment-summary`);
  },

  async getClientPayments(): Promise<PaymentResponse[]> {
    return api.get("/client/payments");
  },

  async getPaymentReceipt(id: number | string): Promise<PaymentResponse> {
    return api.get(`/client/payments/${id}`);
  },

  async requestRefund(bookingId: number | string, reason: string): Promise<RefundResponse> {
    return api.post(`/client/bookings/${bookingId}/refund-request`, { reason });
  },

  async getFreelancerEarnings(): Promise<EarningSummaryResponse> {
    return api.get("/freelancer/earnings");
  },

  async getFreelancerTransactions(): Promise<LedgerEntryResponse[]> {
    return api.get("/freelancer/earnings/transactions");
  },

  async configurePayoutAccount(providerAccountId: string, accountHolderName?: string, accountType: string = "bank_account"): Promise<PayoutAccountResponse> {
    return api.post("/freelancer/earnings/payout-account", {
      provider_account_id: providerAccountId,
      account_holder_name: accountHolderName,
      account_type: accountType
    });
  },

  async getFreelancerPayouts(): Promise<PayoutResponse[]> {
    return api.get("/freelancer/payouts");
  },

  async requestPayout(amount?: number): Promise<PayoutResponse> {
    return api.post("/freelancer/payouts/request", { amount });
  }
};
