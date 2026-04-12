import type { FlowerSpotMapItem, FlowerSpotWithDetails, FlowerType } from "@/types";

const SPOT_COVER_OVERRIDES: Record<string, string> = {
  "석촌호수": "/spot-covers/cherry.svg",
  "여의서로": "/spot-covers/cherry.svg",
  "경화역": "/spot-covers/cherry.svg",
  "청남대": "/spot-covers/cherry.svg",
  "대릉원": "/spot-covers/cherry.svg",
  "광양 매화마을": "/spot-covers/plum.svg",
  "남지 유채꽃단지": "/spot-covers/rape.svg",
  "코리아플라워파크": "/spot-covers/tulip.svg",
  "일산호수공원": "/spot-covers/tulip.svg",
  "휴애리 자연생활공원": "/spot-covers/hydrangea.svg",
  "아침고요수목원": "/spot-covers/hydrangea.svg",
  "시흥 연꽃테마파크": "/spot-covers/lotus.svg",
  "함안 연꽃테마파크": "/spot-covers/lotus.svg",
  "울산대공원 장미원": "/spot-covers/rose.svg",
  "부천 백만송이장미원": "/spot-covers/rose.svg",
  "보롬왓": "/spot-covers/sunflower.svg",
  "하늘공원": "/spot-covers/silvergrass.svg",
  "명성산": "/spot-covers/silvergrass.svg",
  "오서산": "/spot-covers/silvergrass.svg",
  "시흥갯골생태공원": "/spot-covers/pinkmuhly.svg",
  "정읍 구절초지방정원": "/spot-covers/chrysanthemum.svg",
  "봉평 메밀꽃밭": "/spot-covers/buckwheat.svg",
  "카멜리아힐": "/spot-covers/camellia.svg",
  "선운사": "/spot-covers/camellia.svg",
  "위미 동백군락지": "/spot-covers/camellia.svg",
  "제주동백수목원": "/spot-covers/camellia.svg",
  "한림공원": "/spot-covers/narcissus.svg",
  "오륙도해맞이공원": "/spot-covers/narcissus.svg",
  "노리매": "/spot-covers/plum.svg",
};

const FLOWER_TYPE_COVER_MAP: Partial<Record<FlowerType, string>> = {
  cherry: "/spot-covers/cherry.svg",
  plum: "/spot-covers/plum.svg",
  tulip: "/spot-covers/tulip.svg",
  rape: "/spot-covers/rape.svg",
  rose: "/spot-covers/rose.svg",
  sunflower: "/spot-covers/sunflower.svg",
  hydrangea: "/spot-covers/hydrangea.svg",
  lotus: "/spot-covers/lotus.svg",
  lavender: "/spot-covers/lavender.svg",
  cosmos: "/spot-covers/cosmos.svg",
  silvergrass: "/spot-covers/silvergrass.svg",
  pinkmuhly: "/spot-covers/pinkmuhly.svg",
  buckwheat: "/spot-covers/buckwheat.svg",
  chrysanthemum: "/spot-covers/chrysanthemum.svg",
  camellia: "/spot-covers/camellia.svg",
  narcissus: "/spot-covers/narcissus.svg",
};

export function getSpotCoverImage(
  spot: Pick<FlowerSpotWithDetails | FlowerSpotMapItem, "name" | "flower_types">,
) {
  return (
    SPOT_COVER_OVERRIDES[spot.name] ||
    FLOWER_TYPE_COVER_MAP[spot.flower_types[0]] ||
    "/spot-covers/default.svg"
  );
}
