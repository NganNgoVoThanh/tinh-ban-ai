import type { MetadataRoute } from "next";

/** Web App Manifest (Technical Plan mục 11): mở /app, chạy dạng app đã cài. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tinh Bàn",
    short_name: "Tinh Bàn",
    description: "Lá số Tử Vi tính trên máy, mỗi nhận định có căn cứ và nguồn.",
    lang: "vi",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f1",
    theme_color: "#fbf7f1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
