import { http } from '../http';
import type {
  ApiResponse,
  PaymentProviderCode,
  TenantPaymentProvider,
  TestTenantPaymentProviderData,
  UpsertTenantPaymentProviderData,
} from './types';

export const paymentProviders = {
  list: () => http.get<ApiResponse<TenantPaymentProvider[]>>('/payment-providers'),

  create: (provider: PaymentProviderCode, payload: UpsertTenantPaymentProviderData) =>
    http.post<ApiResponse<TenantPaymentProvider>>('/payment-providers', {
      provider,
      ...payload,
    }),

  update: (provider: PaymentProviderCode, payload: UpsertTenantPaymentProviderData) =>
    http.put<ApiResponse<TenantPaymentProvider>>(`/payment-providers/${provider}`, payload),

  remove: (provider: PaymentProviderCode, tenant_id: string) =>
    http.delete<{ message: string }>(`/payment-providers/${provider}`, {
      data: { tenant_id },
    }),

  testConnection: (provider: PaymentProviderCode, payload: TestTenantPaymentProviderData) =>
    http.post<ApiResponse<Record<string, unknown>>>(`/payment-providers/${provider}/test`, payload),
};
