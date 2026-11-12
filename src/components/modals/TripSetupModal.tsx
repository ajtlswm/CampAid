import { useState, useMemo, useEffect } from 'react';
import type { CampingChecklist, CampsitePreset } from '../../types';
import {
  CAMPSITE_PRESETS,
  estimateCampingClimate,
  formatStayDuration,
} from '../../data/campsitePresets';
import { searchCampsitesNationwide } from '../../services/campsiteSearchApi';
import type { UpdateScheduleParams } from '../../hooks/useChecklist';

interface TripSetupModalProps {
  visible: boolean;
  checklist: CampingChecklist;
  hasSchedule: boolean;
  onClose: () => void;
  onSave: (params: UpdateScheduleParams) => void;
  onClearSchedule: (resetChecks?: boolean) => void;
}

function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TripSetupModal({
  visible,
  checklist,
  hasSchedule,
  onClose,
  onSave,
  onClearSchedule,
}: TripSetupModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destName, setDestName] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [destLat, setDestLat] = useState<number | undefined>(undefined);
  const [destLng, setDestLng] = useState<number | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [kakaoReady, setKakaoReady] = useState(false);
  const [searchResults, setSearchResults] = useState<CampsitePreset[]>(CAMPSITE_PRESETS);
  const [isSearching, setIsSearching] = useState(false);
  const [resetChecks, setResetChecks] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Kakao Maps Places SDK 로드 (도메인 등록 후 재시도 보장)
  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
    if (!appKey) return;

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => setKakaoReady(true));
      return;
    }

    const existing = document.getElementById('kakao-map-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.remove();
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
  }, [visible]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (!visible) return;
    if (hasSchedule) {
      setTitle(checklist.title);
      setStartDate(checklist.target_date || '');
      setEndDate(checklist.end_date || checklist.target_date || '');
      setDestName(checklist.destination_name || '');
      setDestAddress(checklist.destination_address || '');
      setDestLat(checklist.destination_lat);
      setDestLng(checklist.destination_lng);
    } else {
      setTitle('');
      setStartDate('');
      setEndDate('');
      setDestName('');
      setDestAddress('');
      setDestLat(undefined);
      setDestLng(undefined);
    }
    setSearchQuery('');
    setSearchResults(CAMPSITE_PRESETS);
    setResetChecks(false);
    setErrorMsg('');
  }, [visible, checklist, hasSchedule]);

  // 실시간 통합 검색 (내장 DB + Kakao Places + OpenStreetMap)
  useEffect(() => {
    let cancelled = false;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(CAMPSITE_PRESETS);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const { results } = await searchCampsitesNationwide(q, kakaoReady);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, kakaoReady]);

  // 선택한 날짜 + 캠핑장 위도 기반 예상 기후 미리보기
  const climatePreview = useMemo(
    () =>
      estimateCampingClimate(
        startDate || new Date().toISOString().slice(0, 10),
        destLat ?? 37.5665
      ),
    [startDate, destLat]
  );

  const stayLabel = useMemo(() => {
    if (!startDate) return '날짜 미선택';
    return formatStayDuration(startDate, endDate);
  }, [startDate, endDate]);

  const handleQuickDate = (type: 'THIS_SAT_1N' | 'THIS_FRI_2N' | 'NEXT_SAT_1N') => {
    const now = new Date();
    const day = now.getDay();
    const daysUntilSat = (6 - day + 7) % 7 || 7;

    const sat = new Date(now);
    sat.setDate(now.getDate() + daysUntilSat);

    if (type === 'THIS_SAT_1N') {
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      setStartDate(toDateInputValue(sat));
      setEndDate(toDateInputValue(sun));
    } else if (type === 'THIS_FRI_2N') {
      const fri = new Date(sat);
      fri.setDate(sat.getDate() - 1);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      setStartDate(toDateInputValue(fri));
      setEndDate(toDateInputValue(sun));
    } else if (type === 'NEXT_SAT_1N') {
      const nextSat = new Date(sat);
      nextSat.setDate(sat.getDate() + 7);
      const nextSun = new Date(nextSat);
      nextSun.setDate(nextSat.getDate() + 1);
      setStartDate(toDateInputValue(nextSat));
      setEndDate(toDateInputValue(nextSun));
    }
    setErrorMsg('');
  };

  const handleSelectCampsite = (preset: CampsitePreset) => {
    if (destName === preset.name) {
      setDestName('');
      setDestAddress('');
      setDestLat(undefined);
      setDestLng(undefined);
      return;
    }
    setDestName(preset.name);
    setDestAddress(preset.address);
    setDestLat(preset.lat);
    setDestLng(preset.lng);
    setTitle(`${preset.region} ${preset.name} 캠핑`);
    setSearchQuery('');
    setErrorMsg('');
  };

  const handleApplyCustomQuery = () => {
    const q = searchQuery.trim();
    if (!q) return;
    const firstMatch = searchResults[0];
    if (firstMatch && firstMatch.name.toLowerCase().includes(q.toLowerCase())) {
      handleSelectCampsite(firstMatch);
      return;
    }
    const formattedName = q.endsWith('캠핑장') || q.endsWith('야영장') ? q : `${q} 캠핑장`;
    setDestName(formattedName);
    setDestAddress('사용자 지정 캠핑장');
    setDestLat(37.8142);
    setDestLng(127.4885);
    setTitle(`${formattedName} 캠핑`);
    setSearchQuery('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate && !destName.trim()) {
      setErrorMsg('출발 날짜 또는 목적지 캠핑장 중 최소 하나를 선택해 주세요.');
      return;
    }

    onSave({
      title:
        title.trim() ||
        (destName.trim() ? `${destName.trim()} 캠핑` : `${startDate} 캠핑 일정`),
      target_date: startDate,
      end_date: endDate && endDate >= startDate ? endDate : startDate,
      destination_name: destName.trim(),
      destination_address: destAddress,
      destination_lat: destLat,
      destination_lng: destLng,
      resetChecks,
    });
    onClose();
  };

  const handleClear = () => {
    onClearSchedule(resetChecks);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* 모달 헤더 */}
        <div className="bg-forest text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/75 block">
              Camping Schedule & Destination
            </span>
            <h3 className="text-base font-bold mt-0.5">
              {hasSchedule ? '🗓️ 캠핑 일정 & 캠핑장 변경' : '➕ 새 캠핑 일정 & 목적지 설정'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* 모달 본문 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {hasSchedule && (
            <div className="bg-surface rounded-xl p-3 flex items-center justify-between border border-gray-200/70">
              <div>
                <p className="text-xs font-bold text-gray-800">📌 현재 설정된 일정이 있습니다</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  일정/캠핑장 선택을 모두 해제하려면 우측 비우기를 누르세요.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 ml-2 bg-white hover:bg-aid-red hover:text-white text-aid-red border border-aid-red/30 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                🗑️ 일정 비우기
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="bg-aid-red/10 border border-aid-red/30 text-aid-red text-xs font-bold px-3 py-2 rounded-xl">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. 날짜 선택 섹션 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <span>📅 캠핑 날짜 선택</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    startDate
                      ? 'text-forest bg-forest/10'
                      : 'text-gray-400 bg-gray-100'
                  }`}
                >
                  {stayLabel}
                </span>
                {startDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-[10px] text-gray-400 hover:text-aid-red underline"
                  >
                    날짜해제
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => handleQuickDate('THIS_SAT_1N')}
                className="shrink-0 text-[11px] font-bold bg-surface hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                ⚡ 이번 주말 (1박 2일)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('THIS_FRI_2N')}
                className="shrink-0 text-[11px] font-bold bg-surface hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                🔥 이번 금~일 (2박 3일)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('NEXT_SAT_1N')}
                className="shrink-0 text-[11px] font-bold bg-surface hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                ⛺ 다음 주말 (1박 2일)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-semibold text-gray-500 block mb-1">
                  출발일 (체크인)
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartDate(nextStart);
                    if (!endDate || endDate < nextStart) setEndDate(nextStart);
                    setErrorMsg('');
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-forest"
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 block mb-1">
                  복귀일 (체크아웃)
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-forest"
                />
              </div>
            </div>
          </div>

          {/* 2. 캠핑장 검색 및 자동완성 선택 섹션 */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 block">
                📍 목적지 캠핑장 검색 (자동완성)
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    kakaoReady
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {kakaoReady ? '🟢 카카오 전국검색 연동됨' : '🟡 내장DB + 오픈맵 검색중'}
                </span>
                {destName && (
                  <button
                    type="button"
                    onClick={() => {
                      setDestName('');
                      setDestAddress('');
                      setDestLat(undefined);
                      setDestLng(undefined);
                    }}
                    className="text-[10px] text-gray-400 hover:text-aid-red underline"
                  >
                    선택해제
                  </button>
                )}
              </div>
            </div>

            {destName ? (
              <div className="bg-forest/5 border border-forest/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-forest block">✓ 선택된 목적지</span>
                  <p className="text-sm font-extrabold text-gray-900 mt-0.5">{destName}</p>
                  {destAddress && (
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[230px]">
                      {destAddress}
                    </p>
                  )}
                </div>
                <span className="text-lg">🏕️</span>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-2.5 text-center">
                <p className="text-xs font-bold text-gray-500">
                  아직 선택된 캠핑장이 없습니다
                </p>
              </div>
            )}

            {/* 캠핑장 검색 입력창 */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyCustomQuery();
                  }
                }}
                placeholder="캠핑장 이름·지역·초성 입력 (예: 캠핑장, 가평, ㅎㅊ)"
                className="w-full border-2 border-forest/40 rounded-xl pl-3 pr-20 py-2.5 text-xs font-medium focus:outline-none focus:border-forest"
              />
              {searchQuery && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600 text-xs px-1"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomQuery}
                    className="bg-forest text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                  >
                    직접적용
                  </button>
                </div>
              )}
            </div>

            {/* 자동완성 결과 리스트 */}
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-xl p-1.5 bg-gray-50/50">
              <div className="flex items-center justify-between px-1.5 py-0.5">
                <span className="text-[10px] font-bold text-gray-400">
                  {isSearching
                    ? `⏳ '${searchQuery}' 전국 검색 중...`
                    : searchQuery.trim()
                    ? `🔍 '${searchQuery}' 검색 결과 (${searchResults.length}건)`
                    : `🏕️ 추천 캠핑장 (${searchResults.length}곳)`}
                </span>
              </div>

              {searchResults.map((preset) => {
                const isSelected = destName === preset.name;
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleSelectCampsite(preset)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-forest text-white border-forest shadow-xs'
                        : 'bg-white hover:border-forest/50 text-gray-800 border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-surface text-forest'
                          }`}
                        >
                          {preset.region}
                        </span>
                        <span className="text-xs font-bold">{preset.name}</span>
                      </div>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-white/80' : 'text-gray-400'
                        }`}
                      >
                        {preset.address}
                      </p>
                    </div>
                    <span className="text-xs font-bold shrink-0">
                      {isSelected ? '선택됨 ✓' : '선택'}
                    </span>
                  </button>
                );
              })}

              {/* 검색어를 직접 캠핑장으로 추가하는 자동완성 항목 */}
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={handleApplyCustomQuery}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-forest bg-forest/5 hover:bg-forest/10 text-forest transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-extrabold">
                      ➕ &ldquo;{searchQuery.trim()}&rdquo; 캠핑장으로 바로 선택하기
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      목록에 없는 사설/노지 캠핑장도 그대로 등록할 수 있어요
                    </p>
                  </div>
                  <span className="text-xs font-bold">적용 →</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. 캠핑 일정 제목 */}
          <div className="space-y-1 pt-1 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-800 block">
              ✏️ 캠핑 일정 제목 (선택)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="미입력 시 선택한 캠핑장/날짜로 자동 생성됩니다"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-forest"
            />
          </div>

          {/* 4. 연동 미리보기 박스 */}
          {(startDate || destName) && (
            <div className="bg-surface rounded-2xl p-3.5 border border-gray-200/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-forest uppercase">
                  ⚡ 설정 시 자동 연동 미리보기
                </span>
                <p className="text-xs font-bold text-gray-800">
                  {climatePreview.seasonLabel} · AI 추천 준비물 & 인근 주유소 갱신
                </p>
                <p className="text-[11px] text-gray-500">
                  {destName ? `${destName} 기준 반경 주유소 매칭` : '날짜만 먼저 등록 (캠핑장 미정)'}
                </p>
              </div>
              <div className="text-right bg-white px-3 py-1.5 rounded-xl border border-gray-100 shrink-0">
                <span className="text-[10px] text-gray-400 block">예상 최저</span>
                <span
                  className={`text-sm font-extrabold ${
                    climatePreview.minTemp < 0 ? 'text-aid-red' : 'text-forest'
                  }`}
                >
                  {climatePreview.minTemp}℃ {climatePreview.weatherIcon}
                </span>
              </div>
            </div>
          )}

          {/* 5. 체크리스트 초기화 옵션 */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={resetChecks}
              onChange={(e) => setResetChecks(e.target.checked)}
              className="w-4 h-4 accent-forest rounded"
            />
            <span className="text-xs text-gray-600 font-medium">
              새로운 캠핑 준비를 위해 체크 완료 항목 모두 초기화하기
            </span>
          </label>

          {/* 하단 액션 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              닫기
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-xs font-bold text-white bg-forest hover:bg-forest-600 rounded-xl shadow-md transition-colors"
            >
              {hasSchedule ? '변경사항 저장' : '선택한 일정 적용하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
