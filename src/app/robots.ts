import type { MetadataRoute } from "next";

export const dynamic = 'force-static';

const BASE_URL = "https://xn--js0bm6bu3m3qo.site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
