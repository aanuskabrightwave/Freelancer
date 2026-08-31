const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const BACKEND_BASE = API_URL.replace("/api/v1", "");

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) return path;
  if (path.startsWith("/")) return `${BACKEND_BASE}${path}`;
  return `${BACKEND_BASE}/${path}`;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  // Construct URL with query parameters
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const defaultHeaders: Record<string, string> = {};

  // Only set application/json content-type if the body is not FormData
  if (options.body && !(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }



  // If the body is FormData, make sure we do NOT pass content-type: multipart/form-data explicitly,
  // because the browser needs to set the boundary automatically!
  const finalHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...(headers as Record<string, string>),
  };
  if (options.body instanceof FormData) {
    delete finalHeaders["Content-Type"];
  }

  let response = await fetch(url, {
    headers: finalHeaders,
    credentials: "include", // Essential for HttpOnly cookies
    ...restOptions,
  });

  if (response.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (refreshResponse.ok) {
        response = await fetch(url, {
          headers: finalHeaders,
          credentials: "include",
          ...restOptions,
        });
      }
    } catch (refreshErr) {
      console.error("Auto token refresh failed", refreshErr);
    }
  }

  if (!response.ok) {
    let errorMessage = "An error occurred while fetching the data.";
    let errorData: any = {};
    try {
      errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If response is not JSON
    }
    const apiError = new Error(errorMessage) as any;
    apiError.response = {
      status: response.status,
      data: errorData
    };
    throw apiError;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};

