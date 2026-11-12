import { useMemo } from 'react';
import type { CampingChecklist, KeroseneStation } from '../types';
import ProgressBar from '../components/ui/ProgressBar';
import AdBanner from '../components/ads/AdBanner';
import { estimateCampingClimate, formatStayDuration } from '../data/campsitePresets';
import { getDistanceKm, getStationsAroundLocation } from '../services/opinetApi';

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
  const destLat = checklist.destination_lat ?? 37.5665;
  const destLng = checklist.destination_lng ?? 126.978;

  // 목적지 캠핑장이 선택되어 있을 때 해당 캠핑장 주변 주유소 동기화 및 최저가 매칭
  const matchedStation = useMemo(() => {
    if (!hasSchedule || !hasDestination || !checklist.destination_lat) {
      return [...stations].sort((a, b) => a.kerosene_price - b.kerosene_price)[0];
    }
    const localPool = getStationsAroundLocation(
      destLat,
      destLng,
      checklist.destination_name
    );
    return [...localPool].sort((a, b) => a.kerosene_price - b.kerosene_price)[0];
  }, [
    stations,
    hasSchedule,
    hasDestination,
    checklist.destination_lat,
    checklist.destination_name,
    destLat,
    destLng,
  ]);

  // D-Day 계산
  const dDayLabel = useMemo(() => {
    if (!hasDate) return '날짜 미정';
    const target = new Date(checklist.target_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `D-${diffDays} to Camping`;
    if (diffDays === 0) return 'D-Day Camping!';
    return `D+${Math.abs(diffDays)} 지난 일정`;
  }, [hasDate, checklist.target_date]);

  // 설정된 날짜(또는 오늘 날짜) 기준 예상 최저기온
  const climate = useMemo(
    () =>
      estimateCampingClimate(
        hasDate ? checklist.target_date : new Date().toISOString().slice(0, 10),
        hasDestination ? destLat : 37.5665
      ),
    [hasDate, hasDestination, checklist.target_date, destLat]
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-aid-red text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                🗓️ {dDayLabel}
              </span>
              {hasDate && (
                <span className="text-[11px] font-bold text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                  {stayDuration}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenTripSetup}
                className="text-xs font-bold text-forest bg-white hover:bg-forest hover:text-white border border-forest/30 px-2.5 py-1 rounded-xl shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>✏️</span>
                <span>일정변경</span>
              </button>
              <button
                onClick={() => onClearSchedule()}
                title="일정 비우기 (일정 없음 모드로 전환)"
                className="text-[11px] font-bold text-gray-400 hover:text-aid-red bg-white border border-gray-200 px-2 py-1 rounded-xl transition-colors"
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
              <p className="text-[11px] text-gray-400 font-medium">
                {climate.seasonLabel} 최저
              </p>
              <p
                className={`text-xl font-extrabold tracking-tight ${
                  isSubZero ? 'text-aid-red' : 'text-gray-900'
                }`}
              >
                {climate.minTemp}℃ {climate.weatherIcon}
              </p>
              {isSubZero ? (
                <span className="text-[10px] font-bold text-aid-red">
                  영하 동계 난방 필수!
                </span>
              ) : (
                <span className="text-[10px] font-bold text-forest">
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
          <span>얇은 주유건 보유 주유소 {stations.filter((s) => s.has_thin_nozzle).length}곳 포함</span>
          <span>지도 열기 →</span>
        </div>
      </section>

      {/* 1.4 유틸리티 / 광고 배너 */}
      <AdBanner />
    </div>
  );
}
