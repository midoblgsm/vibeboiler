import { HttpError, AuthError } from "./errors.js";
import { logger } from "./logger.js";

export interface HttpOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  acceptStatuses?: number[];
}

export interface Http {
  request<T = unknown>(method: string, url: string, opts?: HttpOptions): Promise<T>;
  get<T = unknown>(url: string, opts?: HttpOptions): Promise<T>;
  post<T = unknown>(url: string, body?: unknown, opts?: HttpOptions): Promise<T>;
  put<T = unknown>(url: string, body?: unknown, opts?: HttpOptions): Promise<T>;
  patch<T = unknown>(url: string, body?: unknown, opts?: HttpOptions): Promise<T>;
  delete<T = unknown>(url: string, opts?: HttpOptions): Promise<T>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function buildUrl(url: string, query?: Record<string, string | number | undefined>): string {
  if (!query) return url;
  const entries = Object.entries(query).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return url + sep + qs;
}

export function createHttp(defaults: {
  baseUrl?: string;
  headers?: Record<string, string>;
  fetchImpl?: FetchLike;
  provider?: string;
} = {}): Http {
  const fetchImpl: FetchLike = (defaults.fetchImpl ?? (globalThis.fetch as FetchLike));
  const baseUrl = defaults.baseUrl ?? "";

  async function request<T>(method: string, url: string, opts: HttpOptions = {}): Promise<T> {
    const fullUrl = (url.startsWith("http") ? url : baseUrl + url);
    const finalUrl = buildUrl(fullUrl, opts.query);
    const headers: Record<string, string> = {
      "Accept": "application/json",
      ...(defaults.headers ?? {}),
      ...(opts.headers ?? {}),
    };
    let body: BodyInit | undefined;
    if (opts.body !== undefined) {
      body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    }
    logger.debug(`${method} ${finalUrl}`);
    const res = await fetchImpl(finalUrl, { method, headers, body });
    const acceptable = opts.acceptStatuses ?? [];
    let parsed: unknown;
    const text = await res.text();
    try {
      parsed = text.length ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }
    if (res.ok || acceptable.includes(res.status)) {
      return parsed as T;
    }
    if (res.status === 401 || res.status === 403) {
      throw new AuthError(defaults.provider ?? finalUrl, parsed);
    }
    throw new HttpError(res.status, finalUrl, parsed);
  }

  return {
    request,
    get: (url, opts) => request("GET", url, opts),
    post: (url, body, opts) => request("POST", url, { ...opts, body }),
    put: (url, body, opts) => request("PUT", url, { ...opts, body }),
    patch: (url, body, opts) => request("PATCH", url, { ...opts, body }),
    delete: (url, opts) => request("DELETE", url, opts),
  };
}
