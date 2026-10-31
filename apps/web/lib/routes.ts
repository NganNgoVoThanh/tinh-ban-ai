/**
 * Đường dẫn trong app. Trang theo hồ sơ dùng tham số ?ho-so= trên trang tĩnh (ADR 0003): một khung
 * trang dùng chung cho mọi hồ sơ, nên mở lại được khi offline. Đường dẫn không chứa ngày sinh hay tên.
 */
export const chartHref = (profileId: string, extra: Record<string, string> = {}) =>
  `/la-so?${new URLSearchParams({ "ho-so": profileId, ...extra })}`;

export const askHref = (profileId: string, extra: Record<string, string> = {}) =>
  `/hoi?${new URLSearchParams({ "ho-so": profileId, ...extra })}`;

export const editHref = (profileId: string) => `/ho-so/sua?${new URLSearchParams({ "ho-so": profileId })}`;

/** Tab chính (Technical Plan mục 12). Thứ tự giống nhau cho mọi người; hiện dần theo lộ trình. */
export const TABS = [
  { href: "/hom-nay", label: "Hôm nay", key: "today" },
  { href: "/la-so", label: "Lá số", key: "chart" },
  { href: "/hoi", label: "Hỏi", key: "ask" },
  { href: "/ho-so", label: "Hồ sơ", key: "profiles" },
] as const;

export const isTabRoute = (pathname: string) => TABS.some((t) => pathname === t.href);
