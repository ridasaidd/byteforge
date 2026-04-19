const PAYMENT_SESSION_TOKEN_PARAM = 'token';

export const PAYMENT_SESSION_TOKEN_STORAGE_KEY = 'booking-payment-session-token';

export function isValidPaymentSessionToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9]+$/.test(token);
}

export function extractPaymentSessionTokenFromHash(hash: string): string | null {
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(rawHash);
  const token = params.get(PAYMENT_SESSION_TOKEN_PARAM);

  return isValidPaymentSessionToken(token) ? token : null;
}

export function resolvePaymentSessionToken(
  hash: string,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): string | null {
  const tokenFromHash = extractPaymentSessionTokenFromHash(hash);
  if (tokenFromHash) {
    storage.setItem(PAYMENT_SESSION_TOKEN_STORAGE_KEY, tokenFromHash);
    return tokenFromHash;
  }

  const storedToken = storage.getItem(PAYMENT_SESSION_TOKEN_STORAGE_KEY);
  if (isValidPaymentSessionToken(storedToken)) {
    return storedToken;
  }

  if (storedToken !== null) {
    storage.removeItem(PAYMENT_SESSION_TOKEN_STORAGE_KEY);
  }

  return null;
}

export function stripPaymentSessionTokenFromUrl(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  historyApi: Pick<History, 'replaceState'>,
  title: string,
): void {
  if (!location.hash) {
    return;
  }

  historyApi.replaceState(null, title, `${location.pathname}${location.search}`);
}

export function clearStoredPaymentSessionToken(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(PAYMENT_SESSION_TOKEN_STORAGE_KEY);
}
