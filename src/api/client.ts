export interface ApiFieldError {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors: ApiFieldError[];

  constructor(status: number, message: string, code?: string, errors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  errors?: ApiFieldError[];
}

type JsonBody = Record<string, unknown> | Array<unknown>;

async function parseEnvelope<T>(response: Response): Promise<T> {
  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    throw new ApiError(
      response.status,
      payload?.message || `Request failed with status ${response.status}.`,
      payload?.code,
      payload?.errors ?? [],
    );
  }
  return payload.data as T;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: JsonBody; formData?: FormData; headers?: Record<string, string> } = {},
): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: { ...options.headers },
  };

  if (options.formData) {
    init.body = options.formData;
  } else if (options.body !== undefined) {
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, init);
  return parseEnvelope<T>(response);
}

export const http = {
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(path, { headers });
  },
  post<T>(path: string, body?: JsonBody): Promise<T> {
    return request<T>(path, { method: 'POST', body });
  },
  patch<T>(path: string, body?: JsonBody): Promise<T> {
    return request<T>(path, { method: 'PATCH', body });
  },
  upload<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    return request<T>(path, { method: 'POST', formData });
  },
};

/** Run a call, mapping auth failures (401/403) to the fallback instead of throwing. */
export async function safe<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError && error.isAuthError) return fallback;
    throw error;
  }
}
