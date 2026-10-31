import type { KnowledgeBundle } from "@tinhban/kb";
import bundle from "@tinhban/kb/bundle.json";

/**
 * Bundle kho phát hành (chỉ đơn vị từ L1), do `kb build` sinh ra trước khi build app. Đóng gói cùng
 * app nên chạy được khi offline; kho mới đến cùng bản app mới ("Có bản mới · Tải lại").
 */
export const KB = bundle as unknown as KnowledgeBundle;
