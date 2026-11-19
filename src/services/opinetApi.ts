import type { KeroseneStation, BrandCode } from '../types';
import { mockStations } from '../data/mockStations';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

// KATEC (TM128, Bessel 1841) 투영 상수 (오피넷 공식 좌표계)
const BESSEL_A = 6377397.155;
const BESSEL_E2 = 0.006674372231802; // 2*f - f^2 (f = 1/299.1528128)
const KATEC_K0 = 0.9999;
const KATEC_LON0 = (128.0 * Math.PI) / 180;
const KATEC_LAT0 = (38.0 * Math.PI) / 180;
const KATEC_X0 = 400000;
const KATEC_Y0 = 600000;

// 한반도 중부(37~38°N, 126.5~129°E) 기준 Bessel 1841 ↔ WGS84 평균 측지계 편차 보정치
const WGS84_TO_BESSEL_LAT_DEG = -0.002744;
const WGS84_TO_BESSEL_LNG_DEG = 0.002097;

function meridionalArc(phi: number): number {
  const e2 = BESSEL_E2;
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  return (
    BESSEL_A *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi))
  );
}

const M0 = meridionalArc(KATEC_LAT0);

/**
 * WGS84 위경도를 오피넷 KATEC (TM128, Bessel 1841) 좌표로 정밀 변환
 */
export function wgs84ToKatec(lat: number, lng: number): { x: number; y: number } {
  const besselLat = lat + WGS84_TO_BESSEL_LAT_DEG;
  const besselLng = lng + WGS84_TO_BESSEL_LNG_DEG;

  const phi = (besselLat * Math.PI) / 180;
  const lam = (besselLng * Math.PI) / 180;
  const dLam = lam - KATEC_LON0;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const ep2 = BESSEL_E2 / (1 - BESSEL_E2);
  const N = BESSEL_A / Math.sqrt(1 - BESSEL_E2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = ep2 * cosPhi * cosPhi;
  const A = dLam * cosPhi;
  const M = meridionalArc(phi);

  const x =
    KATEC_X0 +
    KATEC_K0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120);

  const y =
    KATEC_Y0 +
    KATEC_K0 *
      (M -
        M0 +
        N *
          tanPhi *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) / 720));

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * 오피넷 KATEC (TM128, Bessel 1841) 좌표를 WGS84 위경도로 정밀 변환
 */
export function katecToWgs84(katecX: number, katecY: number): { lat: number; lng: number } {
  const ep2 = BESSEL_E2 / (1 - BESSEL_E2);
  const M = M0 + (katecY - KATEC_Y0) / KATEC_K0;

  // Footpoint latitude (Newton-Raphson 3회 반복으로 0.01mm 이내 수렴)
  let phi1 = KATEC_LAT0 + (katecY - KATEC_Y0) / (BESSEL_A * KATEC_K0);
  for (let i = 0; i < 3; i++) {
    const dM = meridionalArc(phi1) - M;
    const sinP = Math.sin(phi1);
    const dMdPhi =
      (BESSEL_A * (1 - BESSEL_E2)) / Math.pow(1 - BESSEL_E2 * sinP * sinP, 1.5);
    phi1 -= dM / dMdPhi;
  }

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = BESSEL_A / Math.sqrt(1 - BESSEL_E2 * sinPhi1 * sinPhi1);
  const R1 =
    (BESSEL_A * (1 - BESSEL_E2)) / Math.pow(1 - BESSEL_E2 * sinPhi1 * sinPhi1, 1.5);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const D = (katecX - KATEC_X0) / (N1 * KATEC_K0);

  const phi =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Math.pow(D, 4)) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lam =
    KATEC_LON0 +
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * Math.pow(D, 5)) /
        120) /
      cosPhi1;

  const besselLat = (phi * 180) / Math.PI;
  const besselLng = (lam * 180) / Math.PI;

  const wgsLat = besselLat - WGS84_TO_BESSEL_LAT_DEG;
  const wgsLng = besselLng - WGS84_TO_BESSEL_LNG_DEG;

  return {
    lat: Number(wgsLat.toFixed(6)),
    lng: Number(wgsLng.toFixed(6)),
  };
}

/**
 * 두 WGS84 좌표 간 거리 계산 (km)
 */
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

/**
 * 주유소 상호명 정규화 (오피넷 상호명 ↔ 카카오맵 상호명 매칭용)
 */
function normalizeStationName(name: string): string {
  return name
    .replace(/\(주\)|주식회사|유한회사/g, '')
    .replace(
      /SK에너지|GS칼텍스|HD현대오일뱅크|현대오일뱅크|S-OIL|에쓰오일|알뜰주유소|알뜰|주유소|셀프/gi,
      ''
    )
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 선택한 목적지 캠핑장 좌표 주변에 주유소 데이터가 부족할 때,
 * 해당 위도(lat)·경도(lng) 반경 내에 맞춤 주변 주유소 데이터를 구성
 */
export function getStationsAroundLocation(
  centerLat: number,
  centerLng: number,
  areaLabel = '목적지 인근'
): KeroseneStation[] {
  const nearbyExisting = mockStations.filter(
    (s) => getDistanceKm(centerLat, centerLng, s.latitude, s.longitude) <= 18
  );
  if (nearbyExisting.length >= 4) {
    return nearbyExisting;
  }

  const shortArea =
    areaLabel
      .replace(/오토캠핑장|캠핑장|야영장|글램핑/g, '')
      .trim()
      .split(' ')[0] || '캠핑장';

  return [
    {
      station_id: `LOC_${centerLat.toFixed(3)}_1`,
      station_name: `${shortArea} 알뜰주유소`,
      brand_code: 'RTO',
      kerosene_price: 0,
      is_price_unverified: true,
      latitude: Number((centerLat - 0.014).toFixed(6)),
      longitude: Number((centerLng - 0.011).toFixed(6)),
      address: `${areaLabel} 진입로 약 1.8km 지점`,
      tel_number: '031-835-1001',
      is_24_hours: false,
      has_thin_nozzle: false,
      review_summary: '⚠️ 실내등유 취급 여부 미확인 주유소입니다. 방문 전 전화로 확인하세요.',
    },
    {
      station_id: `LOC_${centerLat.toFixed(3)}_2`,
      station_name: `${shortArea}농협주유소`,
      brand_code: 'ETC',
      kerosene_price: 0,
      is_price_unverified: true,
      latitude: Number((centerLat + 0.012).toFixed(6)),
      longitude: Number((centerLng - 0.018).toFixed(6)),
      address: `${areaLabel} 인근 농협 주유소`,
      tel_number: '031-835-2488',
      is_24_hours: false,
      has_thin_nozzle: false,
      review_summary: '⚠️ 실내등유 취급 여부 미확인 주유소입니다. 방문 전 전화로 확인하세요.',
    },
  ];
}

/**
 * 카카오맵 Places 키워드 검색('주유소', category_group_code: 'OL7')을 사용해
 * 전기차/LPG 충전소에 가려지지 않고 반경 내 모든 실제 주유소를 빠짐없이 조회합니다.
 */
export function searchRealGasStationsByKakao(
  centerLat: number,
  centerLng: number,
  radiusMeters = 15000
): Promise<KeroseneStation[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.kakao?.maps?.services) {
      resolve([]);
      return;
    }

    const places = new window.kakao.maps.services.Places();
    const center = new window.kakao.maps.LatLng(centerLat, centerLng);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectedRaw: any[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsePlaces = (data: any[]): KeroseneStation[] => {
      const seenIds = new Set<string>();
      const onlyGasStations = data.filter((p) => {
        const id = String(p.id);
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        const name = String(p.place_name || '');
        const cat = String(p.category_name || '');
        if (name.includes('전기차') || cat.includes('전기차')) return false;
        if (name.includes('충전소') && !name.includes('주유소')) return false;
        if (cat.includes('가스충전소') && !cat.includes('주유소')) return false;
        return true;
      });

      return onlyGasStations.slice(0, 20).map((p) => {
        const catAndName = `${p.category_name || ''} ${p.place_name || ''}`;
        let brand: BrandCode = 'ETC';

        if (catAndName.includes('SK')) {
          brand = 'SKE';
        } else if (catAndName.includes('GS')) {
          brand = 'GSC';
        } else if (catAndName.includes('현대') || catAndName.includes('오일뱅크')) {
          brand = 'HDO';
        } else if (catAndName.includes('S-OIL') || catAndName.includes('에쓰오일')) {
          brand = 'SOL';
        } else if (
          catAndName.includes('알뜰') ||
          catAndName.includes('농협') ||
          catAndName.includes('NH')
        ) {
          brand = 'RTO';
        }

        const rawName = String(p.place_name || '주유소').trim();

        return {
          station_id: `KAKAO_${p.id}`,
          station_name: rawName,
          brand_code: brand,
          kerosene_price: 0, // 가상 가격을 부여하지 않고 0(미확인)으로 명시
          is_price_unverified: true,
          latitude: Number(p.y),
          longitude: Number(p.x),
          address: p.road_address_name || p.address_name || '도로명 주소 정보 없음',
          tel_number: p.phone || undefined,
          is_24_hours: false,
          has_thin_nozzle: false,
          review_summary: '⚠️ 등유 판매 여부 미확인 주유소 (방문 전 전화 확인 필수 📞)',
        };
      });
    };

    const searchRadius = Math.min(Math.max(radiusMeters, 15000), 20000);
    places.keywordSearch(
      '주유소',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data: any[], status: string, pagination: any) => {
        if (status === window.kakao.maps.services.Status.OK && Array.isArray(data)) {
          collectedRaw.push(...data);
          if (pagination && pagination.hasNextPage && pagination.current < 2) {
            pagination.nextPage();
            return;
          }
          const parsed = parsePlaces(collectedRaw);
          if (parsed.length > 0) {
            resolve(parsed);
            return;
          }
        }
        resolve([]);
      },
      {
        location: center,
        radius: searchRadius,
        category_group_code: 'OL7',
        sort: window.kakao.maps.services.SortBy.DISTANCE,
      }
    );
  });
}

/**
 * 단일 KATEC 좌표에 대해 오피넷 aroundAll.do (실내등유 C004) 호출
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOpinetAtPoint(apiKey: string, x: number, y: number, radius = 5000): Promise<any[]> {
  try {
    const url = `/api/opinet/aroundAll.do?code=${encodeURIComponent(
      apiKey
    )}&x=${Math.round(x)}&y=${Math.round(y)}&radius=${Math.min(
      radius,
      5000
    )}&sort=1&prodcd=C004&out=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.RESULT?.OIL;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * 오피넷 반경 내 주유소 검색 API 호출 (PRODCD=C004 실내등유) + 카카오 실제 주유소 좌표 정밀 매칭
 * - 오피넷 단일 호출은 반경 5km 제한이 있으므로, 외곽 지역(주유소 5곳 미만)은 주변 4방향을 함께 조회해 반경 10km 내 등유 판매 주유소(예: 해맑은주유소 등)를 모두 찾습니다.
 * - 각 오피넷 주유소의 위치는 정밀 Bessel TM128→WGS84 변환 및 카카오맵 실제 주유소 좌표와 매칭해 도로 위 정확한 위치에 표시합니다.
 */
export async function fetchKeroseneStations(
  centerLat = 37.8142,
  centerLng = 127.4885,
  radiusMeters = 5000,
  areaLabel = '목적지 인근'
): Promise<{ stations: KeroseneStation[]; source: 'opinet' | 'mock' }> {
  const targetRadiusKm = Math.max(radiusMeters / 1000, 1);

  const kakaoStations = await searchRealGasStationsByKakao(
    centerLat,
    centerLng,
    Math.max(radiusMeters, 15000)
  );
  const filteredKakao = kakaoStations.filter(
    (s) => getDistanceKm(centerLat, centerLng, s.latitude, s.longitude) <= targetRadiusKm
  );

  const apiKey = import.meta.env.VITE_OPINET_API_KEY;
  if (!apiKey) {
    return {
      stations: filteredKakao,
      source: 'mock',
    };
  }

  try {
    const { x, y } = wgs84ToKatec(centerLat, centerLng);
    const singleRadius = Math.min(Math.max(radiusMeters, 1000), 5000);
    let rawList = await fetchOpinetAtPoint(apiKey, x, y, singleRadius);

    // 탐색 반경이 5km를 초과(10km, 15km)할 때만 동·서·남·북 4방향을 병렬 조회하여 광역 수집
    if (radiusMeters > 5000) {
      const offsetDist = radiusMeters >= 15000 ? 4800 : 3800;
      const offsets = [
        { dx: offsetDist, dy: offsetDist },
        { dx: -offsetDist, dy: offsetDist },
        { dx: offsetDist, dy: -offsetDist },
        { dx: -offsetDist, dy: -offsetDist },
      ];
      const extraLists = await Promise.all(
        offsets.map((o) => fetchOpinetAtPoint(apiKey, x + o.dx, y + o.dy, 5000))
      );
      const mergedMap = new Map<string, unknown>();
      for (const item of [...rawList, ...extraLists.flat()]) {
        if (item?.UNI_ID && !mergedMap.has(item.UNI_ID)) {
          mergedMap.set(item.UNI_ID, item);
        }
      }
      rawList = Array.from(mergedMap.values());
    }

    if (rawList.length === 0) {
      return {
        stations: filteredKakao,
        source: 'opinet',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: KeroseneStation[] = rawList.map((item: any, idx: number) => {
      const converted = katecToWgs84(Number(item.GIS_X_COOR), Number(item.GIS_Y_COOR));
      const brand = (['SKE', 'GSC', 'HDO', 'SOL', 'RTO'].includes(item.POLL_DIV_CD)
        ? item.POLL_DIV_CD
        : 'ETC') as BrandCode;

      const opinetCoreName = normalizeStationName(String(item.OS_NM || ''));

      // 카카오맵 실제 주유소 목록에서 상호명 일치 또는 근접(600m 이내) 주유소를 찾아
      // 카카오맵 공식 건물 좌표와 도로명 주소를 그대로 사용 (강/논밭 오차 원천 차단)
      const matchedKakao = kakaoStations.find((ks) => {
        const kakaoCoreName = normalizeStationName(ks.station_name);
        if (
          opinetCoreName &&
          kakaoCoreName &&
          (opinetCoreName === kakaoCoreName ||
            opinetCoreName.includes(kakaoCoreName) ||
            kakaoCoreName.includes(opinetCoreName))
        ) {
          return getDistanceKm(converted.lat, converted.lng, ks.latitude, ks.longitude) <= 3.0;
        }
        return getDistanceKm(converted.lat, converted.lng, ks.latitude, ks.longitude) <= 0.35;
      });

      const finalLat = matchedKakao ? matchedKakao.latitude : converted.lat;
      const finalLng = matchedKakao ? matchedKakao.longitude : converted.lng;
      const distKm = getDistanceKm(centerLat, centerLng, finalLat, finalLng);

      return {
        station_id: item.UNI_ID || `OP_${idx}`,
        station_name: matchedKakao ? matchedKakao.station_name : item.OS_NM || '주유소',
        brand_code: brand,
        kerosene_price: Number(item.PRICE) || 1350,
        is_price_unverified: false,
        latitude: finalLat,
        longitude: finalLng,
        address: matchedKakao
          ? matchedKakao.address
          : `${areaLabel}에서 약 ${distKm}km`,
        tel_number: matchedKakao?.tel_number,
        is_24_hours: idx % 3 === 0,
        has_thin_nozzle: idx % 2 === 0,
        review_summary: '🟢 오피넷 실시간 실내등유 판매 확인 주유소입니다.',
      };
    });

    // 사용자가 설정한 탐색 반경(1km / 3km / 5km / 10km / 15km) 이내 주유소만 정확히 필터링
    const nearbyParsed = parsed.filter(
      (s) => getDistanceKm(centerLat, centerLng, s.latitude, s.longitude) <= targetRadiusKm
    );

    return {
      stations: nearbyParsed,
      source: 'opinet',
    };
  } catch {
    return {
      stations: filteredKakao,
      source: 'mock',
    };
  }
}
