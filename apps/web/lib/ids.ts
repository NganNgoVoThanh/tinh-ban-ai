const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/** ID ngẫu nhiên 12 ký tự (60 bit), dùng cho hồ sơ và bản ghi trên máy. Không suy ra từ ngày sinh. */
export function newId(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
}
