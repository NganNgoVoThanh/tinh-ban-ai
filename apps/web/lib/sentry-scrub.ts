/**
 * Lọc báo lỗi trước khi gửi Sentry (Technical Plan mục 16, ADR-12): xóa ngày, giờ, nơi sinh, nội dung
 * câu hỏi, tên, IP, cookie, tham số đường dẫn. Dùng làm `beforeSend` và `beforeBreadcrumb` khi bật Sentry.
 */
const DATE = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g;
const TIME = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
/** Khóa do app đặt có thể chứa dữ liệu cá nhân. Không áp cho contexts (SDK đặt: trình duyệt, hệ điều hành). */
const SENSITIVE_KEY = /birth|^date$|solar|lunar|^time$|hour|ngay|gio|place|province|^name$|display|question|answer|email|phone|code|profile/i;

export function scrubText(text: string): string {
  return text.replace(DATE, "[ngày]").replace(TIME, "[giờ]");
}

function scrubValue(value: unknown, byKey: boolean, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value);
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, byKey, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = byKey && SENSITIVE_KEY.test(k) ? "[đã xóa]" : scrubValue(v, byKey, depth + 1);
  return out;
}

const stripQuery = (url: string) => url.replace(/[?#].*$/, "");

interface ScrubbableEvent {
  message?: string;
  user?: unknown;
  request?: { url?: string; query_string?: unknown; cookies?: unknown; data?: unknown; headers?: Record<string, string> };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: { message?: string; data?: Record<string, unknown> }[];
  exception?: { values?: { value?: string }[] };
  tags?: Record<string, unknown>;
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const e: T = { ...event };
  if (e.message) e.message = scrubText(e.message);
  delete e.user;
  if (e.request) {
    const { url, headers } = e.request;
    e.request = { ...(url && { url: stripQuery(url) }), ...(headers?.["user-agent"] && { headers: { "user-agent": headers["user-agent"] } }) };
  }
  if (e.extra) e.extra = scrubValue(e.extra, true) as Record<string, unknown>;
  if (e.contexts) e.contexts = scrubValue(e.contexts, false) as Record<string, unknown>;
  if (e.tags) e.tags = scrubValue(e.tags, true) as Record<string, unknown>;
  if (e.exception?.values) e.exception = { ...e.exception, values: e.exception.values.map((v) => ({ ...v, ...(v.value && { value: scrubText(v.value) }) })) };
  if (e.breadcrumbs) e.breadcrumbs = e.breadcrumbs.map(scrubBreadcrumb);
  return e;
}

export function scrubBreadcrumb<T extends { message?: string; data?: Record<string, unknown> }>(b: T): T {
  const out: T = { ...b };
  if (out.message) out.message = scrubText(out.message);
  if (out.data) {
    const data = scrubValue(out.data, true) as Record<string, unknown>;
    for (const k of ["url", "to", "from"]) if (typeof data[k] === "string") data[k] = stripQuery(data[k] as string);
    out.data = data;
  }
  return out;
}
