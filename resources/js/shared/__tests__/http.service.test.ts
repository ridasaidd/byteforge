import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockConfig = {
  url?: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  skipAuthRedirect?: boolean;
  skipAuthRefresh?: boolean;
  skipAuthToken?: boolean;
  _authRetried?: boolean;
};

type MockResponse<T = unknown> = {
  data: T;
  config?: MockConfig;
  status?: number;
};

type Adapter = (config: MockConfig) => Promise<MockResponse>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createAxiosMock(adapter: Adapter) {
  const requestHandlers: Array<(config: MockConfig) => MockConfig | Promise<MockConfig>> = [];
  const responseFulfilledHandlers: Array<(response: MockResponse) => MockResponse | Promise<MockResponse>> = [];
  const responseRejectedHandlers: Array<(error: unknown) => unknown> = [];

  const execute = async (config: MockConfig) => {
    let currentConfig: MockConfig = {
      ...config,
      headers: { ...(config.headers ?? {}) },
    };

    for (const handler of requestHandlers) {
      currentConfig = await handler(currentConfig);
    }

    try {
      let response = await adapter(currentConfig);
      response = {
        ...response,
        config: response.config ?? currentConfig,
      };

      for (const handler of responseFulfilledHandlers) {
        response = await handler(response);
      }

      return response;
    } catch (error) {
      let currentError = {
        ...(typeof error === 'object' && error !== null ? error : { message: String(error) }),
        config: currentConfig,
      };

      for (const handler of responseRejectedHandlers) {
        try {
          return await handler(currentError);
        } catch (nextError) {
          currentError = {
            ...(typeof nextError === 'object' && nextError !== null ? nextError : { message: String(nextError) }),
            config: currentConfig,
          };
        }
      }

      throw currentError;
    }
  };

  const client = Object.assign(
    (config: MockConfig) => execute(config),
    {
      interceptors: {
        request: {
          use: vi.fn((fulfilled: (config: MockConfig) => MockConfig | Promise<MockConfig>) => {
            requestHandlers.push(fulfilled);
            return requestHandlers.length;
          }),
        },
        response: {
          use: vi.fn((
            fulfilled?: (response: MockResponse) => MockResponse | Promise<MockResponse>,
            rejected?: (error: unknown) => unknown,
          ) => {
            if (fulfilled) {
              responseFulfilledHandlers.push(fulfilled);
            }

            if (rejected) {
              responseRejectedHandlers.push(rejected);
            }

            return responseRejectedHandlers.length;
          }),
        },
      },
      get: vi.fn((url: string, config?: MockConfig) => execute({ ...config, url, method: 'get' })),
      post: vi.fn((url: string, data?: unknown, config?: MockConfig) => execute({ ...config, url, data, method: 'post' })),
      put: vi.fn((url: string, data?: unknown, config?: MockConfig) => execute({ ...config, url, data, method: 'put' })),
      patch: vi.fn((url: string, data?: unknown, config?: MockConfig) => execute({ ...config, url, data, method: 'patch' })),
      delete: vi.fn((url: string, config?: MockConfig) => execute({ ...config, url, method: 'delete' })),
    },
  );

  return {
    axiosModule: {
      default: {
        create: vi.fn(() => client),
      },
    },
  };
}

async function loadHttpWithAdapter(adapter: Adapter) {
  vi.resetModules();
  vi.doMock('axios', () => createAxiosMock(adapter).axiosModule);
  vi.doMock('@/i18n', () => ({
    default: {
      resolvedLanguage: 'en',
      language: 'en',
    },
  }));

  const httpModule = await import('../services/http');
  const tokenStorageModule = await import('../services/tokenStorage');

  tokenStorageModule.clearAuthToken();

  return {
    http: httpModule.http,
    ...tokenStorageModule,
  };
}

describe('HttpService auth handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries a protected request after a successful silent refresh', async () => {
    const adapter = vi.fn(async (config: MockConfig) => {
      if (config.url === '/protected' && config.headers?.Authorization === 'Bearer stale-token' && !config._authRetried) {
        throw {
          response: { status: 401 },
        };
      }

      if (config.url === '/auth/refresh') {
        expect(config.headers?.Authorization).toBeUndefined();

        return {
          data: {
            token: 'fresh-token',
          },
        };
      }

      if (config.url === '/protected' && config.headers?.Authorization === 'Bearer fresh-token' && config._authRetried) {
        return {
          data: {
            ok: true,
          },
        };
      }

      throw new Error(`Unexpected request: ${config.method} ${config.url}`);
    });

    const { http, setAuthToken, getAuthToken } = await loadHttpWithAdapter(adapter);

    setAuthToken('stale-token');

    await expect(http.get<{ ok: boolean }>('/protected')).resolves.toEqual({ ok: true });
    expect(getAuthToken()).toBe('fresh-token');
    expect(adapter).toHaveBeenCalledTimes(3);
  });

  it('deduplicates concurrent silent refresh attempts', async () => {
    const refresh = deferred<MockResponse<{ token: string }>>();
    let refreshCalls = 0;

    const adapter = vi.fn((config: MockConfig) => {
      if ((config.url === '/alpha' || config.url === '/beta')
        && config.headers?.Authorization === 'Bearer stale-token'
        && !config._authRetried) {
        return Promise.reject({ response: { status: 401 } });
      }

      if (config.url === '/auth/refresh') {
        refreshCalls += 1;
        return refresh.promise;
      }

      if (config.url === '/alpha' && config.headers?.Authorization === 'Bearer fresh-token' && config._authRetried) {
        return Promise.resolve({ data: { route: 'alpha' } });
      }

      if (config.url === '/beta' && config.headers?.Authorization === 'Bearer fresh-token' && config._authRetried) {
        return Promise.resolve({ data: { route: 'beta' } });
      }

      return Promise.reject(new Error(`Unexpected request: ${config.method} ${config.url}`));
    });

    const { http, setAuthToken, getAuthToken } = await loadHttpWithAdapter(adapter);

    setAuthToken('stale-token');

    const alphaPromise = http.get<{ route: string }>('/alpha');
    const betaPromise = http.get<{ route: string }>('/beta');

    refresh.resolve({
      data: {
        token: 'fresh-token',
      },
    });

    await expect(Promise.all([alphaPromise, betaPromise])).resolves.toEqual([
      { route: 'alpha' },
      { route: 'beta' },
    ]);

    expect(getAuthToken()).toBe('fresh-token');
    expect(refreshCalls).toBe(1);
  });

  it('clears the in-memory token when silent refresh fails', async () => {
    const adapter = vi.fn(async (config: MockConfig) => {
      if (config.url === '/protected' && config.headers?.Authorization === 'Bearer stale-token' && !config._authRetried) {
        throw {
          response: { status: 401 },
        };
      }

      if (config.url === '/auth/refresh') {
        throw {
          response: { status: 401 },
        };
      }

      throw new Error(`Unexpected request: ${config.method} ${config.url}`);
    });

    const { http, setAuthToken, getAuthToken } = await loadHttpWithAdapter(adapter);

    setAuthToken('stale-token');

    await expect(http.get('/protected', { skipAuthRedirect: true })).rejects.toBeTruthy();
    expect(getAuthToken()).toBeNull();
  });
});
