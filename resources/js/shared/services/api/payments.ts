import { http } from '../http';
import type {
  ApiResponse,
  PaginatedResponse,
  PaymentListFilters,
  PaymentRecord,
  RefundPaymentData,
  RefundRecord,
} from './types';

export const paymentsApi = {
  list: (filters?: PaymentListFilters) =>
    http.get<PaginatedResponse<PaymentRecord>>('/payments', {
      params: filters,
    }),

  get: (paymentId: number) => http.get<ApiResponse<PaymentRecord>>(`/payments/${paymentId}`),

  refund: (paymentId: number, payload: RefundPaymentData) =>
    http.post<ApiResponse<RefundRecord>>(`/payments/${paymentId}/refund`, payload),
};
