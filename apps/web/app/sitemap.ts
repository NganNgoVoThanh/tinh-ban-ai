import type { MetadataRoute } from "next";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import { SITE_URL } from "@/lib/site";

/** sitemap.xml (Technical Plan mục 14): trang giới thiệu, Các gói, danh mục tri thức và từng trang tri thức. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/tri-thuc`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/goi`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/quyen-rieng-tu`, changeFrequency: "monthly", priority: 0.3 },
    ...PUBLIC_PAGES.map((p) => ({ url: `${SITE_URL}/tri-thuc/${p.slug}`, lastModified: p.rule.review.date, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
