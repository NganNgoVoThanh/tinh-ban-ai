import { publicPages } from "@tinhban/kb";
import { KB } from "./kb";

/** Trang tri thức công khai: đơn vị `public: true` từ L1 (Technical Plan mục 14). Chỉ dùng ở server. */
export const PUBLIC_PAGES = publicPages(KB);
