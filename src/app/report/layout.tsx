import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "꽃 명소 제보 — 꽃놀이맵",
  description: "아직 등록되지 않은 꽃 명소를 제보해 주세요. 개화 현황과 명소 정보를 함께 알려주시면 더욱 좋아요.",
  alternates: {
    canonical: "https://xn--js0bm6bu3m3qo.site/report",
  },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
