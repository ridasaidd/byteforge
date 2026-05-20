import { http } from '../http';
import type { ApiResponse } from './types';
import type { CmsQuote } from './quotes';

const publicRequestConfig = {
  skipAuthRedirect: true,
  skipAuthRefresh: true,
  skipAuthToken: true,
};

export interface PublicQuoteRequestPayload {
  requested_booking_service_id?: number | null;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  subject_label?: string | null;
  request_description: string;
  preferred_start_at?: string | null;
  preferred_end_at?: string | null;
  attachments?: File[];
}

export interface PublicQuoteRequestResponse {
  id: number;
  requested_booking_service_id: number | null;
  guest_name: string;
  guest_email: string;
  status: string;
  submitted_at: string | null;
}

export const publicQuotesApi = {
  createRequest: async (data: PublicQuoteRequestPayload): Promise<PublicQuoteRequestResponse> => {
    const attachments = data.attachments ?? [];

    if (attachments.length === 0) {
      const response = await http.post<ApiResponse<PublicQuoteRequestResponse>>('/public/quotes/requests', data, publicRequestConfig);

      return response.data;
    }

    const formData = new FormData();

    if (typeof data.requested_booking_service_id === 'number') {
      formData.append('requested_booking_service_id', String(data.requested_booking_service_id));
    }

    formData.append('guest_name', data.guest_name);
    formData.append('guest_email', data.guest_email);

    if (data.guest_phone) {
      formData.append('guest_phone', data.guest_phone);
    }

    if (data.subject_label) {
      formData.append('subject_label', data.subject_label);
    }

    formData.append('request_description', data.request_description);

    if (data.preferred_start_at) {
      formData.append('preferred_start_at', data.preferred_start_at);
    }

    if (data.preferred_end_at) {
      formData.append('preferred_end_at', data.preferred_end_at);
    }

    attachments.forEach((attachment) => {
      formData.append('attachments[]', attachment);
    });

    const response = await http.post<ApiResponse<PublicQuoteRequestResponse>>('/public/quotes/requests', formData, {
      ...publicRequestConfig,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  getQuote: async (token: string): Promise<CmsQuote> => {
    const response = await http.get<ApiResponse<CmsQuote>>(`/public/quotes/${token}`, publicRequestConfig);
    return response.data;
  },

  acceptQuote: async (token: string): Promise<CmsQuote> => {
    const response = await http.post<ApiResponse<CmsQuote>>(`/public/quotes/${token}/accept`, undefined, publicRequestConfig);
    return response.data;
  },

  rejectQuote: async (token: string): Promise<CmsQuote> => {
    const response = await http.post<ApiResponse<CmsQuote>>(`/public/quotes/${token}/reject`, undefined, publicRequestConfig);
    return response.data;
  },
};
