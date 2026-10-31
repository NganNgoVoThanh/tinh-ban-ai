import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Cho tìm kiếm trang giới thiệu và tri thức; các trang app chỉ là khung, dữ liệu nằm trên máy. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/la-so", "/hoi", "/ho-so", "/hom-nay", "/khoi-phuc", "/app"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
