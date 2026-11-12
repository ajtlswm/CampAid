import type { CampsitePreset, GearCategory, SeasonTag } from '../types';

export const CAMPSITE_PRESETS: CampsitePreset[] = [
  {
    id: 'cs_jarasum',
    name: '자라섬 오토캠핑장',
    region: '경기 가평',
    address: '경기도 가평군 가평읍 자라섬로 60',
    lat: 37.8142,
    lng: 127.4885,
    tempOffset: -2,
  },
  {
    id: 'cs_gapyeong_north',
    name: '명지산 카라반&오토캠핑장',
    region: '경기 가평',
    address: '경기도 가평군 북면 가화로 1450',
    lat: 37.8654,
    lng: 127.5312,
    tempOffset: -4,
  },
  {
    id: 'cs_gapyeong_hyunri',
    name: '운악산 자연휴양림 캠핑장',
    region: '경기 가평',
    address: '경기도 가평군 조종면 운악청계로 589',
    lat: 37.8712,
    lng: 127.3456,
    tempOffset: -3,
  },
  {
    id: 'cs_hongcheon',
    name: '홍천 강변 오토캠핑장',
    region: '강원 홍천',
    address: '강원도 홍천군 서면 팔봉산로 980',
    lat: 37.6874,
    lng: 127.8882,
    tempOffset: -4,
  },
  {
    id: 'cs_hongcheon_magok',
    name: '홍천 마곡유원지 노지캠핑장',
    region: '강원 홍천',
    address: '강원도 홍천군 서면 마곡리 125',
    lat: 37.7012,
    lng: 127.5891,
    tempOffset: -4,
  },
  {
    id: 'cs_pocheon',
    name: '포천 백운계곡 캠핑장',
    region: '경기 포천',
    address: '경기도 포천시 이동면 포화로 236',
    lat: 37.8982,
    lng: 127.2004,
    tempOffset: -3,
  },
  {
    id: 'cs_pocheon_bidulgi',
    name: '포천 비둘기낭 캠핑장',
    region: '경기 포천',
    address: '경기도 포천시 영북면 대회산리 415',
    lat: 38.0751,
    lng: 127.2218,
    tempOffset: -4,
  },
  {
    id: 'cs_chuncheon',
    name: '춘천 호수별빛 캠핑장',
    region: '강원 춘천',
    address: '강원도 춘천시 신동면 경춘로 1024',
    lat: 37.8813,
    lng: 127.7298,
    tempOffset: -3,
  },
  {
    id: 'cs_chuncheon_out',
    name: '춘천 아웃오브파크 캠핑장',
    region: '강원 춘천',
    address: '강원도 춘천시 남면 가옹개길 52-9',
    lat: 37.7342,
    lng: 127.5812,
    tempOffset: -3,
  },
  {
    id: 'cs_yangpyeong',
    name: '양평 솔뜰 캠핑장',
    region: '경기 양평',
    address: '경기도 양평군 옥천면 신복길 142',
    lat: 37.4914,
    lng: 127.4876,
    tempOffset: -2,
  },
  {
    id: 'cs_yangpyeong_saneum',
    name: '산음 자연휴양림 야영장',
    region: '경기 양평',
    address: '경기도 양평군 단월면 고북길 347',
    lat: 37.5892,
    lng: 127.5912,
    tempOffset: -3,
  },
  {
    id: 'cs_namyangju',
    name: '남양주 팔현 캠핑장',
    region: '경기 남양주',
    address: '경기도 남양주시 오남읍 팔현로 205',
    lat: 37.6512,
    lng: 127.1874,
    tempOffset: -1,
  },
  {
    id: 'cs_uijeongbu',
    name: '사패산 숲속 캠핑장',
    region: '경기 의정부',
    address: '경기도 의정부시 호원동 산 120',
    lat: 37.7381,
    lng: 127.0484,
    tempOffset: -1,
  },
  {
    id: 'cs_yeoncheon',
    name: '연천 한탄강 오토캠핑장',
    region: '경기 연천',
    address: '경기도 연천군 전곡읍 선사로 270',
    lat: 38.0124,
    lng: 127.0642,
    tempOffset: -4,
  },
  {
    id: 'cs_yeoncheon_hansol',
    name: '한솔스테이 캠핑장',
    region: '경기 연천',
    address: '경기도 연천군 장남면 장백로278번길 4 (원당리 421-4)',
    lat: 37.9814,
    lng: 126.8915,
    tempOffset: -4,
  },
  {
    id: 'cs_yangju',
    name: '양주 미술관옆 캠핑장',
    region: '경기 양주',
    address: '경기도 양주시 장흥면 권율로 211',
    lat: 37.7215,
    lng: 126.9482,
    tempOffset: -2,
  },
  {
    id: 'cs_paju',
    name: '파주 임진강 평화누리 캠핑장',
    region: '경기 파주',
    address: '경기도 파주시 문산읍 임진각로 148-40',
    lat: 37.8891,
    lng: 126.7402,
    tempOffset: -3,
  },
  {
    id: 'cs_yongin',
    name: '용인 자연휴양림 야영장',
    region: '경기 용인',
    address: '경기도 용인시 처인구 모현읍 초부로 220',
    lat: 37.3195,
    lng: 127.2654,
    tempOffset: -1,
  },
  {
    id: 'cs_hwaseong',
    name: '화성 제부도 오토캠핑장',
    region: '경기 화성',
    address: '경기도 화성시 서신면 해안길 258',
    lat: 37.1682,
    lng: 126.6215,
    tempOffset: 0,
  },
  {
    id: 'cs_incheon_yeongjong',
    name: '인천 영종도 왕산 해변캠핑장',
    region: '인천 중구',
    address: '인천광역시 중구 을왕동 왕산해수욕장',
    lat: 37.4562,
    lng: 126.3685,
    tempOffset: 0,
  },
  {
    id: 'cs_ganghwa',
    name: '강화도 마니산 국민여가캠핑장',
    region: '인천 강화',
    address: '인천광역시 강화군 화도면 해안남로 1691',
    lat: 37.6112,
    lng: 126.4258,
    tempOffset: -1,
  },
  {
    id: 'cs_seoul_nanji',
    name: '서울 난지 캠핑장',
    region: '서울 마포',
    address: '서울특별시 마포구 한강난지로 28',
    lat: 37.5701,
    lng: 126.8725,
    tempOffset: 0,
  },
  {
    id: 'cs_seoul_noel',
    name: '서울 노을 캠핑장',
    region: '서울 마포',
    address: '서울특별시 마포구 하늘공원로 108-1',
    lat: 37.5735,
    lng: 126.8748,
    tempOffset: -1,
  },
  {
    id: 'cs_seoul_jungnang',
    name: '서울 중랑 캠핑숲',
    region: '서울 중랑',
    address: '서울특별시 중랑구 망우로87길 110',
    lat: 37.6042,
    lng: 127.1095,
    tempOffset: 0,
  },
  {
    id: 'cs_wonju',
    name: '원주 치악산 구룡 오토캠핑장',
    region: '강원 원주',
    address: '강원도 원주시 소초면 구룡사로 500',
    lat: 37.3982,
    lng: 128.0512,
    tempOffset: -3,
  },
  {
    id: 'cs_pyeongchang',
    name: '평창 계방산 오토캠핑장',
    region: '강원 평창',
    address: '강원도 평창군 용평면 이승복생가길 160',
    lat: 37.6745,
    lng: 128.4682,
    tempOffset: -6,
  },
  {
    id: 'cs_inje',
    name: '인제 백담 오토캠핑장',
    region: '강원 인제',
    address: '강원도 인제군 북면 백담로 172',
    lat: 38.1852,
    lng: 128.3421,
    tempOffset: -5,
  },
  {
    id: 'cs_gangneung',
    name: '강릉 연곡해변 솔향기 캠핑장',
    region: '강원 강릉',
    address: '강원도 강릉시 연곡면 해안로 1282',
    lat: 37.8612,
    lng: 128.8475,
    tempOffset: -1,
  },
  {
    id: 'cs_sokcho',
    name: '속초 설악동 자동차야영장',
    region: '강원 속초',
    address: '강원도 속초시 청봉로 25',
    lat: 38.1654,
    lng: 128.5412,
    tempOffset: -2,
  },
  {
    id: 'cs_taean',
    name: '태안 학암포 오토캠핑장',
    region: '충남 태안',
    address: '충청남도 태안군 원북면 옥파로 1152-37',
    lat: 36.8954,
    lng: 126.2014,
    tempOffset: 1,
  },
  {
    id: 'cs_taean_mongsanpo',
    name: '태안 몽산포 오토캠핑장',
    region: '충남 태안',
    address: '충청남도 태안군 남면 몽산포길 65',
    lat: 36.6721,
    lng: 126.2845,
    tempOffset: 1,
  },
  {
    id: 'cs_chungju',
    name: '충주호 목계솔밭 캠핑장',
    region: '충북 충주',
    address: '충청북도 충주시 중앙탑면 첨단산업로 322',
    lat: 37.0542,
    lng: 127.8412,
    tempOffset: -2,
  },
  {
    id: 'cs_jecheon',
    name: '제천 월악산 닷돈재 풀옵션캠핑장',
    region: '충북 제천',
    address: '충청북도 제천시 한수면 월악로 852',
    lat: 36.8654,
    lng: 128.0895,
    tempOffset: -3,
  },
  {
    id: 'cs_danyang',
    name: '단양 소선암 오토캠핑장',
    region: '충북 단양',
    address: '충청북도 단양군 단성면 선암계곡로 1337',
    lat: 36.9125,
    lng: 128.3125,
    tempOffset: -3,
  },
  {
    id: 'cs_muju',
    name: '무주 덕유산 덕유대 야영장',
    region: '전북 무주',
    address: '전라북도 무주군 설천면 구천동1로 159',
    lat: 35.8912,
    lng: 127.7754,
    tempOffset: -4,
  },
  {
    id: 'cs_gyeongju',
    name: '경주 오류 캠핑장',
    region: '경북 경주',
    address: '경상북도 경주시 감포읍 감포로 382-7',
    lat: 35.8245,
    lng: 129.5082,
    tempOffset: 2,
  },
  {
    id: 'cs_jeju',
    name: '제주 금능해변 야영장',
    region: '제주 한림',
    address: '제주특별자치도 제주시 한림읍 금능길 119-10',
    lat: 33.3902,
    lng: 126.2358,
    tempOffset: 6,
  },
];

/**
 * 한글 초성 추출 유틸리티 (예: 'ㅈㄹㅅ' -> '자라섬' 매칭 지원)
 */
const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

export function getChosung(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) {
      result += CHOSUNG[Math.floor(code / 588)];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

/**
 * 날짜(YYYY-MM-DD)와 위도/캠핑장 정보를 기반으로 계절 및 예상 최저기온(℃) 산출
 */
export function estimateCampingClimate(targetDateStr: string, lat = 37.8142): {
  season: SeasonTag;
  seasonLabel: string;
  minTemp: number;
  weatherIcon: string;
} {
  const date = new Date(targetDateStr);
  const month = isNaN(date.getTime()) ? 11 : date.getMonth() + 1;

  const monthlyBaseMinTemp: Record<number, number> = {
    1: -8,
    2: -5,
    3: 1,
    4: 7,
    5: 13,
    6: 18,
    7: 22,
    8: 22,
    9: 15,
    10: 6,
    11: 0,
    12: -6,
  };

  const latOffset = lat > 37.8 ? -2 : lat > 37.6 ? -1 : lat < 35.0 ? 4 : 0;
  const minTemp = (monthlyBaseMinTemp[month] ?? 0) + latOffset;

  if (month === 11 || month === 12 || month === 1 || month === 2 || month === 3) {
    return {
      season: 'WINTER',
      seasonLabel: '동계 시즌',
      minTemp,
      weatherIcon: minTemp < 0 ? '🥶' : '❄️',
    };
  }
  if (month >= 6 && month <= 8) {
    return {
      season: 'SUMMER',
      seasonLabel: '하계 시즌',
      minTemp,
      weatherIcon: '☀️',
    };
  }
  if (month === 4 || month === 5) {
    return {
      season: 'SPRING',
      seasonLabel: '봄 시즌',
      minTemp,
      weatherIcon: '🌱',
    };
  }
  return {
    season: 'AUTUMN',
    seasonLabel: '가을 단풍 시즌',
    minTemp,
    weatherIcon: '🍂',
  };
}

/**
 * 계절별 AI 추천 준비물 목록 반환
 */
export function getSeasonalRecommendations(season: SeasonTag): {
  name: string;
  category: GearCategory;
}[] {
  if (season === 'WINTER') {
    return [
      { name: '팬히터', category: 'WINTER_AID' },
      { name: '일산화탄소 경보기', category: 'WINTER_AID' },
      { name: '등유통 (제리캔)', category: 'WINTER_AID' },
      { name: '동계 침낭 (-10℃)', category: 'SLEEPING' },
    ];
  }
  if (season === 'SUMMER') {
    return [
      { name: '타프 팬 / 써큘레이터', category: 'ETC' },
      { name: '아이스박스 / 쿨러', category: 'COOKING' },
      { name: '모기장 / 벌레 기피제', category: 'ETC' },
      { name: '우비 / 방수 타프', category: 'TENT' },
    ];
  }
  return [
    { name: '전기장판 / 미니 팬히터', category: 'WINTER_AID' },
    { name: '일산화탄소 경보기', category: 'WINTER_AID' },
    { name: '화로대 & 장작', category: 'COOKING' },
    { name: '경량 패딩 / 담요', category: 'SLEEPING' },
  ];
}

/**
 * 출발일 ~ 종료일 박수 및 포맷 문자열 계산
 */
export function formatStayDuration(startDate: string, endDate?: string): string {
  if (!endDate || endDate <= startDate) {
    return '당일치기';
  }
  const s = new Date(startDate);
  const e = new Date(endDate);
  const nights = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) return '당일치기';
  return `${nights}박 ${nights + 1}일`;
}
