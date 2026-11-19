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
  defaultSearchRadiusKm?: 1 | 3 | 5 | 10 | 15;
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

/** 주유소 상호명 앞에 중복으로 붙은 정유사 브랜드명을 제거해 주유소 고유 이름이 한눈에 보이도록 정리 */
function getCleanStationName(name: string): string {
  if (!name) return '주유소';
  const cleaned = name
    .replace(
      /^(HD현대오일뱅크|현대오일뱅크|GS칼텍스|SK에너지|SK|GS|S-OIL|에쓰오일|알뜰주유소|알뜰)\s+/i,
      ''
    )
    .trim();
  return cleaned || name;
}

/** 1순위: 최저가순, 2순위(동일 가격일 때): 기준 좌표에서 거리가 가까운 순 정렬 */
function sortStationsByPriceAndDistance(
  list: KeroseneStation[],
  baseLat: number,
  baseLng: number
): KeroseneStation[] {
  return [...list].sort((a, b) => {
    const priceDiff = a.kerosene_price - b.kerosene_price;
    if (priceDiff !== 0) return priceDiff;
    const distA = getDistanceKm(baseLat, baseLng, a.latitude, a.longitude);
    const distB = getDistanceKm(baseLat, baseLng, b.latitude, b.longitude);
    return distA - distB;
  });
}

export default function MapPage({
  initialStations,
  hasSchedule,
  destinationName,
  destinationAddress,
  destinationLat,
  destinationLng,
  defaultSearchRadiusKm = 5,
  onOpenTripSetup,
}: MapPageProps) {
  const hasDestination = Boolean(hasSchedule && destinationName);
  const [geocodedPos, setGeocodedPos] = useState<{ lat: number; lng: number } | null>(null);
  const activeLat = hasDestination
    ? geocodedPos?.lat ?? destinationLat ?? DEFAULT_LAT
    : DEFAULT_LAT;
  const activeLng = hasDestination
    ? geocodedPos?.lng ?? destinationLng ?? DEFAULT_LNG
    : DEFAULT_LNG;
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
  const [isCardExpanded, setIsCardExpanded] = useState(true);
  const [showCampTooltip, setShowCampTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number }>({
    lat: activeLat,
    lng: activeLng,
  });

  // 카카오 Geocoder로 목적지 캠핑장 도로명/지번 주소의 실제 정밀 좌표 보정 (강/오차 방지)
  useEffect(() => {
    setGeocodedPos(null);
    if (!kakaoReady || !hasDestination || !window.kakao?.maps?.services) return;

    const rawAddr = (destinationAddress || '').replace(/\([^)]*\)/g, '').trim();
    if (!rawAddr || rawAddr === '사용자 지정 캠핑장') return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoder.addressSearch(rawAddr, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result && result[0]) {
        const exactLat = Number(result[0].y);
        const exactLng = Number(result[0].x);
        if (!Number.isNaN(exactLat) && !Number.isNaN(exactLng)) {
          setGeocodedPos({ lat: exactLat, lng: exactLng });
        }
      }
    });
  }, [kakaoReady, hasDestination, destinationAddress, destinationName]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const stationCardRef = useRef<HTMLElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);

  // 주유소 선택 또는 상세창 펼침 시 카카오맵 리레이아웃
  const scrollToStationCard = () => {
    setTimeout(() => {
      mapInstanceRef.current?.relayout?.();
    }, 60);
  };

  // 지도 컨테이너 크기가 변할 때마다(정보창 접기/펼치기, 창 크기 변경 등) ResizeObserver로 즉시 카카오맵 리레이아웃
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      mapInstanceRef.current?.relayout?.();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [kakaoReady]);

  // 정보창 접기/펼치기 상태가 바뀔 때마다 카카오맵 캔버스 크기 즉시 재계산
  useEffect(() => {
    const t1 = setTimeout(() => mapInstanceRef.current?.relayout?.(), 20);
    const t2 = setTimeout(() => mapInstanceRef.current?.relayout?.(), 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isCardExpanded]);

  // 캠핑장(또는 기준 좌표)과 주변 주유소 마커들이 한 화면에 모두 들어오도록 지도 범위(Bounds) 자동 맞춤
  const fitMapToCenterAndStations = (
    centerLat: number,
    centerLng: number,
    stationList: KeroseneStation[]
  ) => {
    if (!mapInstanceRef.current || !kakaoReady || !window.kakao?.maps) return;
    try {
      mapInstanceRef.current.relayout();
      if (stationList.length === 0) {
        mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(centerLat, centerLng));
        const radiusLevel =
          defaultSearchRadiusKm <= 1
            ? 4
            : defaultSearchRadiusKm <= 3
            ? 5
            : defaultSearchRadiusKm <= 5
            ? 6
            : defaultSearchRadiusKm <= 10
            ? 7
            : 8;
        mapInstanceRef.current.setLevel(radiusLevel);
        return;
      }

      const bounds = new window.kakao.maps.LatLngBounds();
      bounds.extend(new window.kakao.maps.LatLng(centerLat, centerLng));

      // 1순위(최저가·최단거리) 주유소 + 기준점에서 가장 가까운 주유소 3곳을 함께 화면에 포함
      const nearestThree = [...stationList]
        .sort(
          (a, b) =>
            getDistanceKm(centerLat, centerLng, a.latitude, a.longitude) -
            getDistanceKm(centerLat, centerLng, b.latitude, b.longitude)
        )
        .slice(0, 3);

      const targets = [stationList[0], ...nearestThree];
      targets.forEach((st) => {
        if (st) {
          bounds.extend(new window.kakao.maps.LatLng(st.latitude, st.longitude));
        }
      });

      mapInstanceRef.current.setBounds(bounds);
    } catch {
      // ignore bounds error
    }
  };

  // 목적지 캠핑장이 변경될 때마다 자동으로 해당 위도/경도 주변 등유 주유소 동기화!
  useEffect(() => {
    let cancelled = false;
    setSearchMode(hasDestination ? 'ROUTE' : 'CURRENT');
    setCurrentMapCenter({ lat: activeLat, lng: activeLng });

    async function syncDestinationStations() {
      setIsLoading(true);
      const label = hasDestination ? destinationName : '현재 지도 중심';
      const res = await fetchKeroseneStations(
        activeLat,
        activeLng,
        defaultSearchRadiusKm * 1000,
        label
      );
      if (cancelled) return;
      const sorted = sortStationsByPriceAndDistance(res.stations, activeLat, activeLng);
      setStations(sorted);
      setDataSource(res.source);
      setSelectedStation(sorted[0] ?? null);
      setIsLoading(false);

      // 처음 지도가 뜰 때 캠핑장/중심 좌표와 주변 주유소 가격 핀들이 한 화면에 같이 보이도록 범위 조정
      setTimeout(() => {
        if (!cancelled) {
          fitMapToCenterAndStations(activeLat, activeLng, sorted);
        }
      }, 60);
    }

    syncDestinationStations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasDestination,
    destinationName,
    activeLat,
    activeLng,
    initialStations,
    kakaoReady,
    defaultSearchRadiusKm,
  ]);

  // 필터링 및 정렬된 주유소 목록 (동일 가격 시 거리순)
  const filteredStations = useMemo(() => {
    let list = [...stations];
    if (filterMode === 'HOURS_24') {
      list = list.filter((s) => s.is_24_hours);
    } else if (filterMode === 'THIN_NOZZLE') {
      list = list.filter((s) => s.has_thin_nozzle);
    }
    const refLat =
      searchMode === 'ROUTE' && hasDestination ? activeLat : currentMapCenter.lat;
    const refLng =
      searchMode === 'ROUTE' && hasDestination ? activeLng : currentMapCenter.lng;
    return sortStationsByPriceAndDistance(list, refLat, refLng);
  }, [
    stations,
    filterMode,
    searchMode,
    hasDestination,
    activeLat,
    activeLng,
    currentMapCenter.lat,
    currentMapCenter.lng,
  ]);

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

        // 빈 지도 영역을 클릭하면 하단 상세 카드를 1줄 요약 바(미니 모드)로 접기
        window.kakao.maps.event.addListener(mapInstanceRef.current, 'click', () => {
          setIsCardExpanded(false);
        });
      } else {
        mapInstanceRef.current.relayout();
      }

      // 기존 오버레이 제거
      overlaysRef.current.forEach((ov) => ov.setMap(null));
      overlaysRef.current = [];

      // 1) 목적지 캠핑장이 설정된 경우: C안 (원형 아이콘 핀 ⛺ 고정 + 클릭 시 절대위치 툴팁 토글)
      if (hasDestination) {
        const campEl = document.createElement('div');
        campEl.style.cursor = 'pointer';
        campEl.innerHTML = `
          <div style="width:34px;height:34px;position:relative;">
            <div class="camp-pin-tooltip" style="
              display: none;
              position: absolute;
              bottom: 40px;
              left: 50%;
              transform: translateX(-50%);
              background: #1E3F20;
              color: #FFFFFF;
              border: 1.5px solid #FFFFFF;
              padding: 3px 9px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 11px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              white-space: nowrap;
              pointer-events: none;
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
        campEl.onclick = (e) => {
          e.stopPropagation();
          const tip = campEl.querySelector('.camp-pin-tooltip') as HTMLElement | null;
          if (tip) {
            tip.style.display = tip.style.display === 'none' ? 'block' : 'none';
          }
        };
        const campOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(activeLat, activeLng),
          content: campEl,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 30,
        });
        campOverlay.setMap(mapInstanceRef.current);
        overlaysRef.current.push(campOverlay);
      }

      // 2) 등유 주유소 가격 커스텀 마커 렌더링 (현재 선택된 주유소는 선명한 로얄블루 #2563EB + 후광 링으로 강조)
      filteredStations.forEach((st) => {
        const isLowest = st.kerosene_price === lowestPrice;
        const isSelected = selectedStation?.station_id === st.station_id;

        const bgColor = isSelected ? '#2563EB' : isLowest ? '#FF4D4D' : '#FFFFFF';
        const textColor = isSelected || isLowest ? '#FFFFFF' : '#111827';
        const borderColor = isSelected ? '#FFFFFF' : isLowest ? '#E63946' : '#1E3F20';
        const boxShadow = isSelected
          ? '0 0 0 4px rgba(37, 99, 235, 0.38), 0 6px 14px rgba(0,0,0,0.3)'
          : '0 4px 10px rgba(0,0,0,0.18)';

        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="
              background: ${bgColor};
              color: ${textColor};
              border: ${isSelected ? '2.5px' : '2px'} solid ${borderColor};
              padding: ${isSelected ? '5px 12px' : '4px 10px'};
              border-radius: 9999px;
              font-weight: 800;
              font-size: ${isSelected ? '13px' : '12px'};
              box-shadow: ${boxShadow};
              transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
              transition: all 0.15s ease;
            ">
              <span>${isSelected ? '📍' : isLowest ? '🔥' : '⛽'}</span>
              <span>${st.kerosene_price.toLocaleString()}원</span>
              ${isSelected ? '<span style="font-size:10px;opacity:0.95;">✓</span>' : ''}
            </div>
            ${
              isSelected
                ? `<div style="
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 7px solid #2563EB;
                    margin-top: -1px;
                  "></div>`
                : ''
            }
          </div>
        `;
        el.onclick = () => {
          setSelectedStation(st);
          setIsCardExpanded(true);
          scrollToStationCard();
        };

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(st.latitude, st.longitude),
          content: el,
          yAnchor: isSelected ? 1.25 : 1.3,
          zIndex: isSelected ? 35 : isLowest ? 20 : 10,
        });
        overlay.setMap(mapInstanceRef.current);
        overlaysRef.current.push(overlay);
      });

      // 3) 내 현재 위치(GPS) 마커 표시
      if (myLocation) {
        const myLocEl = document.createElement('div');
        myLocEl.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="
              background: #EF4444;
              color: #FFFFFF;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 7px;
              border-radius: 9999px;
              border: 1.5px solid #FFFFFF;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              margin-bottom: 3px;
              white-space: nowrap;
            ">내 위치</div>
            <div style="
              width: 16px;
              height: 16px;
              border-radius: 9999px;
              background: #EF4444;
              border: 3px solid #FFFFFF;
              box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.32), 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          </div>
        `;
        const myLocOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(myLocation.lat, myLocation.lng),
          content: myLocEl,
          yAnchor: 0.85,
          zIndex: 40,
        });
        myLocOverlay.setMap(mapInstanceRef.current);
        overlaysRef.current.push(myLocOverlay);
      }
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
    myLocation,
  ]);

  // 지정 좌표 기준 주유소 검색 및 지도 범위 자동 보정
  const executeStationSearch = async (lat: number, lng: number, label: string) => {
    setIsLoading(true);
    const result = await fetchKeroseneStations(
      lat,
      lng,
      defaultSearchRadiusKm * 1000,
      label
    );
    setStations(result.stations);
    setDataSource(result.source);

    if (result.stations.length > 0) {
      const sorted = sortStationsByPriceAndDistance(result.stations, lat, lng);
      setSelectedStation(sorted[0]);
      fitMapToCenterAndStations(lat, lng, sorted);
    } else {
      setSelectedStation(null);
      fitMapToCenterAndStations(lat, lng, []);
    }
    setIsLoading(false);
  };

  // 현 지도 중심 또는 목적지 중심 재검색
  const handleReSearch = async () => {
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
    await executeStationSearch(lat, lng, label);
  };

  // '현재 중심 탐색' 탭 클릭 시 즉시 현재 지도 중심 좌표로 주유소 검색
  const handleSwitchToCurrentMode = async () => {
    setSearchMode('CURRENT');
    let lat = currentMapCenter.lat;
    let lng = currentMapCenter.lng;
    if (mapInstanceRef.current && kakaoReady) {
      const center = mapInstanceRef.current.getCenter();
      lat = center.getLat();
      lng = center.getLng();
    }
    await executeStationSearch(lat, lng, '현재 지도 중심');
  };

  // 목적지 캠핑장 위치 및 주변 주유소가 함께 보이도록 지도 중심 이동
  const handleFocusDestination = () => {
    if (!hasDestination) {
      onOpenTripSetup();
      return;
    }
    setSearchMode('ROUTE');
    setCurrentMapCenter({ lat: activeLat, lng: activeLng });
    fitMapToCenterAndStations(activeLat, activeLng, filteredStations);
  };

  // 브라우저 GPS 현재 위치로 지도 이동 및 주변 등유 주유소 즉시 검색
  const handleMoveToMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('이 브라우저에서는 위치 정보(GPS) 기능을 지원하지 않습니다.');
      setTimeout(() => setLocationNotice(null), 3000);
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setMyLocation({ lat, lng });
        setSearchMode('CURRENT');
        setCurrentMapCenter({ lat, lng });
        setIsLocating(false);

        if (mapInstanceRef.current && kakaoReady && window.kakao?.maps) {
          const locLatLng = new window.kakao.maps.LatLng(lat, lng);
          mapInstanceRef.current.setCenter(locLatLng);
          mapInstanceRef.current.setLevel(6);
        }

        await executeStationSearch(lat, lng, '내 현재 위치');
      },
      (err) => {
        setIsLocating(false);
        const msg =
          err.code === 1
            ? '위치 권한이 거부되었습니다. 주소창 왼쪽에서 위치 권한을 허용해 주세요.'
            : '현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        setLocationNotice(msg);
        setTimeout(() => setLocationNotice(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // §5.2 외부 내비게이션 앱 연동 (티맵과 카카오내비 완전 분리)
  const handleStartNavigation = (provider: 'KAKAO' | 'TMAP', station: KeroseneStation) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const cleanName = getCleanStationName(station.station_name);
    const encodedName = encodeURIComponent(cleanName);

    if (provider === 'TMAP') {
      const tmapSchemeUrl = `tmap://route?goalname=${encodedName}&goalx=${station.longitude}&goaly=${station.latitude}`;
      if (isMobile) {
        // 모바일에서는 티맵 앱 스킴만 단독 호출 (카카오맵 웹 폴백이 같이 열리는 현상 제거)
        window.location.href = tmapSchemeUrl;
      } else {
        // PC 브라우저에서는 티맵 안내 또는 네이버/카카오가 아닌 티맵 스토어/웹 안내
        window.location.href = tmapSchemeUrl;
      }
      return;
    }

    // KAKAO 내비게이션
    const kakaoWebUrl = `https://map.kakao.com/link/to/${encodedName},${station.latitude},${station.longitude}`;
    if (!isMobile) {
      window.open(kakaoWebUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    let appOpened = false;
    const onBlur = () => {
      appOpened = true;
    };
    window.addEventListener('blur', onBlur, { once: true });

    window.location.href = `kakaonavi://navigate?name=${encodedName}&x=${station.longitude}&y=${station.latitude}&coord_type=wgs84`;

    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (!appOpened && document.visibilityState === 'visible') {
        window.open(kakaoWebUrl, '_blank', 'noopener,noreferrer');
      }
    }, 2200);
  };

  return (
    <div className="fixed inset-x-0 top-14 bottom-14 max-w-md mx-auto flex flex-col overflow-hidden bg-white">
      {/* 3.1 상단 검색 모드 전환 & 목적지 캠핑장 동기화 배너 */}
      <div className="bg-white px-4 pt-3 pb-2.5 shadow-sm border-b border-gray-100 z-20 space-y-2 shrink-0">
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
              onClick={handleSwitchToCurrentMode}
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
          <span className="ml-auto text-[10px] font-bold text-forest shrink-0 whitespace-nowrap">
            🟢 반경 {defaultSearchRadiusKm}km ·{' '}
            {dataSource === 'opinet' ? '오피넷 실시간' : '주변 매칭'}
          </span>
        </div>
      </div>

      {/* 3.1 & 3.3 통합 지도 뷰 + 커스텀 가격 말풍선 마커 */}
      <div className="relative flex-1 min-h-[140px] bg-[#e8efe9] overflow-hidden z-10">
        <div className={`absolute inset-0 w-full h-full ${kakaoReady ? 'block' : 'hidden'}`}>
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {!kakaoReady && (
          <div className="absolute inset-0 w-full h-full select-none overflow-hidden bg-gradient-to-br from-[#e4efe7] via-[#eef3ef] to-[#dde8e0]">
            <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#9ca3af" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* 중앙 목적지 캠핑장 핀 (인터랙티브 캔버스 폴백 시: C안 원형 아이콘 핀 고정 + 클릭 시 절대위치 툴팁) */}
            {hasDestination ? (
              <div
                style={{ top: '44%', left: '52%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-9 h-9"
              >
                {showCampTooltip && (
                  <div className="absolute bottom-11 left-1/2 -translate-x-1/2 bg-forest text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md border border-white whitespace-nowrap pointer-events-none">
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
                  onClick={() => {
                    setSelectedStation(st);
                    setIsCardExpanded(true);
                    scrollToStationCard();
                  }}
                  style={{ top: pos.top, left: pos.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full font-extrabold text-xs shadow-md transition-transform flex items-center gap-1 border-2 ${
                    isSelected
                      ? 'bg-[#2563EB] text-white border-white ring-4 ring-blue-500/35 scale-110 z-30'
                      : isLowest
                      ? 'bg-aid-red text-white border-white scale-105 z-20'
                      : 'bg-white text-gray-900 border-forest hover:scale-105 z-10'
                  }`}
                >
                  <span>{isSelected ? '📍' : isLowest ? '🔥' : '⛽'}</span>
                  <span>{st.kerosene_price.toLocaleString()}원</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleReSearch}
          disabled={isLoading}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white hover:bg-gray-50 text-forest font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg border border-forest/20 flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
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

        {/* 위치 권한 안내 토스트 */}
        {locationNotice && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl shadow-lg max-w-[90%] text-center">
            ⚠️ {locationNotice}
          </div>
        )}

        {/* 우측 하단 '내 위치(현재 위치)' 플로팅 버튼 */}
        <button
          type="button"
          onClick={handleMoveToMyLocation}
          disabled={isLocating}
          title="내 현재 위치 중심으로 주유소 찾기"
          className="absolute bottom-3 right-3 z-30 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs px-3 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.3}
            className={isLocating ? 'animate-spin' : ''}
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
          <span>{isLocating ? '위치 확인중...' : '내 위치'}</span>
        </button>
      </div>

      {/* 3.4 하단 상세 슬라이드 카드 (방안 1: 1줄 미니 요약 바 ↔ 상세 펼침 토글) */}
      {selectedStation && (
        <section
          ref={stationCardRef}
          className="shrink-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-gray-100 z-30 transition-all"
        >
          {/* 상단 드래그 핸들 & 접기/펼치기 토글 헤더 */}
          <div
            onClick={() => {
              const nextExpanded = !isCardExpanded;
              setIsCardExpanded(nextExpanded);
              if (nextExpanded) {
                scrollToStationCard();
              } else {
                setTimeout(() => {
                  mapInstanceRef.current?.relayout?.();
                }, 60);
              }
            }}
            className="px-4 pt-2 pb-2.5 cursor-pointer select-none hover:bg-gray-50/70 transition-colors rounded-t-2xl"
          >
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
            {/* 1라인: 주유소명 전체 노출 & 우측 가격/접기 버튼 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm shrink-0">📍</span>
                <h3 className="text-base font-extrabold text-gray-900 truncate">
                  {getCleanStationName(selectedStation.station_name)}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base font-extrabold text-aid-red">
                  {selectedStation.kerosene_price.toLocaleString()}원
                </span>
                <span className="text-[11px] font-bold text-forest bg-surface px-2.5 py-1 rounded-lg border border-gray-200">
                  {isCardExpanded ? '▼ 접기' : '▲ 상세 / 길찾기'}
                </span>
              </div>
            </div>

            {/* 2라인(주유소명 바로 밑): 정유사 브랜드명 및 특성 배지 */}
            <div className="flex items-center justify-between flex-wrap gap-1 mt-1.5">
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
              <span className="text-[10px] text-gray-400">실내등유 1L 기준</span>
            </div>
          </div>

          {/* 펼쳐진 상태일 때만 상세 주소 · 주유소 칩 · 내비게이션 버튼 노출 */}
          {isCardExpanded && (
            <div className="px-4 pb-3 pt-2 space-y-2 border-t border-gray-100">
              <p className="text-xs text-gray-600 flex items-center gap-2 whitespace-nowrap truncate">
                <span className="truncate">{selectedStation.address}</span>
                {hasDestination && (
                  <span className="font-bold text-forest shrink-0">
                    🏕️ 약{' '}
                    {getDistanceKm(
                      activeLat,
                      activeLng,
                      selectedStation.latitude,
                      selectedStation.longitude
                    )}
                    km
                  </span>
                )}
              </p>

              {selectedStation.review_summary && (
                <div className="bg-surface rounded-xl px-3 py-1.5 text-xs text-gray-700 flex items-center gap-2 whitespace-nowrap truncate">
                  <span>💬</span>
                  <span className="font-medium truncate">{selectedStation.review_summary}</span>
                </div>
              )}

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {filteredStations.map((st) => (
                  <button
                    key={st.station_id}
                    onClick={() => {
                      setSelectedStation(st);
                      if (mapInstanceRef.current && kakaoReady && window.kakao?.maps) {
                        mapInstanceRef.current.panTo(
                          new window.kakao.maps.LatLng(st.latitude, st.longitude)
                        );
                      }
                      scrollToStationCard();
                    }}
                    className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      st.station_id === selectedStation.station_id
                        ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold shadow-xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {getCleanStationName(st.station_name)} ({st.kerosene_price.toLocaleString()}원)
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
            </div>
          )}
        </section>
      )}

      {/* 설정한 반경 내 주유소가 0곳일 때 안내 카드 */}
      {!selectedStation && !isLoading && (
        <section className="shrink-0 bg-white rounded-t-2xl px-4 py-3.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-gray-100 z-30 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-gray-800">
              ℹ️ 반경 {defaultSearchRadiusKm}km 이내에 등유 주유소가 없습니다
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              상단 우측 ⚙️ 설정에서 탐색 반경을 5km 또는 10km로 넓혀보세요.
            </p>
          </div>
          <span className="text-[11px] font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
            반경 {defaultSearchRadiusKm}km
          </span>
        </section>
      )}
    </div>
  );
}
