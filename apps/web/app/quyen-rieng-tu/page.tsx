import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quyền riêng tư",
  description: "Tinh Bàn thu dữ liệu gì, để làm gì, gửi cho ai, giữ bao lâu và xóa bằng cách nào.",
  alternates: { canonical: "/quyen-rieng-tu" },
};

/** Bảng dữ liệu theo Technical Plan mục 16. Đổi luồng dữ liệu thì phải sửa bảng này cùng lúc. */
const DATA: { what: string; where: string; out: string; keep: string }[] = [
  { what: "Tên, ngày giờ sinh, nơi sinh, giới tính, phái", where: "Bộ nhớ của trình duyệt trên máy bạn", out: "Không", keep: "Đến khi bạn xóa" },
  { what: "Lịch sử hỏi đáp", where: "Bộ nhớ của trình duyệt trên máy bạn", out: "Không", keep: "Tối đa 500 câu mỗi hồ sơ, đến khi bạn xóa" },
  { what: "File sao lưu", where: "Nơi bạn tự lưu file", out: "Không, trừ khi bạn tự gửi file đi", keep: "Do bạn quyết định" },
  {
    what: "Dữ kiện lá số của các cung liên quan (không có tên, ngày giờ sinh)",
    where: "Gửi lên máy chủ khi bạn hỏi câu tự do",
    out: "Có: tới nhà cung cấp AI, có thể ở nước ngoài",
    keep: "Máy chủ của Tinh Bàn không lưu",
  },
  {
    what: "Câu hỏi tự do (đã xóa số điện thoại, email, số giấy tờ, đường link)",
    where: "Gửi lên máy chủ khi bạn hỏi",
    out: "Có: tới nhà cung cấp AI",
    keep: "Máy chủ của Tinh Bàn không lưu nguyên văn",
  },
  {
    what: "Địa chỉ IP",
    where: "Bộ đếm giới hạn lượt, nhật ký của máy chủ, bước kiểm tra chống bot",
    out: "Tới nhà cung cấp hosting (Vercel) và Cloudflare",
    keep: "Bộ đếm tự xóa sau tối đa 24 giờ",
  },
  {
    what: "Mã cài đặt ngẫu nhiên và số liệu dùng app (chỉ khi bạn đồng ý)",
    where: "Máy chủ của Tinh Bàn",
    out: "Không",
    keep: "13 tháng, sau đó chỉ giữ số đã gộp",
  },
  { what: "Email đăng ký quan tâm bản trả phí (không bắt buộc)", where: "Máy chủ của Tinh Bàn", out: "Không", keep: "Đến khi bạn hủy hoặc xóa toàn bộ dữ liệu" },
  {
    what: "Đăng ký thông báo (Web Push)",
    where: "Máy chủ của Tinh Bàn",
    out: "Tới dịch vụ thông báo của trình duyệt (Apple, Google, Mozilla)",
    keep: "Đến khi bạn tắt hoặc đăng ký hết hạn",
  },
  {
    what: "Báo lỗi kỹ thuật",
    where: "Dịch vụ báo lỗi Sentry, sau khi xóa ngày, giờ, nơi sinh và nội dung câu hỏi",
    out: "Tới Sentry",
    keep: "Theo thời hạn lưu của Sentry",
  },
];

/** Thông báo quyền riêng tư (Technical Plan mục 16). Bản nháp: cần người hiểu luật rà soát theo Luật 91/2025/QH15 trước khi mở công khai. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-4 pb-12">
      <nav aria-label="Đường dẫn" className="text-sm">
        <Link href="/" className="flex min-h-11 items-center text-primary">
          ‹ Tinh Bàn
        </Link>
      </nav>
      <h1 className="flex items-center gap-3 font-display text-[28px] leading-tight font-semibold">
        <ShieldCheck className="size-8 text-gold" strokeWidth={1.5} aria-hidden />
        Quyền riêng tư
      </h1>
      <p className="rounded-2xl border border-dashed border-muted-foreground p-4 text-sm">Bản nháp, chưa qua rà soát pháp lý. Nội dung có thể thay đổi trước khi Tinh Bàn mở công khai.</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold">Điều chính</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Lá số được tính ngay trên máy của bạn. Ngày giờ sinh và tên không bao giờ được gửi lên máy chủ.</li>
          <li>Chỉ khi bạn hỏi câu tự do, app mới gửi câu hỏi và dữ kiện lá số của các cung liên quan để trả lời.</li>
          <li>Hồ sơ dưới 16 tuổi không gửi gì lên máy chủ; câu hỏi chỉ được trả lời ngay trên máy.</li>
          <li>Số liệu dùng app chỉ được gửi khi bạn đồng ý, và bạn đổi ý được bất cứ lúc nào trong Hồ sơ → Cài đặt.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold">Dữ liệu nào đi đâu</h2>
        <div className="surface overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-2 font-medium">
                  Dữ liệu
                </th>
                <th scope="col" className="p-2 font-medium">
                  Lưu ở đâu
                </th>
                <th scope="col" className="p-2 font-medium">
                  Có đi ra ngoài không
                </th>
                <th scope="col" className="p-2 font-medium">
                  Giữ bao lâu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DATA.map((d) => (
                <tr key={d.what}>
                  <th scope="row" className="p-2 align-top font-normal">
                    {d.what}
                  </th>
                  <td className="p-2 align-top">{d.where}</td>
                  <td className="p-2 align-top">{d.out}</td>
                  <td className="p-2 align-top">{d.keep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold">Nhà cung cấp AI</h2>
        <p>
          Câu hỏi tự do được trả lời bằng model của một nhà cung cấp AI, có thể đặt máy chủ ở nước ngoài. Tinh Bàn chọn cấu hình không dùng dữ liệu để huấn luyện và lưu ngắn nhất mà nhà cung cấp cho phép. Tên nhà
          cung cấp sẽ được ghi ở đây khi chốt.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold">Xóa dữ liệu</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Xóa từng câu hỏi, hoặc cả lịch sử của một hồ sơ, ở tab Hỏi.</li>
          <li>
            Hồ sơ → Cài đặt → “Xóa toàn bộ dữ liệu”: xóa mọi hồ sơ, lịch sử trên máy, hủy thông báo, và xóa dữ liệu trên máy chủ gắn với máy này (đăng ký quan tâm, đăng ký thông báo).
          </li>
        </ul>
      </section>
    </main>
  );
}
