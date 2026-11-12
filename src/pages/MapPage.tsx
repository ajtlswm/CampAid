import { useState, useEffect, useRef, useMemo } from 'react';
import type { KeroseneStation } from '../types';
import { BRAND_LABELS } from '../types';
import {
  fetchKeroseneStations,
  getDistanceKm,
  getStationsAroundLocation,
} from '../services/opinetApi';

interface MapPageProps {
  initialStations: KeroseneStation[];
  hasSchedule: boolean;
  destinationName: string;
  destinationAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  onOpenTripSetup: () => void;
}

type FilterMode = 'LOWEST' | 'HOURS_24' | 'THIN_NOZZLE';
type SearchMode = 'ROUTE' | 'CURRENT';

const DEFAULT_LAT = 37.5665; // 일정 미설정 시 서울/수도권 중심
const DEFAULT_LNG = 126.978;

/** 캠핑장 이름에서 접미어 제거 후 최대 글자수로 축약 (간소화안 2) */
function getShortCampName(name: string, maxLen = 6): string {
  if (!name) return '';
  const stripped = name
    .replace(/\s*(오토캠핑장|캠핑장|야영장|글램핑|카라반)\s*$/g, '')
    .trim();
  const base = stripped || name.trim();
  return base.length > maxLen ? `${base.slice(0, maxLen)}…` : base;
}

/** 상세 도로명 주소에서 '시/군/구 + 읍/면/동'만 간략 추출 */
function getShortAddress(address?: string): string {
  if (!address) return '';
  const parts = address.trim().split(/\s+/);
  if (parts.length <= 2) return address.trim();
  // 첫 어절이 광역자치단체(경기/경기도/강원특별자치도 등)인 경우 2~3번째 어절(시군구 + 읍면동) 반환
  return parts.slice(1, 3).join(' ');
}

export default function MapPage({
  initialStations,
  hasSchedule,
  destinationName,
  destinationAddress,
  destinationLat,
  destinationLng,
  onOpenTripSetup,
}: MapPageProps) {
  const hasDestination = Boolean(hasSchedule && destinationName);
  const activeLat = hasDestination && destinationLat ? destinationLat : DEFAULT_LAT;
  const activeLng = hasDestination && destinationLng ? destinationLng : DEFAULT_LNG;
  const shortCampName = useMemo(() => getShortCampName(destinationName, 6), [destinationName]);
  const shortDestAddress = useMemo(
    () => getShortAddress(destinationAddress),
    [destinationAddress]
  );

  const [stations, setStations] = useState<KeroseneStation[]>(() =>
    hasDestination
      ? getStationsAroundLocation(activeLat, activeLng, destinationName)
      : initialStations
  );
  const [dataSource, setDataSource] = useState<'opinet' | 'mock'>('mock');
  const [filterMode, setFilterMode] = useState<FilterMode>('LOWEST');
  const [searchMode, setSearchMode] = useState<SearchMode>(
    hasDestination ? 'ROUTE' : 'CURRENT'
  );
  const [selectedStation, setSelectedStation] = useState<KeroseneStation | null>(null);
  const [showCampTooltip, setShowCampTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number }>({
    lat: activeLat,
    lng: activeLng,
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);

  // 목적지 캠핑장이 변경될 때마다 자동으로 해당 위도/경도 주변 등유 주유소 동기화!
  useEffect(() => {
    let cancelled = false;
    setSearchMode(hasDestination ? 'ROUTE' : 'CURRENT');
    setCurrentMapCenter({ lat: activeLat, lng: activeLng });

    async function syncDestinationStations() {
      if (!hasDestination) {
        setStations(initialStations);
        const sorted = [...initialStations].sort((a, b) => a.kerosene_price - b.kerosene_price);
        setSelectedStation(sorted[0] ?? null);
        return;
      }

      setIsLoading(true);
      const res = await fetchKeroseneStations(activeLat, activeLng, 5000, destinationName);
      if (cancelled) return;
      setStations(res.stations);
      setDataSource(res.source);
      const sorted = [...res.stations].sort((a, b) => a.kerosene_price - b.kerosene_price);
      setSelectedStation(sorted[0] ?? null);
      setIsLoading(false);

      if (mapInstanceRef.current && kakaoReady && window.kakao?.maps) {
        const moveLatLon = new window.kakao.maps.LatLng(activeLat, activeLng);
        mapInstanceRef.current.setCenter(moveLatLon);
        mapInstanceRef.current.setLevel(6);
      }
    }

    syncDestinationStations();
    return () => {
      cancelled = true;
    };
  }, [hasDestination, destinationName, activeLat, activeLng, initialStations, kakaoReady]);

  // 필터링 및 정렬된 주유소 목록
  const filteredStations = useMemo(() => {
    let list = [...stations];
    if (filterMode === 'HOURS_24') {
      list = list.filter((s) => s.is_24_hours);
    } else if (filterMode === 'THIN_NOZZLE') {
      list = list.filter((s) => s.has_thin_nozzle);
    }
    list.sort((a, b) => a.kerosene_price - b.kerosene_price);
    return list;
  }, [stations, filterMode]);

  const lowestPrice = useMemo(() => {
    if (filteredStations.length === 0) return 0;
    return Math.min(...filteredStations.map((s) => s.kerosene_price));
  }, [filteredStations]);

  // Kakao Maps SDK 동적 로드
  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
    if (!appKey) return;

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => setKakaoReady(true));
      return;
    }

    const scriptId = 'kakao-map-sdk';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setKakaoReady(true));
      }
    };
    script.onerror = () => {
      setKakaoReady(false);
    };
    document.head.appendChild(script);
  }, []);

  // Kakao Map 초기화, 목적지 캠핑장 마커, 주유소 가격 마커 및 경로(Polyline) 렌더링
  useEffect(() => {
    if (!kakaoReady || !mapContainerRef.current || !window.kakao?.maps) return;

    try {
      if (!mapInstanceRef.current) {
        const center = new window.kakao.maps.LatLng(activeLat, activeLng);
        mapInstanceRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
          center,
          level: hasDestination ? 6 : 8,
        });

        window.kakao.maps.event.addListener(mapInstanceRef.current, 'center_changed', () => {
          const c = mapInstanceRef.current.getCenter();
          setCurrentMapCenter({
            lat: Number(c.getLat().toFixed(4)),
            lng: Number(c.getLng().toFixed(4)),
          });
        });
      }

      // 기존 오버레이 제거
      overlaysRef.current.forEach((ov) => ov.setMap(null));
      overlaysRef.current = [];

      // 1) 목적지 캠핑장이 설정된 경우: C안 (원형 아이콘 핀 ⛺ + 클릭 시 캠핑장 이름 툴팁 토글)
      if (hasDestination) {
        const campEl = document.createElement('div');
        campEl.style.cursor = 'pointer';
        campEl.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
            <div class="camp-pin-tooltip" style="
              display: none;
              background: #1E3F20;
              color: #FFFFFF;
              border: 1.5px solid #FFFFFF;
              padding: 3px 9px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 11px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              white-space: nowrap;
              margin-bottom: 5px;
            ">
              🏕️ ${destinationName}
            </div>
            <div style="
              width: 34px;
              height: 34px;
              border-radius: 9999px;
              background: #1E3F20;
              color: #FFFFFF;
              border: 2.5px solid #FFFFFF;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            " title="${destinationName}">
              ⛺
            </div>
          </div>
        `;
        campEl.onclick = () => {
          const tip = campEl.querySelector('.camp-pin-tooltip') as HTMLElement | null;
          if (tip) {
            tip.style.display = tip.style.display === 'none' ? 'block' : 'none';
          }
        };
        const campOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(activeLat, activeLng),
          content: campEl,
          yAnchor: 0.85,
          zIndex: 30,
        });
        campOverlay.setMap(mapInstanceRef.current);
        overlaysRef.current.push(campOverlay);
      }

      // 2) 등유 주유소 가격 커스텀 마커 렌더링
      filteredStations.forEach((st) => {
        const isLowest = st.kerosene_price === lowestPrice;
        const isSelected = selectedStation?.station_id === st.station_id;

        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div style="
            background: ${isLowest ? '#FF4D4D' : isSelected ? '#1E3F20' : '#FFFFFF'};
            color: ${isLowest || isSelected ? '#FFFFFF' : '#111827'};
            border: 2px solid ${isLowest ? '#E63946' : '#1E3F20'};
            padding: 4px 10px;
            border-radius: 9999px;
            font-weight: 800;
            font-size: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.18);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${isLowest ? '🔥' : '⛽'}</span>
            <span>${st.kerosene_price.toLocaleString()}원</span>
          </div>
        `;
        el.onclick = () => {
          setSelectedStation(st);
        };

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(st.latitude, st.longitude),
          content: el,
          yAnchor: 1.3,
          zIndex: isSelected ? 25 : isLowest ? 20 : 10,
        });
        overlay.setMap(mapInstanceRef.current);
        overlaysRef.current.push(overlay);
      });
    } catch {
      setKakaoReady(false);
    }
  }, [
    kakaoReady,
    filteredStations,
    lowestPrice,
    selectedStation,
    hasDestination,
    destinationName,
    activeLat,
    activeLng,
  ]);

  // 현 지도 중심 또는 목적지 중심 재검색
  const handleReSearch = async () => {
    setIsLoading(true);
    const isRouteMode = searchMode === 'ROUTE' && hasDestination;
    let lat = isRouteMode ? activeLat : currentMapCenter.lat;
    let lng = isRouteMode ? activeLng : currentMapCenter.lng;

    if (!isRouteMode && mapInstanceRef.current && kakaoReady) {
      const center = mapInstanceRef.current.getCenter();
      lat = center.getLat();
      lng = center.getLng();
    } else if (isRouteMode && mapInstanceRef.current && kakaoReady && window.kakao?.maps) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(activeLat, activeLng));
    }

    const label = isRouteMode ? destinationName : '현재 지도 중심';
    const result = await fetchKeroseneStations(lat, lng, 5000, label);
    setStations(result.stations);
    setDataSource(result.source);
    if (result.stations.length > 0) {
      const sorted = [...result.stations].sort((a, b) => a.kerosene_price - b.kerosene_price);
      setSelectedStation(sorted[0]);
    }
    setIsLoading(false);
  };

  // 목적지 캠핑장 위치로 지도 중심 즉시 이동
  const handleFocusDestination = () => {
    if (!hasDestination) {
      onOpenTripSetup();
      return;
    }
    setSearchMode('ROUTE');
    setCurrentMapCenter({ lat: activeLat, lng: activeLng });
    if (mapInstanceRef.current && kakaoReady && window.kakao?.maps) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(activeLat, activeLng));
    }
  };

  // §5.2 외부 내비게이션 앱 연동 (URL Scheme + 웹 폴백)
  const handleStartNavigation = (provider: 'KAKAO' | 'TMAP', station: KeroseneStation) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const encodedName = encodeURIComponent(station.station_name);
    const webFallbackUrl = `https://map.kakao.com/link/to/${encodedName},${station.latitude},${station.longitude}`;

    if (!isMobile) {
      window.open(webFallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const schemeUrl =
      provider === 'KAKAO'
        ? `kakaonavi://search?q=${encodedName}&epX=${station.longitude}&epY=${station.latitude}`
        : `tmap://route?goalname=${encodedName}&goalx=${station.longitude}&goaly=${station.latitude}`;

    window.location.href = schemeUrl;
    setTimeout(() => {
      window.open(webFallbackUrl, '_blank', 'noopener,noreferrer');
    }, 1500);
  };

  return (
    <div className="page-content max-w-md mx-auto flex flex-col h-[calc(100vh-56px)]">
      {/* 3.1 상단 검색 모드 전환 & 목적지 캠핑장 동기화 배너 */}
      <div className="bg-white px-4 pt-3 pb-2.5 shadow-sm border-b border-gray-100 z-20 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="flex flex-1 bg-surface p-1 rounded-xl">
            <button
              onClick={handleFocusDestination}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all truncate px-2 ${
                hasDestination && searchMode === 'ROUTE'
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {hasDestination ? `🏕️ ${shortCampName} 주변` : '🚗 목적지 경로 (미설정)'}
            </button>
            <button
              onClick={() => setSearchMode('CURRENT')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !hasDestination || searchMode === 'CURRENT'
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              📍 현재 중심 탐색
            </button>
          </div>
          <button
            onClick={onOpenTripSetup}
            className="shrink-0 bg-forest/10 hover:bg-forest hover:text-white text-forest text-xs font-bold px-2.5 py-2 rounded-xl transition-colors"
          >
            {hasDestination ? '✏️ 변경' : '+ 목적지'}
          </button>
        </div>

        {/* 목적지 캠핑장 주소 및 위도·경도 좌표 표시 바 (간소화) */}
        <div className="bg-surface/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px]">
          <div className="truncate pr-2">
            {hasDestination && searchMode === 'ROUTE' ? (
              <span className="font-bold text-forest">
                🏕️ {destinationName}
                {shortDestAddress ? ` (${shortDestAddress})` : ''}
              </span>
            ) : (
              <span className="text-gray-600 font-medium">
                📍 현 지도 중심 주변 등유 주유소 탐색
              </span>
            )}
          </div>
          <span className="shrink-0 font-mono text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
            {currentMapCenter.lat.toFixed(4)}, {currentMapCenter.lng.toFixed(4)}
          </span>
        </div>

        {/* 3.2 가로 스크롤 필터 칩 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setFilterMode('LOWEST')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
              filterMode === 'LOWEST'
                ? 'bg-forest text-white'
                : 'bg-surface text-gray-600 hover:bg-gray-200'
            }`}
          >
            💰 최저가순 ({stations.length})
          </button>
          <button
            onClick={() => setFilterMode('HOURS_24')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
              filterMode === 'HOURS_24'
                ? 'bg-forest text-white'
                : 'bg-surface text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⏱️ 24시영업 ({stations.filter((s) => s.is_24_hours).length})
          </button>
          <button
            onClick={() => setFilterMode('THIN_NOZZLE')}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
              filterMode === 'THIN_NOZZLE'
                ? 'bg-forest text-white'
                : 'bg-surface text-gray-600 hover:bg-gray-200'
            }`}
          >
            🚗 얇은주유건 ({stations.filter((s) => s.has_thin_nozzle).length})
          </button>
          <span className="ml-auto text-[10px] font-bold text-forest shrink-0">
            {dataSource === 'opinet'
              ? '🟢 오피넷 실시간'
              : `🟢 ${hasDestination && searchMode === 'ROUTE' ? shortCampName : '현 중심'} 매칭`}
          </span>
        </div>
      </div>

      {/* 3.1 & 3.3 통합 지도 뷰 + 커스텀 가격 말풍선 마커 */}
      <div className="relative flex-1 bg-[#e8efe9] overflow-hidden">
        <div
          ref={mapContainerRef}
          className={`w-full h-full ${kakaoReady ? 'block' : 'hidden'}`}
        />

        {!kakaoReady && (
          <div className="w-full h-full relative select-none overflow-hidden bg-gradient-to-br from-[#e4efe7] via-[#eef3ef] to-[#dde8e0]">
            <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#9ca3af" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* 중앙 목적지 캠핑장 핀 (인터랙티브 캔버스 폴백 시: C안 원형 아이콘 핀 + 클릭 시 툴팁) */}
            {hasDestination ? (
              <div
                style={{ top: '44%', left: '52%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
              >
                {showCampTooltip && (
                  <div className="mb-1.5 bg-forest text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md border border-white whitespace-nowrap">
                    🏕️ {destinationName}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCampTooltip((prev) => !prev)}
                  title={destinationName}
                  className="w-9 h-9 rounded-full bg-forest text-white border-2 border-white shadow-lg flex items-center justify-center text-base active:scale-95 transition-transform"
                >
                  ⛺
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenTripSetup}
                className="absolute top-12 right-3 bg-forest text-white text-[11px] font-bold px-3 py-1 rounded-full shadow flex items-center gap-1 z-20"
              >
                <span>🏕️ 목적지 미설정 (+등록)</span>
              </button>
            )}

            {filteredStations.slice(0, 8).map((st, idx) => {
              const isLowest = st.kerosene_price === lowestPrice;
              const isSelected = selectedStation?.station_id === st.station_id;
              const positions = [
                { top: '26%', left: '32%' },
                { top: '62%', left: '30%' },
                { top: '30%', left: '72%' },
                { top: '66%', left: '68%' },
                { top: '46%', left: '20%' },
                { top: '76%', left: '48%' },
                { top: '18%', left: '52%' },
                { top: '52%', left: '80%' },
              ];
              const pos = positions[idx % positions.length];

              return (
                <button
                  key={st.station_id}
                  onClick={() => setSelectedStation(st)}
                  style={{ top: pos.top, left: pos.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full font-extrabold text-xs shadow-md transition-transform flex items-center gap-1 border-2 ${
                    isLowest
                      ? 'bg-aid-red text-white border-white scale-110 z-20 animate-bounce'
                      : isSelected
                      ? 'bg-forest text-white border-white scale-105 z-10'
                      : 'bg-white text-gray-900 border-forest hover:scale-105'
                  }`}
                >
                  <span>{isLowest ? '🔥' : '⛽'}</span>
                  <span>{st.kerosene_price.toLocaleString()}원</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleReSearch}
          disabled={isLoading}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white hover:bg-gray-50 text-forest font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-forest/20 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span>🔍</span>
          <span>
            {isLoading
              ? '등유 가격 조회 중...'
              : hasDestination && searchMode === 'ROUTE'
              ? `${shortCampName} 재검색`
              : '현 지도 재검색'}
          </span>
        </button>
      </div>

      {/* 3.4 하단 상세 슬라이드 카드 (위도/경도 및 목적지까지 거리 포함) */}
      {selectedStation && (
        <section className="bg-white rounded-t-2xl p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-gray-100 z-20 space-y-2.5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold bg-forest/10 text-forest px-2 py-0.5 rounded">
                  {BRAND_LABELS[selectedStation.brand_code]}
                </span>
                {selectedStation.kerosene_price === lowestPrice && (
                  <span className="text-[10px] font-bold bg-aid-red text-white px-2 py-0.5 rounded">
                    구역 최저가
                  </span>
                )}
                {selectedStation.is_24_hours && (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    24시 영업
                  </span>
                )}
                {selectedStation.has_thin_nozzle && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    얇은 주유건 보유
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-1">
                {selectedStation.station_name}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedStation.address}
                {hasDestination
                  ? ` · 🏕️ ${destinationName}까지 약 ${getDistanceKm(
                      activeLat,
                      activeLng,
                      selectedStation.latitude,
                      selectedStation.longitude
                    )}km`
                  : ''}
              </p>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                🌐 주유소 좌표: 위도 {selectedStation.latitude.toFixed(4)}° N, 경도{' '}
                {selectedStation.longitude.toFixed(4)}° E
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-gray-400 block">실내등유 1L</span>
              <span className="text-xl font-extrabold text-aid-red">
                {selectedStation.kerosene_price.toLocaleString()}원
              </span>
            </div>
          </div>

          {selectedStation.review_summary && (
            <div className="bg-surface rounded-xl px-3 py-2 text-xs text-gray-700 flex items-center gap-2">
              <span>💬</span>
              <span className="font-medium">{selectedStation.review_summary}</span>
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {filteredStations.map((st) => (
              <button
                key={st.station_id}
                onClick={() => setSelectedStation(st)}
                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                  st.station_id === selectedStation.station_id
                    ? 'bg-forest text-white border-forest font-bold'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {st.station_name} ({st.kerosene_price.toLocaleString()}원)
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => handleStartNavigation('KAKAO', selectedStation)}
              className="bg-[#FEE500] hover:bg-[#FDD800] text-gray-900 font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>🧭</span>
              <span>카카오내비 길찾기</span>
            </button>
            <button
              onClick={() => handleStartNavigation('TMAP', selectedStation)}
              className="bg-forest hover:bg-forest-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>🚗</span>
              <span>티맵(TMAP) 길찾기</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
