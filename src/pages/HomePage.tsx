import { useState, useEffect, useMemo } from 'react';
import type { CampingChecklist, KeroseneStation } from '../types';
import ProgressBar from '../components/ui/ProgressBar';
import AdBanner from '../components/ads/AdBanner';
import { formatStayDuration } from '../data/campsitePresets';
import { useCampingWeather } from '../hooks/useCampingWeather';
import {
  fetchKeroseneStations,
  getDistanceKm,
  getStationsAroundLocation,
} from '../services/opinetApi';

interface HomePageProps {
  checklist: CampingChecklist;
  hasSchedule: boolean;
  progress: number;
  stations: KeroseneStation[];
  defaultSearchRadiusKm?: 1 | 3 | 5 | 10 | 15;
  onGoChecklist: () => void;
  onGoMap: () => void;
  onOpenTripSetup: () => void;
  onClearSchedule: () => void;
}

export default function HomePage({
  checklist,
  hasSchedule,
  progress,
  stations,
  defaultSearchRadiusKm = 5,
  onGoChecklist,
  onGoMap,
  onOpenTripSetup,
  onClearSchedule,
}: HomePageProps) {
  const uncheckedItems = checklist.items.filter((i) => !i.is_checked);
  const hasDestination = Boolean(checklist.destination_name);
  const hasDate = Boolean(checklist.target_date);

  const [kakaoReady, setKakaoReady] = useState(false);
  const [geocodedPos, setGeocodedPos] = useState<{ lat: number; lng: number } | null>(null);
  const destLat = hasDestination
    ? geocodedPos?.lat ?? checklist.destination_lat ?? 37.5665
    : 37.5665;
  const destLng = hasDestination
    ? geocodedPos?.lng ?? checklist.destination_lng ?? 126.978
    : 126.978;

  const [liveStations, setLiveStations] = useState<KeroseneStation[]>(() =>
    hasSchedule && hasDestination
      ? getStationsAroundLocation(destLat, destLng, checklist.destination_name)
      : stations
  );

  // Kakao Maps SDK 로드 보장 (홈 화면에서도 실제 주유소/주소 매칭이 동일하게 동작하도록)
  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
    if (!appKey) return;

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => setKakaoReady(true));
      return;
    }

    const existing = document.getElementById('kakao-map-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => setKakaoReady(true));
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setKakaoReady(true));
      }
    };
    document.head.appendChild(script);
  }, []);

  // 등유지도(MapPage)와 동일하게 목적지 도로명/지번 주소 정밀 좌표 보정
  useEffect(() => {
    setGeocodedPos(null);
    if (!kakaoReady || !hasSchedule || !hasDestination || !window.kakao?.maps?.services) return;
    const rawAddr = (checklist.destination_address || '').replace(/\([^)]*\)/g, '').trim();
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
  }, [kakaoReady, hasSchedule, hasDestination, checklist.destination_address]);

  // 등유지도(MapPage)와 동일한 fetchKeroseneStations 호출로 실시간 주유소 목록 동기화
  useEffect(() => {
    let cancelled = false;
    async function syncHomeStations() {
      const label = hasSchedule && hasDestination ? checklist.destination_name : '수도권 중심';
      const res = await fetchKeroseneStations(
        destLat,
        destLng,
        defaultSearchRadiusKm * 1000,
        label
      );
      if (!cancelled) {
        setLiveStations(res.stations);
      }
    }
    syncHomeStations();
    return () => {
      cancelled = true;
    };
  }, [
    hasSchedule,
    hasDestination,
    destLat,
    destLng,
    checklist.destination_name,
    kakaoReady,
    defaultSearchRadiusKm,
  ]);

  // 등유지도와 동일하게 1순위: 가격 검증된 주유소 우선, 2순위: 최저가순, 3순위: 거리순 정렬 후 1위 주유소 선택
  const matchedStation = useMemo(() => {
    const sorted = [...liveStations].sort((a, b) => {
      const validA = !a.is_price_unverified && a.kerosene_price > 0;
      const validB = !b.is_price_unverified && b.kerosene_price > 0;
      if (validA && !validB) return -1;
      if (!validA && validB) return 1;

      if (validA && validB) {
        const priceDiff = a.kerosene_price - b.kerosene_price;
        if (priceDiff !== 0) return priceDiff;
      }
      const distA = getDistanceKm(destLat, destLng, a.latitude, a.longitude);
      const distB = getDistanceKm(destLat, destLng, b.latitude, b.longitude);
      return distA - distB;
    });
    return sorted[0];
  }, [liveStations, destLat, destLng]);

  // D-Day 계산 (방안 1-A: 간결한 D-Day 표기)
  const dDayLabel = useMemo(() => {
    if (!hasDate) return '날짜 미정';
    const target = new Date(checklist.target_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `D-${diffDays}`;
    if (diffDays === 0) return 'D-Day!';
    return `D+${Math.abs(diffDays)}`;
  }, [hasDate, checklist.target_date]);

  // 설정된 날짜(또는 오늘 날짜) 및 목적지 좌표 기준 실시간 기상 예보 연동 (16일 이후는 월별 기온 폴백)
  const climate = useCampingWeather(
    hasDate ? checklist.target_date : undefined,
    hasDestination ? destLat : 37.5665,
    hasDestination ? destLng : 126.978
  );
  const isSubZero = climate.minTemp < 0;
  const stayDuration = hasDate
    ? formatStayDuration(checklist.target_date, checklist.end_date)
    : '일정 미선택';

  // 도로명/지번 주소에서 '도/시 + 시/군/구 + 읍/면/동' 3어절만 깔끔하게 추출 (예: 경기 연천군 장남면)
  const regionSummary = useMemo(() => {
    const addr = (checklist.destination_address || '').replace(/\([^)]*\)/g, '').trim();
    if (!addr || addr === '사용자 지정 캠핑장') return '목적지 캠핑장';
    const parts = addr.split(/\s+/);
    const first = parts[0]
      ?.replace('경기도', '경기')
      .replace('강원특별자치도', '강원')
      .replace('강원도', '강원')
      .replace('충청북도', '충북')
      .replace('충청남도', '충남')
      .replace('전라북도', '전북')
      .replace('전북특별자치도', '전북')
      .replace('전라남도', '전남')
      .replace('경상북도', '경북')
      .replace('경상남도', '경남')
      .replace('제주특별자치도', '제주');
    return [first, ...parts.slice(1, 3)].filter(Boolean).join(' ');
  }, [checklist.destination_address]);

  return (
    <div className="page-content px-4 pt-4 space-y-4 max-w-md mx-auto">
      {/* 1.2 개인화 캠핑 대시보드 (일정 있을 때 vs 일정 없을 때 분기) */}
      {hasSchedule ? (
        <section className="bg-surface rounded-2xl p-4 shadow-sm border border-gray-200/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 bg-aid-red text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap shrink-0">
                🗓️ {dDayLabel}
              </span>
              {hasDate && (
                <span className="text-[11px] font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                  {stayDuration}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenTripSetup}
                className="text-xs font-bold text-forest bg-white hover:bg-forest hover:text-white border border-forest/30 px-2.5 py-1 rounded-xl shadow-2xs transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>✏️</span>
                <span>변경</span>
              </button>
              <button
                onClick={() => onClearSchedule()}
                title="일정 비우기 (일정 없음 모드로 전환)"
                className="text-[11px] font-bold text-gray-400 hover:text-aid-red bg-white border border-gray-200 px-2.5 py-1 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                비우기
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 mt-3">
            <div onClick={onOpenTripSetup} className="cursor-pointer group min-w-0 flex-1">
              <p className="text-xs font-semibold text-forest mb-0.5 truncate">
                🏕️ {regionSummary}
              </p>
              <h2 className="text-lg font-extrabold text-gray-900 group-hover:text-forest transition-colors truncate">
                📍 {hasDestination ? checklist.destination_name : '캠핑장 미정 (터치하여 선택)'}
              </h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">
                🗓️{' '}
                {hasDate
                  ? `${checklist.target_date}${
                      checklist.end_date && checklist.end_date !== checklist.target_date
                        ? ` ~ ${checklist.end_date.slice(5)}`
                        : ''
                    }`
                  : '날짜 미정 (터치하여 선택)'}
              </p>
            </div>

            <div className="text-right bg-white px-3.5 py-2 rounded-2xl shadow-sm border border-gray-100 shrink-0">
              <p className="text-[10px] text-gray-400 font-semibold whitespace-nowrap">
                {climate.isRealtime
                  ? `🟢 실시간 예보 (${climate.weatherDesc})`
                  : `${climate.seasonLabel} 최저`}
              </p>
              <p
                className={`text-xl font-extrabold tracking-tight whitespace-nowrap ${
                  isSubZero ? 'text-aid-red' : 'text-gray-900'
                }`}
              >
                {climate.minTemp}℃
                {climate.maxTemp !== undefined ? (
                  <span className="text-xs font-bold text-gray-400 ml-0.5">
                    / {climate.maxTemp}℃
                  </span>
                ) : null}{' '}
                {climate.weatherIcon}
              </p>
              {isSubZero ? (
                <span className="text-[10px] font-bold text-aid-red whitespace-nowrap">
                  영하 동계 난방 필수!
                </span>
              ) : (
                <span className="text-[10px] font-bold text-forest whitespace-nowrap">
                  일교차 대비 요망
                </span>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* 일정이 없을 때 (Empty Schedule State) */
        <section className="bg-surface rounded-2xl p-5 shadow-sm border border-forest/15">
          {/* 상단 뱃지 라인 (상태 & 현재 시즌) */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-forest/10 text-forest text-xs font-bold px-2.5 py-1 rounded-full">
              ⛺ 일정 준비 중
            </span>
            <span className="inline-flex items-center gap-1 bg-white text-gray-700 border border-gray-200/80 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
              <span className="text-gray-400 font-medium">현재</span> {climate.seasonLabel} {climate.weatherIcon}
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-gray-900 break-keep leading-snug">
            설레는 다음 캠핑을 준비해볼까요?
          </h2>
          <p className="text-xs text-gray-500 mt-1.5 break-keep leading-relaxed">
            날짜와 목적지를 등록하면 기상 예보와 계절 맞춤 챙김목록을 자동으로 준비해 드려요.
          </p>

          <button
            onClick={onOpenTripSetup}
            className="mt-4 w-full bg-forest hover:bg-forest-600 active:scale-[0.99] text-white text-sm font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>🗓️</span>
            <span>일정 & 캠핑장 등록하기</span>
          </button>
        </section>
      )}

      {/* 1.3 핵심 기능 대형 카드 A: 내 캠핑 짐 챙기기 */}
      <section
        onClick={onGoChecklist}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:border-forest/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">🎒</span>
            <h3 className="font-extrabold text-base text-gray-900 truncate">
              {hasSchedule ? '내 캠핑 짐 챙기기' : '기본 캠핑 짐 점검하기'}
            </h3>
          </div>
          <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
            {checklist.items.filter((i) => i.is_checked).length} / {checklist.items.length} 완료
          </span>
        </div>

        <div className="my-3">
          <ProgressBar progress={progress} />
        </div>

        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="truncate pr-2 text-gray-600">
            {uncheckedItems.length > 0 ? (
              <>
                <span className="font-bold text-aid-red">미체크 {uncheckedItems.length}개: </span>
                <span>
                  {uncheckedItems
                    .slice(0, 3)
                    .map((i) => i.item_name)
                    .join(', ')}
                  {uncheckedItems.length > 3 ? ' 외' : ''}
                </span>
              </>
            ) : (
              <span className="font-bold text-forest">모든 캠핑 준비물을 챙겼어요! 🎉</span>
            )}
          </div>
          <span className="font-bold text-forest whitespace-nowrap shrink-0 flex items-center gap-0.5">
            챙기러 가기 <span className="text-xs">→</span>
          </span>
        </div>
      </section>

      {/* 1.3 핵심 기능 대형 카드 B: 등유 주유소 찾기 */}
      <section
        onClick={onGoMap}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:border-forest/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">⛽</span>
            <h3 className="font-extrabold text-base text-gray-900 truncate">
              {hasSchedule && hasDestination
                ? '가는 길에 등유 주유소 찾기'
                : '주변 최저가 등유 주유소 찾기'}
            </h3>
          </div>
          <span className="text-[11px] font-bold bg-aid-red/10 text-aid-red px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
            실시간 가격
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {hasSchedule && hasDestination ? (
            <>
              <strong className="text-gray-700">{checklist.destination_name}</strong> 인근 실내등유 판매 주유소를 즉시 매칭합니다.
            </>
          ) : (
            '목적지 설정 전에도 현재 지도 중심으로 실내등유 최저가 주유소를 탐색할 수 있습니다.'
          )}
        </p>

        {matchedStation && (
          <div className="bg-surface rounded-xl p-3 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span
                className={`text-[10px] font-bold uppercase ${
                  matchedStation.is_price_unverified || !matchedStation.kerosene_price
                    ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'
                    : 'text-aid-red'
                }`}
              >
                {matchedStation.is_price_unverified || !matchedStation.kerosene_price
                  ? '⚠️ 등유 취급 확인 요망'
                  : `🔥 ${
                      hasSchedule && hasDestination
                        ? `${checklist.destination_name} 인근 최저가`
                        : '수도권·강원 최저가 주유소'
                    }`}
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                {matchedStation.station_name}
              </p>
              <p className="text-[11px] text-gray-500 truncate max-w-[210px]">
                {matchedStation.address}
                {hasSchedule && hasDestination && checklist.destination_lat
                  ? ` (약 ${getDistanceKm(
                      destLat,
                      destLng,
                      matchedStation.latitude,
                      matchedStation.longitude
                    )}km)`
                  : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              {matchedStation.is_price_unverified || !matchedStation.kerosene_price ? (
                <div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block">
                    등유 미확인
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    전화 문의 필요
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-gray-400 block">실내등유 1L</span>
                  <span className="text-lg font-extrabold text-aid-red">
                    {matchedStation.kerosene_price.toLocaleString()}원
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-forest font-bold">
          <span>
            주변 등유 주유소 {liveStations.length}곳 (얇은 주유건{' '}
            {liveStations.filter((s) => s.has_thin_nozzle).length}곳)
          </span>
          <span>지도 열기 →</span>
        </div>
      </section>

      {/* 1.4 유틸리티 / 광고 배너 */}
      <AdBanner />
    </div>
  );
}
