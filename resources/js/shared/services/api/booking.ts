/**
 * CMS Booking API — authenticated, tenant-scoped.
 * All paths are relative to /api (the tenant domain).
 */
import { http } from '../http';
import type { ApiResponse } from './types';

// ─── Booking types ────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'pending_hold'
  | 'awaiting_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface CmsBooking {
  id: number;
  service_id: number;
  resource_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: BookingStatus;
  cancelled_at: string | null;
  cancelled_by: 'customer' | 'tenant' | null;
  hold_expires_at: string | null;
  created_at: string;
  updated_at: string;
  service?: { id: number; name: string; booking_mode: 'slot' | 'range' };
  resource?: { id: number; name: string; type: string };
  events?: BookingEvent[];
}

export interface BookingEvent {
  id: number;
  from_status: string | null;
  to_status: string;
  actor_type: string;
  actor_id: number | null;
  note: string | null;
  created_at: string;
}

export interface CmsBookingService {
  id: number;
  name: string;
  description: string | null;
  booking_mode: 'slot' | 'range';
  duration_minutes: number | null;
  slot_interval_minutes: number | null;
  min_nights: number | null;
  max_nights: number | null;
  buffer_minutes: number;
  advance_notice_hours: number;
  max_advance_days: number | null;
  price: number | null;
  currency: string | null;
  requires_payment: boolean;
  is_active: boolean;
  resources?: { id: number; name: string; type: string }[];
  created_at: string;
  updated_at: string;
}

export interface CmsBookingResource {
  id: number;
  name: string;
  type: 'person' | 'space' | 'equipment';
  description: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  capacity: number;
  resource_label: string | null;
  user_id: number | null;
  is_active: boolean;
  services?: { id: number; name: string; booking_mode: 'slot' | 'range' }[];
  user?: { id: number; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingServiceData {
  name: string;
  description?: string | null;
  booking_mode: 'slot' | 'range';
  duration_minutes?: number | null;
  slot_interval_minutes?: number | null;
  min_nights?: number | null;
  max_nights?: number | null;
  buffer_minutes?: number;
  advance_notice_hours?: number;
  max_advance_days?: number | null;
  price?: number | null;
  currency?: string;
  requires_payment?: boolean;
  is_active?: boolean;
}

export interface CreateBookingResourceData {
  name: string;
  type: 'person' | 'space' | 'equipment';
  description?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
  capacity?: number;
  resource_label?: string | null;
  user_id?: number | null;
  is_active?: boolean;
}

export interface BookingAvailabilityWindow {
  id: number;
  resource_id: number;
  day_of_week: number | null;
  specific_date: string | null;
  starts_at: string;
  ends_at: string;
  is_blocked: boolean;
}

export interface BookingListParams {
  date?: string;
  status?: string;
  resource_id?: number;
  service_id?: number;
  page?: number;
}

export interface PaginatedBookings {
  data: CmsBooking[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

// ─── API object ───────────────────────────────────────────────────────────────

export const cmsBookingApi = {
  // Bookings
  listBookings: (params?: BookingListParams) =>
    http.get<PaginatedBookings>('/booking/bookings', { params }),
  getBooking: (id: number) =>
    http.get<ApiResponse<CmsBooking>>(`/booking/bookings/${id}`),
  confirmBooking: (id: number) =>
    http.patch<ApiResponse<CmsBooking>>(`/booking/bookings/${id}/confirm`, {}),
  cancelBooking: (id: number, note?: string) =>
    http.patch<ApiResponse<CmsBooking>>(`/booking/bookings/${id}/cancel`, { note }),
  completeBooking: (id: number) =>
    http.patch<ApiResponse<CmsBooking>>(`/booking/bookings/${id}/complete`, {}),
  rescheduleBooking: (id: number, startsAt: string, endsAt: string) =>
    http.patch<ApiResponse<CmsBooking>>(`/booking/bookings/${id}/reschedule`, { starts_at: startsAt, ends_at: endsAt }),
  noShowBooking: (id: number) =>
    http.patch<ApiResponse<CmsBooking>>(`/booking/bookings/${id}/no-show`, {}),
  deleteBooking: (id: number) =>
    http.delete(`/booking/bookings/${id}`),

  // Services
  listServices: () =>
    http.get<ApiResponse<CmsBookingService[]>>('/booking/services'),
  getService: (id: number) =>
    http.get<ApiResponse<CmsBookingService>>(`/booking/services/${id}`),
  createService: (data: CreateBookingServiceData) =>
    http.post<ApiResponse<CmsBookingService>>('/booking/services', data),
  updateService: (id: number, data: Partial<CreateBookingServiceData>) =>
    http.patch<ApiResponse<CmsBookingService>>(`/booking/services/${id}`, data),
  deleteService: (id: number) =>
    http.delete(`/booking/services/${id}`),
  attachResource: (serviceId: number, resourceId: number) =>
    http.post<ApiResponse<CmsBookingService>>(`/booking/services/${serviceId}/resources`, { resource_id: resourceId }),
  detachResource: (serviceId: number, resourceId: number) =>
    http.delete(`/booking/services/${serviceId}/resources/${resourceId}`),

  // Resources
  listResources: () =>
    http.get<ApiResponse<CmsBookingResource[]>>('/booking/resources'),
  getResource: (id: number) =>
    http.get<ApiResponse<CmsBookingResource>>(`/booking/resources/${id}`),
  createResource: (data: CreateBookingResourceData) =>
    http.post<ApiResponse<CmsBookingResource>>('/booking/resources', data),
  updateResource: (id: number, data: Partial<CreateBookingResourceData>) =>
    http.patch<ApiResponse<CmsBookingResource>>(`/booking/resources/${id}`, data),
  deleteResource: (id: number) =>
    http.delete(`/booking/resources/${id}`),

  // Availability windows
  listAvailability: (resourceId: number) =>
    http.get<ApiResponse<BookingAvailabilityWindow[]>>(`/booking/resources/${resourceId}/availability`),
  createAvailability: (resourceId: number, data: { day_of_week?: number | null; specific_date?: string | null; starts_at: string; ends_at: string; is_blocked?: boolean }) =>
    http.post<ApiResponse<BookingAvailabilityWindow>>(`/booking/resources/${resourceId}/availability`, data),
  deleteAvailability: (windowId: number) =>
    http.delete(`/booking/availability/${windowId}`),
};
