import { computeChart } from "@tinhban/chart-engine";
import { describe, expect, it } from "vitest";
import { analyzeForm, emptyForm, formFromInput, type BirthForm } from "./birth-form";

const TODAY = new Date(2026, 9, 30);
const form = (patch: Partial<BirthForm>): BirthForm => ({
  ...emptyForm("nam"),
  day: "16",
  month: "8",
  year: "2000",
  time: "03:30",
  gender: "male",
  ...patch,
});

describe("form nhập hồ sơ", () => {
  it("đủ thông tin thì ra BirthInput, lập được lá số", () => {
    const a = analyzeForm(form({}), TODAY);
    expect(a.errors).toEqual({});
    expect(a.input).toEqual({ calendar: "solar", date: "2000-08-16", timeCertainty: "exact", time: "03:30", region: "north", gender: "male" });
    expect(computeChart(a.input!, "nam").palaces).toHaveLength(12);
    expect(a.stdTime).toMatchObject({ localStd: "2000-08-16T03:30", hourBranch: 2, shifted: false });
  });

  it("báo lỗi theo từng ô", () => {
    const a = analyzeForm(form({ day: "30", month: "2", time: "25:00", gender: null }), TODAY);
    expect(a.errors.date).toBeDefined();
    expect(a.errors.time).toBeDefined();
    expect(a.errors.gender).toBeDefined();
    expect(a.input).toBeUndefined();
  });

  it("sinh trước 1976 thì bắt buộc nơi sinh; miền Nam 1965 được quy đổi giờ", () => {
    expect(analyzeForm(form({ year: "1965" }), TODAY).errors.place).toBeDefined();
    const a = analyzeForm(form({ year: "1965", time: "09:30", place: { kind: "province", code: "79" } }), TODAY);
    expect(a.input?.region).toBe("south");
    expect(a.stdTime).toMatchObject({ localStd: "1965-08-16T08:30", shifted: true, clockOffsetMin: 480 });
  });

  it("Quảng Trị 1965 phải chọn bờ sông", () => {
    const qt = form({ year: "1965", place: { kind: "province", code: "45" } });
    expect(analyzeForm(qt, TODAY).errors.benHaiSide).toBeDefined();
    const a = analyzeForm({ ...qt, benHaiSide: "north" }, TODAY);
    expect(a.input).toMatchObject({ region: "north", provinceCode: "45", benHaiSide: "north" });
  });

  it("nhập theo giờ âm: giờ Tý cần chọn trước hay sau nửa đêm", () => {
    expect(analyzeForm(form({ timeMode: "canh", timeBranch: 0 }), TODAY).errors.time).toMatch(/nửa đêm/);
    const a = analyzeForm(form({ timeMode: "canh", timeBranch: 0, tyPart: "after_midnight" }), TODAY);
    expect(a.input).toMatchObject({ timeCertainty: "canh", timeBranch: 0, tyPart: "after_midnight" });
    expect(a.input).not.toHaveProperty("time");
  });

  it("âm lịch: biết năm nhuận tháng nào, ngày 30 không có thì báo lỗi", () => {
    const a = analyzeForm(form({ calendar: "lunar", year: "2023", month: "2", day: "4", isLeapMonth: true }), TODAY);
    expect(a.leapMonth).toBe(2);
    expect(a.input).toMatchObject({ calendar: "lunar", date: "2023-02-04", isLeapMonth: true });
    expect(a.solarDate).toBe("2023-03-25");
    expect(analyzeForm(form({ calendar: "lunar", year: "2017", month: "6", day: "30" }), TODAY).errors.date).toBeDefined();
  });

  it("nước ngoài dùng múi giờ IANA, bỏ giờ mùa hè", () => {
    const a = analyzeForm(form({ month: "7", day: "1", time: "10:00", place: { kind: "abroad", tz: "America/Los_Angeles" } }), TODAY);
    expect(a.input).toMatchObject({ region: "abroad", abroadTz: "America/Los_Angeles" });
    expect(a.stdTime).toMatchObject({ localStd: "2000-07-01T09:00", shifted: true });
  });

  it("giờ chuẩn chỉnh tay", () => {
    const a = analyzeForm(form({ stdTimeOverride: "04:10" }), TODAY);
    expect(a.input?.stdTimeOverride).toBe("04:10");
    expect(a.stdTime).toMatchObject({ localStd: "2000-08-16T04:10", overridden: true });
    expect(analyzeForm(form({ stdTimeOverride: "4h" }), TODAY).errors.override).toBeDefined();
  });

  it("nhận biết hồ sơ dưới 16 tuổi", () => {
    expect(analyzeForm(form({ year: "2012" }), TODAY).under16).toBe(true);
    expect(analyzeForm(form({ year: "2000" }), TODAY).under16).toBe(false);
  });

  it("đưa hồ sơ đã lưu về form rồi phân tích lại ra đúng đầu vào cũ", () => {
    for (const f of [
      form({}),
      form({ year: "1965", place: { kind: "province", code: "45" }, benHaiSide: "south" }),
      form({ timeMode: "canh", timeBranch: 7 }),
      form({ timeMode: "unknown" }),
      form({ calendar: "lunar", year: "2023", month: "2", day: "4", isLeapMonth: true, stdTimeOverride: "03:50" }),
    ]) {
      const input = analyzeForm(f, TODAY).input!;
      expect(analyzeForm(formFromInput(input, "bac"), TODAY).input).toEqual(input);
    }
  });
});
