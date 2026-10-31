import { computeChart } from "@tinhban/chart-engine";
import type { KnowledgeBundle } from "@tinhban/kb";
import { describe, expect, it } from "vitest";
import { wrap, yearCardOf, yearCardSvg } from "./share-card";

const KB: KnowledgeBundle = { version: "0.0.1", hash: "x", builtAt: "", sources: [], rules: [] };
const snapshot = computeChart({ calendar: "solar", date: "2000-08-16", time: "03:30", timeCertainty: "exact", region: "north", gender: "male" }, "nam", undefined, {
  profileId: "p-secret-id",
  now: new Date(0),
});

describe("thẻ chia sẻ Năm nay của tôi", () => {
  it("có năm, cung hạn, Tứ hóa năm và link chọn sẵn cửa", () => {
    const card = yearCardOf(snapshot, "male", 2026, "https://tinhban.app", "B", KB)!;
    expect(card).toMatchObject({ lunarYear: 2026, canChi: "Bính Ngọ", schoolName: "Nam phái", url: "tinhban.app/?ref=card&door=B" });
    expect(card.limitPalace).not.toBe("");
    expect(card.mutagens.map((m) => m.name)).toEqual(["Lộc", "Quyền", "Khoa", "Kỵ"]);
  });

  it("luồng 12: SVG không chứa ngày giờ sinh, tuổi, tên hay mã hồ sơ", () => {
    const svg = yearCardSvg(yearCardOf(snapshot, "male", 2026, "https://tinhban.app", "A", KB)!);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    // Bỏ namespace chuẩn của SVG (có "2000" trong đường dẫn) rồi mới tìm dữ liệu sinh.
    const body = svg.replace('xmlns="http://www.w3.org/2000/svg"', "");
    for (const secret of ["2000", "16/8", "03:30", "Canh Thìn", "27 tuổi", "p-secret-id", "Minh"]) expect(body).not.toContain(secret);
    expect(svg).toContain("2026 · Bính Ngọ");
  });

  it("thiếu giờ sinh thì không có thẻ (không có cung hạn)", () => {
    expect(yearCardOf({ ...snapshot, palaces: undefined }, "male", 2026, "https://x", "A", KB)).toBeNull();
  });

  it("thoát ký tự XML và ngắt dòng chủ đề năm", () => {
    const svg = yearCardSvg({ lunarYear: 2026, canChi: "Bính Ngọ", schoolName: "Nam phái", limitPalace: "Mệnh", mutagens: [], theme: "A & B <c>", url: "x" });
    expect(svg).toContain("A &amp; B &lt;c&gt;");
    expect(wrap("một hai ba bốn năm sáu", 9)).toEqual(["một hai", "ba bốn", "năm sáu"]);
  });
});
