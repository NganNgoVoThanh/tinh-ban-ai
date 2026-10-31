/**
 * Các gói của Tinh Bàn (ADR 0007, Technical Plan mục 14). Bản nháp: quyền lợi và giá dự kiến chờ chốt
 * theo đặc tả v1.0 (mục 22, việc 9) — sửa ở đây là đủ cho mọi màn. Bỏ expectedPrice thì màn Gói ghi
 * "Giá công bố khi mở bán" thay cho con số.
 */
export type PlanId = "free" | "plus" | "qa_pack";

/** Mã sản phẩm của bảng "Quan tâm bản trả phí" (Technical Plan mục 14). */
export type ProductId = "sub_month" | "sub_year" | "qa_pack";

/**
 * Gói của máy này. P0 chưa thu tiền và chưa có tài khoản (Technical Plan mục 1), nên mọi máy đều ở
 * gói Miễn phí; khi mở bán, quyền lợi do server cấp theo install_id.
 */
export const CURRENT_PLAN: PlanId = "free";

/** Câu hỏi tự do mỗi ngày của bản Miễn phí khi chưa đọc được /api/config. */
export const FREE_DAILY_QUESTIONS = 3;

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  features: string[];
  /** Giá dự kiến (đồng). Plus có giá tháng và giá năm; gói lượt hỏi bán theo lô. */
  expectedPrice?: { month: number; year: number } | { pack: number };
  /** Sản phẩm ghi nhận khi bấm "Báo tôi khi mở bán". */
  products?: { month: ProductId; year: ProductId } | ProductId;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Miễn phí",
    tagline: "Đủ để hiểu lá số và xem ngày cho cả nhà.",
    features: [
      "Lá số đầy đủ theo Nam phái và Bắc phái",
      "Hôm nay: lịch âm, hoàng đạo, giờ tốt, hợp xung cả nhà",
      "Vận hạn: đại vận, lưu niên, Tứ hóa theo năm",
      "Câu hỏi gợi ý không giới hạn, chạy cả khi offline",
      `${FREE_DAILY_QUESTIONS} câu hỏi tự do mỗi ngày`,
      "Thẻ chia sẻ, mã hồ sơ, sao lưu ra file",
    ],
  },
  {
    id: "plus",
    name: "Tinh Bàn Plus",
    tagline: "Cho người muốn đọc sâu từng cung, từng năm.",
    features: [
      "Mọi thứ của bản Miễn phí",
      "30 câu hỏi tự do mỗi ngày",
      "Nhận định đã qua chuyên gia duyệt",
      "Luận giải chuyên sâu theo cung và theo năm",
      "Vận tháng (lưu nguyệt) cho cả nhà",
      "Xem 12 khả năng giờ khi không rõ giờ sinh",
    ],
    expectedPrice: { month: 59_000, year: 499_000 },
    products: { month: "sub_month", year: "sub_year" },
  },
  {
    id: "qa_pack",
    name: "Gói lượt hỏi",
    tagline: "Mua thêm câu hỏi khi cần, không gia hạn tự động.",
    features: ["Thêm 20 câu hỏi tự do", "Dùng trong 30 ngày, cho mọi hồ sơ trên máy", "Cộng thêm vào lượt miễn phí mỗi ngày"],
    expectedPrice: { pack: 29_000 },
    products: "qa_pack",
  },
];

export const planName = (id: PlanId) => PLANS.find((p) => p.id === id)!.name;

/** Bảng so sánh Miễn phí và Plus: true là có, false là không, chuỗi là mức cụ thể. */
export const COMPARISON: { label: string; free: boolean | string; plus: boolean | string }[] = [
  { label: "Lá số hai phái", free: true, plus: true },
  { label: "Hôm nay và xem ngày", free: true, plus: true },
  { label: "Đại vận, lưu niên", free: true, plus: true },
  { label: "Câu hỏi gợi ý", free: "Không giới hạn", plus: "Không giới hạn" },
  { label: "Câu hỏi tự do", free: `${FREE_DAILY_QUESTIONS}/ngày`, plus: "30/ngày" },
  { label: "Nhận định chuyên gia duyệt", free: false, plus: true },
  { label: "Vận tháng", free: false, plus: true },
  { label: "12 khả năng giờ sinh", free: false, plus: true },
  { label: "Ngày giờ sinh chỉ nằm trên máy", free: true, plus: true },
];

/** Phần trăm tiết kiệm của giá năm so với 12 tháng, làm tròn. */
export const yearlySaving = (p: { month: number; year: number }) => Math.round((1 - p.year / (p.month * 12)) * 100);

export const formatVnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
