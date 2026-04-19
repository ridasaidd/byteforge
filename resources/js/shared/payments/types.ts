export interface PaymentInfoBase {
  id: number;
  provider: 'stripe' | 'swish' | 'klarna';
  provider_transaction_id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface StripePaymentInfo extends PaymentInfoBase {
  provider: 'stripe';
  client_secret: string;
  publishable_key: string;
}

export interface SwishPaymentInfo extends PaymentInfoBase {
  provider: 'swish';
  redirect_url: string;
}

export interface KlarnaPaymentInfo extends PaymentInfoBase {
  provider: 'klarna';
  client_token: string;
  session_id: string;
}

export type PaymentInfo = StripePaymentInfo | SwishPaymentInfo | KlarnaPaymentInfo;
