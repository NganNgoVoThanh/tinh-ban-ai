import { BRIGHTNESS_NAMES, BRIGHTNESS_SHORT, elementOf, MUTAGEN_NAMES, PALACES, starName } from "@tinhban/kb";
import type { ChartLabels } from "@tinhban/ui";

/** Nối từ điển của kho với lưới lá số: tên sao theo sách Việt, ngũ hành, độ sáng, tên cung. */
export const chartLabels: ChartLabels = {
  starName,
  elementOf,
  brightnessShort: (b) => BRIGHTNESS_SHORT[b],
  brightnessName: (b) => BRIGHTNESS_NAMES[b],
  mutagenName: (m) => MUTAGEN_NAMES[m],
  palaceName: (key, fallback) => PALACES[key] ?? fallback,
};
