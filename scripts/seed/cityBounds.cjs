const CITY_BOUNDS = {
  // ── 특별·광역시 ──────────────────────────────────────────
  seoul: {
    label: '서울',
    // 타일 축소: 0.045→0.03, 0.055→0.04 (밀집 지역 누락 방지)
    bounds: { swLat: 37.4133, swLng: 126.7340, neLat: 37.7151, neLng: 127.2693 },
    latStep: 0.03,
    lngStep: 0.04,
  },
  busan: {
    label: '부산',
    bounds: { swLat: 35.0505, swLng: 128.7537, neLat: 35.3959, neLng: 129.3144 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  incheon: {
    label: '인천',
    bounds: { swLat: 37.3204, swLng: 126.3580, neLat: 37.6186, neLng: 126.9860 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  daegu: {
    label: '대구',
    bounds: { swLat: 35.7280, swLng: 128.4465, neLat: 36.0185, neLng: 128.7937 },
    latStep: 0.04,
    lngStep: 0.045,
  },
  daejeon: {
    label: '대전',
    bounds: { swLat: 36.2100, swLng: 127.2800, neLat: 36.5200, neLng: 127.5700 },
    latStep: 0.04,
    lngStep: 0.045,
  },
  gwangju: {
    label: '광주',
    bounds: { swLat: 35.0400, swLng: 126.7700, neLat: 35.2600, neLng: 127.0200 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  ulsan: {
    label: '울산',
    bounds: { swLat: 35.4400, swLng: 129.0800, neLat: 35.6700, neLng: 129.4200 },
    latStep: 0.03,
    lngStep: 0.045,
  },

  // ── 경기도 (인구 상위) ────────────────────────────────────
  suwon: {
    label: '수원',
    bounds: { swLat: 37.2069, swLng: 126.9384, neLat: 37.3406, neLng: 127.0888 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  seongnam: {
    label: '성남',
    bounds: { swLat: 37.3454, swLng: 127.0431, neLat: 37.5033, neLng: 127.2055 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  yongin: {
    label: '용인',
    bounds: { swLat: 37.1200, swLng: 127.0000, neLat: 37.4000, neLng: 127.3200 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  hwaseong: {
    label: '화성',
    bounds: { swLat: 36.9800, swLng: 126.6900, neLat: 37.2500, neLng: 127.1100 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  bucheon: {
    label: '부천',
    bounds: { swLat: 37.4550, swLng: 126.7550, neLat: 37.5450, neLng: 126.9100 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  namyangju: {
    label: '남양주',
    bounds: { swLat: 37.5400, swLng: 127.0900, neLat: 37.7200, neLng: 127.4200 },
    latStep: 0.035,
    lngStep: 0.045,
  },
  ansan: {
    label: '안산',
    bounds: { swLat: 37.2900, swLng: 126.6900, neLat: 37.4100, neLng: 126.9300 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  pyeongtaek: {
    label: '평택',
    bounds: { swLat: 36.9200, swLng: 126.8500, neLat: 37.1400, neLng: 127.1500 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  anyang: {
    label: '안양',
    bounds: { swLat: 37.3350, swLng: 126.8850, neLat: 37.4550, neLng: 127.0600 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  siheung: {
    label: '시흥',
    bounds: { swLat: 37.2900, swLng: 126.6900, neLat: 37.5000, neLng: 126.8700 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  goyang: {
    label: '고양',
    bounds: { swLat: 37.6013, swLng: 126.7452, neLat: 37.7257, neLng: 126.9690 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  uijeongbu: {
    label: '의정부',
    bounds: { swLat: 37.6700, swLng: 127.0000, neLat: 37.7900, neLng: 127.2000 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  gimpo: {
    label: '김포',
    bounds: { swLat: 37.5800, swLng: 126.6000, neLat: 37.7600, neLng: 126.8400 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  gwangmyeong: {
    label: '광명',
    bounds: { swLat: 37.4200, swLng: 126.8450, neLat: 37.5050, neLng: 126.9400 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  hanam: {
    label: '하남',
    bounds: { swLat: 37.5150, swLng: 127.1500, neLat: 37.6150, neLng: 127.2800 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  gunpo: {
    label: '군포',
    bounds: { swLat: 37.3300, swLng: 126.9200, neLat: 37.4300, neLng: 127.0100 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  uiwang: {
    label: '의왕',
    bounds: { swLat: 37.3150, swLng: 126.9600, neLat: 37.4050, neLng: 127.0600 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  gapyeong: {
    label: '가평',
    bounds: { swLat: 37.7600, swLng: 127.3500, neLat: 37.9100, neLng: 127.6000 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  guri: {
    label: '구리',
    bounds: { swLat: 37.5600, swLng: 127.0900, neLat: 37.6500, neLng: 127.1800 },
    latStep: 0.02,
    lngStep: 0.025,
  },

  // ── 충청권 ───────────────────────────────────────────────
  cheongju: {
    label: '청주',
    bounds: { swLat: 36.5500, swLng: 127.3400, neLat: 36.8000, neLng: 127.6500 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  cheonan: {
    label: '천안',
    bounds: { swLat: 36.7600, swLng: 127.0600, neLat: 36.9600, neLng: 127.2900 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  asan: {
    label: '아산',
    bounds: { swLat: 36.7000, swLng: 126.9000, neLat: 36.9300, neLng: 127.1500 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  dangjin: {
    label: '당진',
    bounds: { swLat: 36.7800, swLng: 126.4500, neLat: 37.0900, neLng: 126.8200 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  taean: {
    label: '태안',
    bounds: { swLat: 36.5300, swLng: 126.0500, neLat: 36.9500, neLng: 126.4500 },
    latStep: 0.04,
    lngStep: 0.05,
  },

  // ── 경상권 ───────────────────────────────────────────────
  changwon: {
    label: '창원',
    bounds: { swLat: 35.1500, swLng: 128.5000, neLat: 35.3600, neLng: 128.8000 },
    latStep: 0.03,
    lngStep: 0.04,
  },
  jeonju: {
    label: '전주',
    bounds: { swLat: 35.7500, swLng: 127.0000, neLat: 35.9000, neLng: 127.2000 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  goksung: {
    label: '곡성',
    bounds: { swLat: 35.1900, swLng: 127.1400, neLat: 35.4100, neLng: 127.4200 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  gwangyang: {
    label: '광양',
    bounds: { swLat: 34.8800, swLng: 127.5000, neLat: 35.1800, neLng: 127.8200 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  gochang: {
    label: '고창',
    bounds: { swLat: 35.2600, swLng: 126.4300, neLat: 35.6200, neLng: 126.8200 },
    latStep: 0.04,
    lngStep: 0.045,
  },
  hampyeong: {
    label: '함평',
    bounds: { swLat: 35.0200, swLng: 126.4200, neLat: 35.2500, neLng: 126.7200 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  pohang: {
    label: '포항',
    bounds: { swLat: 35.9400, swLng: 129.2700, neLat: 36.1800, neLng: 129.5100 },
    latStep: 0.03,
    lngStep: 0.035,
  },

  // ── 경남 ────────────────────────────────────────────────
  hadong: {
    label: '하동',
    bounds: { swLat: 34.9500, swLng: 127.5800, neLat: 35.2600, neLng: 127.9200 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  hapcheon: {
    label: '합천',
    bounds: { swLat: 35.4000, swLng: 127.9500, neLat: 35.8200, neLng: 128.4200 },
    latStep: 0.05,
    lngStep: 0.06,
  },
  geochang: {
    label: '거창',
    bounds: { swLat: 35.6000, swLng: 127.7500, neLat: 35.8800, neLng: 128.0600 },
    latStep: 0.04,
    lngStep: 0.05,
  },

  // ── 경북 ────────────────────────────────────────────────
  gyeongju: {
    label: '경주',
    bounds: { swLat: 35.7000, swLng: 128.9800, neLat: 36.0600, neLng: 129.4200 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  andong: {
    label: '안동',
    bounds: { swLat: 36.4000, swLng: 128.5500, neLat: 36.7600, neLng: 128.9600 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  yeongcheon: {
    label: '영천',
    bounds: { swLat: 35.8500, swLng: 128.7500, neLat: 36.1100, neLng: 129.1500 },
    latStep: 0.04,
    lngStep: 0.05,
  },

  // ── 전남 ────────────────────────────────────────────────
  damyang: {
    label: '담양',
    bounds: { swLat: 35.1800, swLng: 126.8500, neLat: 35.4500, neLng: 127.1200 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  suncheon: {
    label: '순천',
    bounds: { swLat: 34.8500, swLng: 127.3500, neLat: 35.1000, neLng: 127.6600 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  yeosu: {
    label: '여수',
    bounds: { swLat: 34.6500, swLng: 127.5500, neLat: 34.9000, neLng: 127.8600 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  haenam: {
    label: '해남',
    bounds: { swLat: 34.4000, swLng: 126.3800, neLat: 34.7600, neLng: 126.8200 },
    latStep: 0.05,
    lngStep: 0.06,
  },
  gurye: {
    label: '구례',
    bounds: { swLat: 35.1200, swLng: 127.3800, neLat: 35.3200, neLng: 127.6500 },
    latStep: 0.03,
    lngStep: 0.035,
  },

  // ── 전북 ────────────────────────────────────────────────
  gunsan: {
    label: '군산',
    bounds: { swLat: 35.8500, swLng: 126.6000, neLat: 36.1000, neLng: 126.9000 },
    latStep: 0.035,
    lngStep: 0.04,
  },
  jeongeup: {
    label: '정읍',
    bounds: { swLat: 35.4000, swLng: 126.7000, neLat: 35.7500, neLng: 127.0600 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  namwon: {
    label: '남원',
    bounds: { swLat: 35.2900, swLng: 127.2400, neLat: 35.5600, neLng: 127.5500 },
    latStep: 0.04,
    lngStep: 0.05,
  },

  // ── 강원권 ───────────────────────────────────────────────
  gangneung: {
    label: '강릉',
    bounds: { swLat: 37.6500, swLng: 128.7500, neLat: 37.8600, neLng: 129.0100 },
    latStep: 0.04,
    lngStep: 0.05,
  },
  sokcho: {
    label: '속초',
    bounds: { swLat: 38.1400, swLng: 128.4900, neLat: 38.3200, neLng: 128.7100 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  inje: {
    label: '인제',
    bounds: { swLat: 37.8800, swLng: 128.0000, neLat: 38.3000, neLng: 128.5000 },
    latStep: 0.05,
    lngStep: 0.06,
  },
  pyeongchang: {
    label: '평창',
    bounds: { swLat: 37.1800, swLng: 128.1000, neLat: 37.6000, neLng: 128.7000 },
    latStep: 0.05,
    lngStep: 0.06,
  },
  wonju: {
    label: '원주',
    bounds: { swLat: 37.2900, swLng: 127.8400, neLat: 37.4400, neLng: 128.0600 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  yangju: {
    label: '양주',
    bounds: { swLat: 37.7000, swLng: 126.9200, neLat: 37.9000, neLng: 127.1600 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  samcheok: {
    label: '삼척',
    bounds: { swLat: 37.2700, swLng: 129.0000, neLat: 37.6200, neLng: 129.3700 },
    latStep: 0.04,
    lngStep: 0.045,
  },
  taebaek: {
    label: '태백',
    bounds: { swLat: 37.0400, swLng: 128.9000, neLat: 37.2300, neLng: 129.1200 },
    latStep: 0.03,
    lngStep: 0.035,
  },
  jeongseon: {
    label: '정선',
    bounds: { swLat: 37.1500, swLng: 128.3500, neLat: 37.6200, neLng: 128.9500 },
    latStep: 0.05,
    lngStep: 0.06,
  },
  goseong: {
    label: '고성',
    bounds: { swLat: 38.1500, swLng: 128.3000, neLat: 38.4600, neLng: 128.6900 },
    latStep: 0.04,
    lngStep: 0.045,
  },
  chuncheon: {
    label: '춘천',
    bounds: { swLat: 37.8000, swLng: 127.6500, neLat: 37.9500, neLng: 127.8800 },
    latStep: 0.025,
    lngStep: 0.03,
  },
  jeju: {
    label: '제주',
    bounds: { swLat: 33.2000, swLng: 126.1000, neLat: 33.6500, neLng: 126.9800 },
    latStep: 0.05,
    lngStep: 0.07,
  },
};

function tileBounds({ swLat, swLng, neLat, neLng }, latStep, lngStep) {
  const tiles = [];

  for (let lat = swLat; lat < neLat; lat += latStep) {
    for (let lng = swLng; lng < neLng; lng += lngStep) {
      tiles.push({
        swLat: Number(lat.toFixed(6)),
        swLng: Number(lng.toFixed(6)),
        neLat: Number(Math.min(lat + latStep, neLat).toFixed(6)),
        neLng: Number(Math.min(lng + lngStep, neLng).toFixed(6)),
      });
    }
  }

  return tiles;
}

module.exports = { CITY_BOUNDS, tileBounds };
