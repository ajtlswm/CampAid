import { useState, useMemo } from 'react';
import type { CampingChecklist, GearCategory, UserGear } from '../types';
import { CATEGORY_LABELS } from '../types';
import ProgressBar from '../components/ui/ProgressBar';
import {
  estimateCampingClimate,
  formatStayDuration,
  getSeasonalRecommendations,
} from '../data/campsitePresets';

interface ChecklistPageProps {
  checklist: CampingChecklist;
  hasSchedule: boolean;
  progress: number;
  userGear: UserGear[];
  onToggleItem: (itemId: string) => void;
  onAddItem: (name: string, category: GearCategory) => void;
  onAddAiItem: (name: string, category: GearCategory) => void;
  onOpenTripSetup: () => void;
}

const CATEGORIES: GearCategory[] = ['WINTER_AID', 'TENT', 'COOKING', 'SLEEPING', 'LIGHTING', 'ETC'];

export default function ChecklistPage({
  checklist,
  hasSchedule,
  progress,
  userGear,
  onToggleItem,
  onAddItem,
  onAddAiItem,
  onOpenTripSetup,
}: ChecklistPageProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    WINTER_AID: true,
    TENT: true,
    COOKING: true,
    SLEEPING: true,
    LIGHTING: true,
    ETC: true,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGearImportModal, setShowGearImportModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GearCategory>('WINTER_AID');
  const [copiedInvite, setCopiedInvite] = useState(false);

  const climate = useMemo(
    () =>
      estimateCampingClimate(
        hasSchedule ? checklist.target_date : new Date().toISOString().slice(0, 10),
        hasSchedule ? checklist.destination_lat : 37.5665
      ),
    [hasSchedule, checklist.target_date, checklist.destination_lat]
  );

  const recommendations = useMemo(
    () => getSeasonalRecommendations(climate.season),
    [climate.season]
  );

  const stayDuration = formatStayDuration(checklist.target_date, checklist.end_date);

  const toggleAccordion = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleCopyInvite = () => {
    const shareUrl = `${window.location.origin}/?invite=${checklist.invite_code}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem(newItemName.trim(), newItemCategory);
    setNewItemName('');
    setShowAddModal(false);
  };

  return (
    <div className="page-content px-4 pt-4 space-y-4 max-w-md mx-auto">
      {/* 2.1 체크리스트 상세 헤더 (일정 있을 때 vs 일정 없을 때) */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {hasSchedule ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={onOpenTripSetup}
                  className="text-[11px] font-bold text-forest bg-forest/10 hover:bg-forest hover:text-white px-2.5 py-0.5 rounded-full transition-colors flex items-center gap-1"
                >
                  <span>📍 {checklist.destination_name}</span>
                  <span>✏️</span>
                </button>
                <span className="text-[11px] font-bold text-aid-red bg-aid-red/10 px-2 py-0.5 rounded-full">
                  {climate.minTemp}℃ {climate.weatherIcon}
                </span>
              </div>

              <h2 className="text-lg font-bold text-gray-900 mt-1.5">{checklist.title}</h2>

              <button
                onClick={onOpenTripSetup}
                className="text-xs text-gray-500 hover:text-forest mt-0.5 flex items-center gap-1 font-medium"
              >
                <span>
                  🗓️ {checklist.target_date}
                  {checklist.end_date && checklist.end_date !== checklist.target_date
                    ? ` ~ ${checklist.end_date}`
                    : ''}{' '}
                  ({stayDuration})
                </span>
                <span className="underline text-forest font-bold ml-1">일정변경</span>
              </button>
            </div>

            <button
              onClick={handleCopyInvite}
              className="shrink-0 bg-forest hover:bg-forest-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1"
            >
              🔗 {copiedInvite ? '복사됨!' : '친구 초대'}
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-surface px-2.5 py-0.5 rounded-full">
                ⛺ 일정 미정 · 상시 체크리스트
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1.5">
                기본 캠핑 준비 체크리스트
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                날짜와 캠핑장을 설정하면 맞춤 기온과 경로 주유소가 연동됩니다.
              </p>
            </div>
            <button
              onClick={onOpenTripSetup}
              className="shrink-0 bg-forest hover:bg-forest-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1"
            >
              🗓️ + 일정 등록
            </button>
          </div>
        )}

        {/* 참여 멤버 프로필 & 초대 코드 */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <span className="w-7 h-7 rounded-full bg-forest text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
                나
              </span>
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
                김
              </span>
              <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
                박
              </span>
            </div>
            <span className="text-xs text-gray-500">캠핑 멤버 3명 공동 작업 중</span>
          </div>
          <button
            onClick={handleCopyInvite}
            className="text-[11px] font-mono text-forest hover:underline font-bold"
          >
            {copiedInvite ? '✓ 링크 복사됨' : `🔗 #${checklist.invite_code}`}
          </button>
        </div>
      </section>

      {/* 2.2 진척도 게이지 & 계절 연동 AI 추천 칩 */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">전체 준비 진척도</span>
          <span className="text-sm font-extrabold text-forest">{progress}%</span>
        </div>
        <ProgressBar progress={progress} />

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-aid-red flex items-center gap-1">
              {climate.weatherIcon}{' '}
              {hasSchedule
                ? `${climate.seasonLabel} (${climate.minTemp}℃) 맞춤 AI 추천`
                : `현재 시즌 (${climate.seasonLabel}) 기본 추천`}
            </span>
            <button
              onClick={() => setShowGearImportModal(true)}
              className="text-[11px] font-bold text-forest underline"
            >
              내 장비고에서 가져오기
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recommendations.map((rec) => {
              const alreadyExists = checklist.items.some((i) =>
                i.item_name.includes(rec.name.split(' ')[0])
              );
              return (
                <button
                  key={rec.name}
                  onClick={() => onAddAiItem(rec.name, rec.category)}
                  disabled={alreadyExists}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1 ${
                    alreadyExists
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'bg-aid-red/10 text-aid-red hover:bg-aid-red hover:text-white font-bold'
                  }`}
                >
                  <span>{alreadyExists ? '✓' : '+'}</span>
                  <span>{rec.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2.3 카테고리별 아코디언 리스트 */}
      <div className="space-y-3">
        {CATEGORIES.map((category) => {
          const catItems = checklist.items.filter((i) => i.category === category);
          if (catItems.length === 0) return null;

          const sortedItems = [...catItems].sort(
            (a, b) => Number(a.is_checked) - Number(b.is_checked)
          );
          const checkedCount = catItems.filter((i) => i.is_checked).length;
          const isOpen = openCategories[category] ?? true;

          return (
            <section
              key={category}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleAccordion(category)}
                className="w-full px-4 py-3.5 flex items-center justify-between bg-surface/60 hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">
                    {CATEGORY_LABELS[category]}
                  </span>
                  {category === 'WINTER_AID' && (
                    <span className="text-[10px] font-bold bg-aid-red text-white px-2 py-0.5 rounded-full">
                      동계필수
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-forest">
                    {checkedCount}/{catItems.length}
                  </span>
                  <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <ul className="divide-y divide-gray-100">
                  {sortedItems.map((item) => (
                    <li
                      key={item.item_id}
                      onClick={() => onToggleItem(item.item_id)}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.is_checked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-forest rounded cursor-pointer"
                        />
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              item.is_checked ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}
                          >
                            {item.item_name}
                          </span>
                          {item.is_ai_recommended && !item.is_checked && (
                            <span className="ml-2 text-[10px] font-bold text-aid-red bg-aid-red/10 px-1.5 py-0.5 rounded">
                              AI 추천
                            </span>
                          )}
                        </div>
                      </div>
                      {item.is_checked && item.checked_by && (
                        <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          ✓ {item.checked_by}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* 2.4 우측 하단 플로팅 추가 버튼 */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-5 z-30 bg-forest hover:bg-forest-600 text-white font-bold text-xs px-4 py-3 rounded-full shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
      >
        <span>➕</span>
        <span>새 준비물 추가</span>
      </button>

      {/* 새 준비물 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-gray-900">➕ 새 준비물 추가</h3>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">카테고리</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as GearCategory)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">준비물 이름</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="예: 파세코 난로, 등유통, 침낭"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-forest rounded-xl"
                >
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 내 장비고에서 가져오기 모달 */}
      {showGearImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">🏕️ 내 장비고에서 가져오기</h3>
              <button
                onClick={() => setShowGearImportModal(false)}
                className="text-gray-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              클릭하면 현재 체크리스트에 즉시 추가됩니다.
            </p>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {userGear.map((g) => {
                const exists = checklist.items.some((i) => i.item_name === g.gear_name);
                return (
                  <div
                    key={g.gear_id}
                    onClick={() => {
                      if (!exists) onAddItem(g.gear_name, g.category);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      exists
                        ? 'bg-gray-50 border-gray-100 text-gray-400'
                        : 'bg-white border-gray-200 cursor-pointer hover:border-forest'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{g.gear_name}</p>
                      <span className="text-[10px] text-gray-400">
                        {CATEGORY_LABELS[g.category]}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-forest">
                      {exists ? '추가됨 ✓' : '+ 담기'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
