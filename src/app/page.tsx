import type { Metadata } from "next";
import MapPage from '@/components/map/MapPage';

export const metadata: Metadata = {
  title: "꽃놀이맵 — 지금 어디에 꽃이 피었을까?",
  description: "실시간 개화 현황과 꽃 명소 정보를 한눈에. 벚꽃, 매화, 철쭉, 유채꽃 등 전국 꽃놀이 장소를 지도로 확인하세요.",
  alternates: {
    canonical: "https://xn--js0bm6bu3m3qo.site",
  },
};

export default function Home() {
  return <MapPage />;
}
