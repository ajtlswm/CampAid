import type { CampsitePreset } from '../types';
import { CAMPSITE_PRESETS, getChosung } from '../data/campsitePresets';

interface KakaoPlaceRaw {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runKakaoKeywordSearch(ps: any, keyword: string, categoryGroupCode?: string): Promise<KakaoPlaceRaw[]> {
  return new Promise((resolve) => {
    const options = categoryGroupCode ? { category_group_code: categoryGroupCode, size: 15 } : { size: 15 };
    ps.keywordSearch(
      keyword,
      (data: KakaoPlaceRaw[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && Array.isArray(data)) {
          resolve(data);
        } else {
          resolve([]);
        }
      },
      options
    );
  });
}

function isCampingOrStayPlace(item: KakaoPlaceRaw): number {
  const cat = `${item.category_name || ''} ${item.place_name || ''}`;
  if (cat.includes('캠핑') || cat.includes('야영') || cat.includes('글램핑') || cat.includes('카라반')) {
    return 3; // 최우선: 캠핑/야영장
  }
  if (cat.includes('휴양림') || cat.includes('유원지') || cat.includes('숙박') || cat.includes('펜션') || cat.includes('민박')) {
    return 2; // 차순위: 숙박/휴양지 (한솔스테이 등 스테이형 캠핑장 포함)
  }
  if (cat.includes('부동산') || cat.includes('빌라') || cat.includes('오피스텔') || cat.includes('아파트')) {
    return 0; // 원룸/빌라 건물 제외/최하위
  }
  return 1;
}

/**
 * 전국 캠핑장 통합 검색 서비스
 * - Kakao Places 검색 시 일반 원룸/빌라 건물(예: 인천/구미 원룸 '한솔스테이')보다
 *   실제 캠핑장/야영장/숙박시설(예: 연천 '한솔스테이')이 최상단에 오도록 카테고리 가중치 정렬 적용
 */
export async function searchCampsitesNationwide(
  query: string,
  kakaoReady: boolean
): Promise<{ results: CampsitePreset[]; kakaoBlocked: boolean }> {
  const raw = query.trim();
  if (!raw) {
    return { results: CAMPSITE_PRESETS, kakaoBlocked: !kakaoReady };
  }

  const lower = raw.toLowerCase();
  const compactQuery = lower.replace(/\s+/g, '');
  const chosungQuery = getChosung(compactQuery);

  // 1. 내장 정밀 캠핑장 DB 매칭
  const localMatches = CAMPSITE_PRESETS.filter((c) => {
    const targetStr = `${c.name} ${c.region} ${c.address}`.toLowerCase();
    const compactTarget = targetStr.replace(/\s+/g, '');
    const chosungTarget = getChosung(compactTarget);
    return (
      targetStr.includes(lower) ||
      compactTarget.includes(compactQuery) ||
      chosungTarget.includes(chosungQuery)
    );
  });

  const merged: CampsitePreset[] = [...localMatches];
  let kakaoBlocked = !kakaoReady;

  // 2. Kakao Places SDK 다중 쿼리 & 캠핑/숙박 카테고리 우선 검색
  if (kakaoReady && window.kakao?.maps?.services?.Places) {
    try {
      const ps = new window.kakao.maps.services.Places();
      const hasCampWord =
        raw.includes('캠핑') || raw.includes('야영') || raw.includes('글램핑');

      // (A) '캠핑장' 결합 검색, (B) 숙박(AD5) 카테고리 지정 검색, (C) 관광명소(AT4) 검색, (D) 원문 검색 병렬 실행
      const [campList, stayCatList, tourCatList, exactList] = await Promise.all([
        runKakaoKeywordSearch(ps, hasCampWord ? raw : `${raw} 캠핑장`),
        runKakaoKeywordSearch(ps, raw, 'AD5'),
        runKakaoKeywordSearch(ps, raw, 'AT4'),
        hasCampWord ? Promise.resolve([]) : runKakaoKeywordSearch(ps, raw),
      ]);

      const allRaw = [...campList, ...stayCatList, ...tourCatList, ...exactList];

      // 캠핑/야영/숙박 가중치 순으로 정렬 및 원룸 건물(가중치 0) 필터링
      const scored = allRaw
        .map((item) => ({ item, score: isCampingOrStayPlace(item) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      scored.forEach(({ item }, idx) => {
        const region = item.address_name?.split(' ').slice(0, 2).join(' ') || '전국';
        const addr = item.road_address_name || item.address_name || '';
        const alreadyIn = merged.some(
          (m) =>
            m.name.replace(/\s+/g, '') === item.place_name.replace(/\s+/g, '') &&
            m.region.split(' ')[0] === region.split(' ')[0]
        );
        if (!alreadyIn) {
          merged.push({
            id: `kakao_${item.id || idx}`,
            name: item.place_name,
            region,
            address: addr,
            lat: Number(item.y),
            lng: Number(item.x),
            tempOffset: -2,
          });
        }
      });

      kakaoBlocked = false;
    } catch {
      kakaoBlocked = true;
    }
  }

  return { results: merged, kakaoBlocked };
}
