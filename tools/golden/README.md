# Bộ ca chuẩn và đối chiếu chéo

`cases.json` là bộ ca chuẩn, sinh bằng `gen-cases.ts` với seed cố định; nhóm ca mới luôn thêm ở cuối để ca cũ giữ nguyên. Đối chiếu dùng lasotuvi 0.1.2 (MIT) làm nguồn thứ hai: lasotuvi nhận đúng ngày âm và giờ mà bộ tính đã dùng, nên kết quả chỉ so phần an sao.

`fixtures/lasotuvi.json` là kết quả lasotuvi đã rút gọn, kèm đầu vào của từng ca. `golden.test.ts` chạy bộ tính cho cả hai phái và so với fixture này trong `pnpm test`, không cần Python. Nếu bộ tính đổi ngày âm hay giờ của một ca, test báo fixture cũ: chạy lại các bước dưới.

## Chạy lại đối chiếu

```sh
# một lần: môi trường Python cho lasotuvi (gói khai báo phụ thuộc cũ, nên cài --no-deps)
python -m venv .venv
.venv/Scripts/python -m pip install --no-deps lasotuvi==0.1.2

pnpm run cases     # chỉ khi muốn sinh lại bộ ca
pnpm run engine    # → out/engine-nam.json, out/engine-bac.json
.venv/Scripts/python -I run_lasotuvi.py   # → fixtures/lasotuvi.json
pnpm run compare   # → out/report.md
pnpm test          # golden test
```

Biên bản đã duyệt được chép sang `docs/golden/<ngày>-lasotuvi.md`, kèm ghi chú cho từng chỗ lệch.
