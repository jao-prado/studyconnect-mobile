const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL não foi configurada.');
}

const baseUrl = rawBaseUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
export const API_BASE_URL = `${baseUrl}/api/v1`;

const DEFAULT_TIMEOUT_MS = 30000;
let accessToken = null;
let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text.trim()) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError('O servidor retornou uma resposta inválida.', {
        status: response.status,
        code: 'INVALID_RESPONSE',
      });
    }
  }

  return text;
}

function errorMessage(payload, fallback) {
  if (typeof payload === 'string' && payload.trim()) return payload;
  return payload?.error || payload?.message || fallback;
}

export async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT_MS);
  const requiresAuth = options.auth !== false;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(requiresAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });

    let payload;
    try {
      payload = await parseResponse(response);
    } catch (error) {
      if (response.ok) throw error;
      payload = null;
    }

    if (!response.ok) {
      if (response.status === 401 && requiresAuth && accessToken) {
        unauthorizedHandler?.();
      }

      throw new ApiError(
        errorMessage(payload, `Não foi possível concluir a solicitação (${response.status}).`),
        { status: response.status, code: 'HTTP_ERROR' },
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError(
        'O servidor demorou para responder. Aguarde a inicialização e tente novamente.',
        { code: 'TIMEOUT', cause: error },
      );
    }
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.', {
      code: 'NETWORK_ERROR',
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}
