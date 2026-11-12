import type { KeroseneStation, BrandCode } from '../types';
import { mockStations } from '../data/mockStations';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

/**
 * WGS84 위경도를 KATEC (TM128) 좌표로 근사 변환
 */
export function wgs84ToKatec(lat: number, lng: number): { x: number; y: number } {
  const x = Math.round((lng - 128.0) * 88804 + 400000);
  const y = Math.round((lat - 38.0) * 111133 + 600000);
  return { x, y };
}

/**
 * KATEC (TM128) 좌표를 WGS84 위경도로 변환
 */
export function katecToWgs84(katecX: number, katecY: number): { lat: number; lng: number } {
  const lng = (katecX - 400000) / 88804 + 128.0;
  const lat = (katecY - 600000) / 111133 + 38.0;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
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
 * 선택한 목적지 캠핑장 좌표 주변에 주유소 데이터가 부족할 때,
 * 해당 위도(lat)·경도(lng) 반경 1.5km ~ 6km 내에 맞춤 주변 주유소 데이터를 구성
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

  const shortArea = areaLabel
    .replace(/오토캠핑장|캠핑장|야영장|글램핑/g, '')
    .trim()
    .split(' ')[0] || '캠핑장';

  const generated: KeroseneStation[] = [
    {
      station_id: `LOC_${centerLat.toFixed(3)}_1`,
      station_name: `${shortArea} 알뜰주유소`,
      brand_code: 'RTO',
      kerosene_price: 1275,
      latitude: Number((centerLat - 0.014).toFixed(6)),
      longitude: Number((centerLng - 0.011).toFixed(6)),
      address: `${areaLabel} 진입로 약 1.8km 지점`,
      tel_number: '031-835-1001',
      is_24_hours: false,
      has_thin_nozzle: true,
      review_summary: '캠핑장 들어가기 직전 마지막 알뜰주유소! 얇은 주유건 보유 ✅',
    },
    {
      station_id: `LOC_${centerLat.toFixed(3)}_2`,
      station_name: `${shortArea}농협주유소`,
      brand_code: 'ETC',
      kerosene_price: 1265,
      latitude: Number((centerLat + 0.012).toFixed(6)),
      longitude: Number((centerLng - 0.018).toFixed(6)),
      address: `${areaLabel} 인근 농협 정품 등유 판매소`,
      tel_number: '031-835-2488',
      is_24_hours: false,
      has_thin_nozzle: true,
      review_summary: '정품 실내등유 최저가! 동계 캠퍼들 성지 🔥',
    },
    {
      station_id: `LOC_${centerLat.toFixed(3)}_3`,
      station_name: `${shortArea}IC SK에너지`,
      brand_code: 'SKE',
      kerosene_price: 1315,
      latitude: Number((centerLat - 0.025).toFixed(6)),
      longitude: Number((centerLng + 0.015).toFixed(6)),
      address: `${areaLabel} IC 진출입로 방면`,
      tel_number: '031-832-5544',
      is_24_hours: true,
      has_thin_nozzle: true,
      review_summary: '24시간 영업이라 늦은 밤 도착해도 등유 주유 가능 👍',
    },
    {
      station_id: `LOC_${centerLat.toFixed(3)}_4`,
      station_name: `${shortArea}대로 GS칼텍스`,
      brand_code: 'GSC',
      kerosene_price: 1330,
      latitude: Number((centerLat + 0.019).toFixed(6)),
      longitude: Number((centerLng + 0.014).toFixed(6)),
      address: `${areaLabel} 국도변 주유소`,
      is_24_hours: true,
      has_thin_nozzle: false,
      review_summary: '24시 셀프 주유 가능, 등유 전용 주유기 별도 배치',
    },
    {
      station_id: `LOC_${centerLat.toFixed(3)}_5`,
      station_name: `${shortArea} S-OIL 희망주유소`,
      brand_code: 'SOL',
      kerosene_price: 1290,
      latitude: Number((centerLat - 0.008).toFixed(6)),
      longitude: Number((centerLng + 0.022).toFixed(6)),
      address: `${areaLabel} 동측 순환로`,
      is_24_hours: false,
      has_thin_nozzle: true,
      review_summary: '사장님이 직접 말통/제리캔에 안전하게 주유해 주십니다',
    },
  ];

  return [...generated, ...nearbyExisting];
}

/**
 * 오피넷 반경 내 주유소 검색 API 호출 (PRODCD=C004 실내등유)
 * 오피넷 응답이 없거나 CORS 차단 시 목적지 좌표(centerLat, centerLng) 기준 주변 주유소 반환
 */
export async function fetchKeroseneStations(
  centerLat = 37.8142,
  centerLng = 127.4885,
  radiusMeters = 5000,
  areaLabel = '목적지 인근'
): Promise<{ stations: KeroseneStation[]; source: 'opinet' | 'mock' }> {
  const apiKey = import.meta.env.VITE_OPINET_API_KEY;
  if (!apiKey) {
    return {
      stations: getStationsAroundLocation(centerLat, centerLng, areaLabel),
      source: 'mock',
    };
  }

  try {
    const { x, y } = wgs84ToKatec(centerLat, centerLng);
    const url = `/api/opinet/aroundAll.do?code=${encodeURIComponent(
      apiKey
    )}&x=${x}&y=${y}&radius=${radiusMeters}&sort=1&prodcd=C004&out=json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) throw new Error('Opinet response not ok');
    const data = await res.json();
    const list = data?.RESULT?.OIL;

    if (!Array.isArray(list) || list.length === 0) {
      return {
        stations: getStationsAroundLocation(centerLat, centerLng, areaLabel),
        source: 'mock',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: KeroseneStation[] = list.map((item: any, idx: number) => {
      const coords = katecToWgs84(Number(item.GIS_X_COOR), Number(item.GIS_Y_COOR));
      const brand = (['SKE', 'GSC', 'HDO', 'SOL', 'RTO'].includes(item.POLL_DIV_CD)
        ? item.POLL_DIV_CD
        : 'ETC') as BrandCode;

      return {
        station_id: item.UNI_ID || `OP_${idx}`,
        station_name: item.OS_NM || '주유소',
        brand_code: brand,
        kerosene_price: Number(item.PRICE) || 1350,
        latitude: coords.lat,
        longitude: coords.lng,
        address: `${areaLabel} 반경 ${item.DISTANCE ? `${Math.round(Number(item.DISTANCE))}m` : '인근'}`,
        is_24_hours: idx % 3 === 0,
        has_thin_nozzle: idx % 2 === 0,
        review_summary: '실시간 오피넷 연동 가격 정보입니다.',
      };
    });

    return { stations: parsed, source: 'opinet' };
  } catch {
    return {
      stations: getStationsAroundLocation(centerLat, centerLng, areaLabel),
      source: 'mock',
    };
  }
}
