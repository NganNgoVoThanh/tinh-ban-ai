/**
 * Sự kiện ẩn danh (Technical Plan mục 17). Mỗi sự kiện chỉ giữ thuộc tính trong danh sách cho phép,
 * không bao giờ có ngày giờ sinh, tên hay nội dung câu hỏi. Chỉ gửi khi người dùng đã đồng ý phân tích.
 */
export const EVENT_PROPS = {
  landing_viewed: ["ref"],
  app_open: ["door", "is_pwa"],
  door_selected: ["door"],
  chart_created: ["time_certainty", "profile_index", "school"],
  school_switched: ["from", "to", "where"],
  insight_opened: ["level", "palace", "school"],
  fortune_opened: ["mode"],
  suggested_q_tapped: ["question_type"],
  free_q_asked: ["answered_by", "counted"],
  qa_history_opened: [],
  today_opened: [],
  today_date_changed: ["offset_bucket"],
  profile_added: ["profile_count_bucket"],
  share_card_created: ["card_type"],
  share_card_shared: ["card_type"],
  kb_page_cta_clicked: ["slug"],
  interest_clicked: ["product"],
  plans_viewed: [],
  reminder_enabled: ["type"],
  profile_restored: ["via"],
  backup_exported: [],
  theme_set: ["value"],
} as const;

export type EventName = keyof typeof EVENT_PROPS;
export type EventProps = Record<string, string | number | boolean>;

export interface QueuedEvent {
  event: EventName;
  props: EventProps;
  at: string;
}

/** Bỏ mọi thuộc tính ngoài danh sách cho phép; giá trị chuỗi cắt còn 64 ký tự. */
export function filterProps(event: EventName, props: EventProps): EventProps {
  const allowed: readonly string[] = EVENT_PROPS[event];
  const out: EventProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (!allowed.includes(k)) continue;
    out[k] = typeof v === "string" ? v.slice(0, 64) : v;
  }
  return out;
}

const queue: QueuedEvent[] = [];
let consent: boolean | null = null;
let installId: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

/** Gọi khi đọc xong Cài đặt và install_id; trước đó sự kiện chỉ nằm trong hàng chờ. */
export function configureAnalytics(next: { consent: boolean | null; installId: string }) {
  consent = next.consent;
  installId = next.installId;
  if (consent === false) queue.length = 0;
  else scheduleFlush();
}

export function trackEvent(event: EventName, props: EventProps = {}) {
  if (consent === false || typeof window === "undefined") return;
  queue.push({ event, props: filterProps(event, props), at: new Date().toISOString() });
  if (queue.length > 200) queue.splice(0, queue.length - 200);
  scheduleFlush();
}

function scheduleFlush() {
  if (consent !== true || !installId || queue.length === 0) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 3000);
}

function flush() {
  if (consent !== true || !installId || queue.length === 0) return;
  const batch = queue.splice(0, 50);
  const body = JSON.stringify({ installId, events: batch });
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
  if (!sent) void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
  if (queue.length > 0) scheduleFlush();
}
