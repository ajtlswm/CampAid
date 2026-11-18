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
      if (!hasSchedule || !hasDestination) {
        setLiveStations(stations);
        return;
      }
      const res = await fetchKeroseneStations(
        destLat,
        destLng,
        5000,
        checklist.destination_name
      );
      if (!cancelled && res.stations.length > 0) {
        setLiveStations(res.stations);
      }
    }
    syncHomeStations();
    return () => {
      cancelled = true;
    };
  }, [hasSchedule, hasDestination, destLat, destLng, checklist.destination_name, stations, kakaoReady]);

  // 등유지도와 동일하게 1순위: 최저가순, 2순위(동일 가격 시): 최단거리순 정렬 후 1위 주유소 선택
  const matchedStation = useMemo(() => {
    const sorted = [...liveStations].sort((a, b) => {
      const priceDiff = a.kerosene_price - b.kerosene_price;
      if (priceDiff !== 0) return priceDiff;
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

          <div className="flex items-end justify-between mt-3">
            <div onClick={onOpenTripSetup} className="cursor-pointer group">
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <span>목적지 캠핑장</span>
                {hasDate && (
                  <span className="text-[11px] text-forest font-semibold">
                    ({checklist.target_date}
                    {checklist.end_date && checklist.end_date !== checklist.target_date
                      ? ` ~ ${checklist.end_date.slice(5)}`
                      : ''}
                    )
                  </span>
                )}
              </p>
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-forest transition-colors flex items-center gap-1.5">
                📍 {hasDestination ? checklist.destination_name : '캠핑장 미정 (터치하여 선택)'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{checklist.title}</p>
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
        <section className="bg-surface rounded-2xl p-5 shadow-sm border border-dashed border-forest/35">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 bg-forest/10 text-forest text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                ⛺ 캠핑 일정 & 캠핑장 미선택
              </span>
              <h2 className="text-base font-bold text-gray-900 mt-2">
                아직 선택된 캠핑 일정이 없어요
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                일정 없이도 기본 체크리스트와 등유 지도를 이용할 수 있어요. 다음 캠핑 날짜와 캠핑장을 정하셨다면 등록해 보세요!
              </p>
            </div>
            <div className="text-right bg-white px-3 py-2 rounded-2xl shadow-2xs border border-gray-100 shrink-0">
              <p className="text-[10px] text-gray-400 font-medium">현재 시즌</p>
              <p className="text-sm font-extrabold text-forest mt-0.5">
                {climate.seasonLabel} {climate.weatherIcon}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenTripSetup}
            className="mt-3.5 w-full bg-forest hover:bg-forest-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🗓️</span>
            <span>+ 새 캠핑 일정 & 목적지 캠핑장 선택하기</span>
          </button>
        </section>
      )}

      {/* 1.3 핵심 기능 대형 카드 A: 내 캠핑 짐 챙기기 */}
      <section
        onClick={onGoChecklist}
        className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 cursor-pointer hover:border-forest/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎒</span>
            <h3 className="font-bold text-base text-gray-900">
              {hasSchedule ? `내 캠핑 짐 챙기기 (${progress}%)` : `기본 캠핑 짐 점검하기 (${progress}%)`}
            </h3>
          </div>
          <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full">
            {checklist.items.filter((i) => i.is_checked).length} / {checklist.items.length} 완료
          </span>
        </div>

        <div className="my-3">
          <ProgressBar progress={progress} />
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-600 truncate pr-2">
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
          <span className="text-xs font-bold text-forest shrink-0">챙기러 가기 →</span>
        </div>
      </section>

      {/* 1.3 핵심 기능 대형 카드 B: 등유 주유소 찾기 */}
      <section
        onClick={onGoMap}
        className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 cursor-pointer hover:border-forest/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛽</span>
            <h3 className="font-bold text-base text-gray-900">
              {hasSchedule && hasDestination
                ? '가는 길에 등유 주유소 찾기'
                : '주변 최저가 등유 주유소 찾기'}
            </h3>
          </div>
          <span className="text-[11px] font-bold bg-aid-red/10 text-aid-red px-2.5 py-1 rounded-full">
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
            <div>
              <span className="text-[10px] font-bold text-aid-red uppercase">
                🔥{' '}
                {hasSchedule && hasDestination
                  ? `${checklist.destination_name} 인근 최저가`
                  : '수도권·강원 최저가 주유소'}
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
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
            <div className="text-right">
              <span className="text-xs text-gray-400 block">실내등유 1L</span>
              <span className="text-lg font-extrabold text-aid-red">
                {matchedStation.kerosene_price.toLocaleString()}원
              </span>
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
