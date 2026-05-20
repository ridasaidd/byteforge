import { http } from '../http';
import type { ApiResponse } from './types';

export interface CmsQuoteRequest {
  id: number;
  requested_booking_service_id: number | null;
  origin_surface: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  subject_label: string | null;
  request_description: string;
  preferred_start_at?: string | null;
  preferred_end_at?: string | null;
  status: string;
  submitted_at: string | null;
  last_activity_at: string | null;
  booking_service: { id: number; name: string } | null;
  attachments?: QuoteRequestAttachment[];
  latest_quote?: CmsQuote | null;
}

export interface QuoteRequestAttachment {
  id: number;
  file_name: string;
  name: string;
  mime_type: string | null;
  size: number;
  download_url: string;
}

export interface CreateManualQuoteRequestData {
  requested_booking_service_id?: number | null;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  subject_label?: string | null;
  request_description: string;
  preferred_start_at?: string | null;
  preferred_end_at?: string | null;
}

export interface CmsQuoteLineItem {
  id: number;
  label: string;
  description: string | null;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

export interface CmsQuote {
  id: number;
  version: number;
  currency: string;
  subtotal_minor: number;
  tax_minor: number | null;
  total_minor: number;
  estimated_duration_minutes: number | null;
  customer_message: string | null;
  internal_notes: string | null;
  valid_until: string | null;
  status: string;
  sent_at: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
  expired_at?: string | null;
  converted_at?: string | null;
  converted_booking_id?: number | null;
  line_items: CmsQuoteLineItem[];
}

export interface CreateDraftQuoteData {
  currency: string;
  estimated_duration_minutes?: number | null;
  customer_message?: string | null;
  internal_notes?: string | null;
  valid_until?: string | null;
  line_items: Array<{
    label: string;
    description?: string | null;
    quantity: number;
    unit_price_minor: number;
  }>;
}

export interface BookingConversionPrefill {
  quote_id: number;
  service_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
}

export const cmsQuotesApi = {
  listRequests: () => http.get<ApiResponse<CmsQuoteRequest[]>>('/quotes/requests'),
  createRequest: (data: CreateManualQuoteRequestData) => http.post<ApiResponse<CmsQuoteRequest>>('/quotes/requests', data),
  getRequest: (id: number) => http.get<ApiResponse<CmsQuoteRequest>>(`/quotes/requests/${id}`),
  downloadRequestAttachment: (requestId: number, attachmentId: number) =>
    http.get<Blob>(`/quotes/requests/${requestId}/attachments/${attachmentId}/download`, { responseType: 'blob' }),
  createDraftQuote: (requestId: number, data: CreateDraftQuoteData) =>
    http.post<ApiResponse<CmsQuote>>(`/quotes/requests/${requestId}/quotes`, data),
  sendQuote: (quoteId: number) =>
    http.post<ApiResponse<CmsQuote>>(`/quotes/${quoteId}/send`),
  cancelQuote: (quoteId: number) =>
    http.post<ApiResponse<CmsQuote>>(`/quotes/${quoteId}/cancel`),
  deleteQuote: (quoteId: number) =>
    http.delete(`/quotes/${quoteId}`),
  convertToBooking: (quoteId: number) =>
    http.post<ApiResponse<BookingConversionPrefill>>(`/quotes/${quoteId}/convert-to-booking`),
};
