import type { Brightness, FactId, Mutagen } from '@tinhban/shared';
import { BRIGHTNESS_NAMES, MUTAGEN_NAMES, PALACES, STARS } from './dictionary.ts';

/**
 * Đọc fact của lá số thành chữ cho người dùng (nhãn Dữ kiện), ví dụ
 * 'palace:menh|star:tu_vi|state:mieu' → 'Mệnh: Tử Vi (Miếu)'.
 */
export function describeFact(fact: FactId): string {
  const parts = Object.fromEntries(fact.split('|').map((p) => p.split(':') as [string, string]));
  const palace = parts.palace ? (PALACES[parts.palace] ?? parts.palace) : undefined;
  if (fact.endsWith('|vo_chinh_dieu')) return `${palace}: Vô chính diệu`;
  const hoa = parts.hoa ? `Hóa ${MUTAGEN_NAMES[parts.hoa as Mutagen] ?? parts.hoa}` : '';
  if (parts.year && hoa) return `Năm ${parts.year}: ${hoa} vào ${palace}`;
  if (parts.decade && hoa) return `Đại vận từ ${parts.decade} tuổi: ${hoa} vào ${palace}`;
  if (parts.core === 'than') return `Thân cư ${palace}`;
  if (parts.star) {
    const star = STARS[parts.star]?.name ?? parts.star;
    const extra = parts.state
      ? ` (${BRIGHTNESS_NAMES[parts.state as Brightness] ?? parts.state})`
      : parts.hoa
        ? ` Hóa ${MUTAGEN_NAMES[parts.hoa as Mutagen] ?? parts.hoa}`
        : '';
    return palace ? `${palace}: ${star}${extra}` : `${star}${extra}`;
  }
  return fact;
}
