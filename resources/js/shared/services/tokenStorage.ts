const AUTH_TOKEN_KEY = 'auth_token';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export function clearAuthToken(): void {
  inMemoryToken = null;
}

export function authTokenStorageKey(): string {
  return AUTH_TOKEN_KEY;
}
