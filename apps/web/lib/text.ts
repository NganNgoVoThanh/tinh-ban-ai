/** Bỏ dấu tiếng Việt và viết thường, để tìm "ha noi" ra "Hà Nội". */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
