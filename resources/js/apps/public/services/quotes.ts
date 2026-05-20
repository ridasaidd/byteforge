import { publicQuotesApi } from '@/shared/services/api/publicQuotes';

export const publicQuotesService = {
  createRequest: publicQuotesApi.createRequest,
  getQuote: publicQuotesApi.getQuote,
  acceptQuote: publicQuotesApi.acceptQuote,
  rejectQuote: publicQuotesApi.rejectQuote,
};
