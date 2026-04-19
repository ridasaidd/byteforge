const AUTH_TOKEN_KEY = 'auth_token';

let inMemoryToken: string | null = null;

function readFromStorage(storage: Storage | undefined): string | null {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToStorage(storage: Storage | undefined, token: string): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore storage write failures (Safari private mode / restricted storage)
  }
}

function clearFromStorage(storage: Storage | undefined): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage clear failures
  }
}

function getSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.sessionStorage;
}

export function setAuthToken(token: string): void {
  inMemoryToken = token;
  writeToStorage(getSessionStorage(), token);
}

export function getAuthToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }

  const storedToken = readFromStorage(getSessionStorage());

  if (storedToken) {
    inMemoryToken = storedToken;
  }

  return storedToken;
}

export function clearAuthToken(): void {
  inMemoryToken = null;
  clearFromStorage(getSessionStorage());
}
