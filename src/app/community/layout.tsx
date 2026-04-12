import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "꽃 커뮤니티 — 꽃놀이맵",
  description: "전국 꽃 명소 방문 후기, 개화 정보, 꽃놀이 팁을 나눠요.",
  alternates: {
    canonical: "https://xn--js0bm6bu3m3qo.site/community",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
