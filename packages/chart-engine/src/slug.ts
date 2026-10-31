/** 'Quan Lộc' → 'quan_loc', 'Địa Kiếp' → 'dia_kiep'. Dùng làm ID ổn định trong fact. */
export function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
