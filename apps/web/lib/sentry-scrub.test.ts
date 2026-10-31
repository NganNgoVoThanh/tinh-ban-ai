import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, scrubText } from "./sentry-scrub";

describe("lọc báo lỗi trước khi gửi Sentry", () => {
  it("xóa ngày, giờ trong chữ", () => {
    expect(scrubText("Lỗi với 16/08/2000 lúc 03:30 và 2000-08-16")).toBe("Lỗi với [ngày] lúc [giờ] và [ngày]");
  });

  it("xóa người dùng, cookie, thân request, tham số đường dẫn, trường nhạy cảm", () => {
    const e = scrubEvent({
      message: "Không lập được lá số 1/6/1965 09:10",
      user: { ip_address: "1.2.3.4" },
      request: { url: "https://tinhban.app/la-so?ho-so=abc", cookies: "a=b", data: { question: "Tôi sinh 1/6/1965" }, headers: { "user-agent": "UA", cookie: "a=b" } },
      extra: { birth: { date: "1965-06-01" }, step: "chart", note: "giờ 09:10" },
      breadcrumbs: [{ message: "nhập 1/6/1965", data: { url: "/la-so?ho-so=abc", name: "Minh" } }],
      exception: { values: [{ value: "Invalid date 1965-06-01" }] },
      contexts: { browser: { name: "Safari", version: "18.0" } },
    });
    expect(e).toEqual({
      message: "Không lập được lá số [ngày] [giờ]",
      request: { url: "https://tinhban.app/la-so", headers: { "user-agent": "UA" } },
      extra: { birth: "[đã xóa]", step: "chart", note: "giờ [giờ]" },
      breadcrumbs: [{ message: "nhập [ngày]", data: { url: "/la-so", name: "[đã xóa]" } }],
      exception: { values: [{ value: "Invalid date [ngày]" }] },
      contexts: { browser: { name: "Safari", version: "18.0" } },
    });
  });

  it("breadcrumb điều hướng bỏ tham số", () => {
    expect(scrubBreadcrumb({ data: { from: "/hoi?ho-so=x", to: "/la-so?ho-so=y" } })).toEqual({ data: { from: "/hoi", to: "/la-so" } });
  });
});
