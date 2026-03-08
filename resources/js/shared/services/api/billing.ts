import { http } from '../http';
import type {
  ApiResponse,
  BillingAddon,
  BillingCheckoutData,
  BillingPlan,
  BillingPortalData,
  BillingSubscriptionSummary,
} from './types';

export const billingApi = {
  plans: () => http.get<ApiResponse<BillingPlan[]>>('/superadmin/billing/plans'),

  addons: (tenant_id: string) =>
    http.get<ApiResponse<BillingAddon[]>>('/superadmin/billing/addons', {
      params: { tenant_id },
    }),

  subscription: (tenant_id: string) =>
    http.get<ApiResponse<BillingSubscriptionSummary>>('/superadmin/billing/subscription', {
      params: { tenant_id },
    }),

  checkout: (payload: BillingCheckoutData) =>
    http.post<Record<string, unknown>>('/superadmin/billing/checkout', payload),

  activateAddon: (addon: string, tenant_id: string) =>
    http.post<ApiResponse<BillingAddon>>(`/superadmin/billing/addons/${addon}/activate`, { tenant_id }),

  deactivateAddon: (addon: string, tenant_id: string) =>
    http.post<ApiResponse<BillingAddon>>(`/superadmin/billing/addons/${addon}/deactivate`, { tenant_id }),

  portal: (payload: BillingPortalData) =>
    http.get<Record<string, unknown>>('/superadmin/billing/portal', {
      params: payload,
    }),

  syncSubscription: (tenant_id: string) =>
    http.post<ApiResponse<{ synced: boolean; status?: string; reason?: string }>>('/superadmin/billing/sync', {
      tenant_id,
    }),
};
