import { useState, useMemo } from 'react';
import type { UserGear, GearCategory, SeasonTag } from '../types';
import { CATEGORY_LABELS, SEASON_LABELS } from '../types';

interface GearPageProps {
  gearList: UserGear[];
  onAddGear: (gear: Omit<UserGear, 'gear_id' | 'user_id' | 'created_at'>) => void;
  onDeleteGear: (gearId: string) => void;
}

const FILTER_TABS: { id: 'ALL' | GearCategory; label: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: 'TENT', label: '텐트/타프' },
  { id: 'COOKING', label: '취사' },
  { id: 'SLEEPING', label: '침구' },
  { id: 'WINTER_AID', label: '동계용품' },
  { id: 'LIGHTING', label: '조명' },
  { id: 'ETC', label: '기타' },
];

const ALL_SEASONS: SeasonTag[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

export default function GearPage({ gearList, onAddGear, onDeleteGear }: GearPageProps) {
  const [selectedTab, setSelectedTab] = useState<'ALL' | GearCategory>('ALL');
  const [showModal, setShowModal] = useState(false);

  // 장비 등록 폼 상태
  const [gearName, setGearName] = useState('');
  const [category, setCategory] = useState<GearCategory>('WINTER_AID');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [selectedSeasons, setSelectedSeasons] = useState<SeasonTag[]>(['WINTER']);
  const [customMemo, setCustomMemo] = useState('');

  // 총 자산 합산
  const totalAssetValue = useMemo(
    () => gearList.reduce((acc, g) => acc + (g.purchase_price || 0), 0),
    [gearList]
  );

  const filteredGear = useMemo(() => {
    if (selectedTab === 'ALL') return gearList;
    return gearList.filter((g) => g.category === selectedTab);
  }, [gearList, selectedTab]);

  const toggleSeason = (season: SeasonTag) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearName.trim()) return;

    onAddGear({
      gear_name: gearName.trim(),
      category,
      purchase_price: Number(purchasePrice) || 0,
      season_tags: selectedSeasons.length > 0 ? selectedSeasons : ['WINTER'],
      custom_memo: customMemo.trim() || undefined,
    });

    setGearName('');
    setPurchasePrice('');
    setCustomMemo('');
    setShowModal(false);
  };

  return (
    <div className="page-content px-4 pt-4 space-y-4 max-w-md mx-auto">
      {/* 4.1 프로필 & 내 장비 총 자산 규모 정산 카드 */}
      <section className="bg-forest text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-xl">
              ⛺
            </div>
            <div>
              <p className="text-xs text-white/75">프로 동계 캠퍼</p>
              <h2 className="text-base font-bold">에이드캠퍼님의 장비고</h2>
            </div>
          </div>
          <span className="bg-white/15 text-xs font-bold px-3 py-1 rounded-full">
            보유 {gearList.length}점
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-white/15 flex items-end justify-between">
          <div>
            <p className="text-xs text-white/75">내 장비 총 자산 규모</p>
            <p className="text-2xl font-extrabold tracking-tight mt-0.5">
              {totalAssetValue.toLocaleString()}원
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-aid-red hover:bg-aid-red-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-colors"
          >
            + 새 장비 등록
          </button>
        </div>
      </section>

      {/* 4.2 카테고리 탭 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => {
          const active = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-bold transition-colors ${
                active ? 'bg-forest text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4.2 장비 인벤토리 카드 리스트 */}
      <div className="space-y-3">
        {filteredGear.map((gear) => {
          const isWinter = gear.season_tags.includes('WINTER');
          return (
            <div
              key={gear.gear_id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-surface text-gray-700 px-2 py-0.5 rounded">
                      {CATEGORY_LABELS[gear.category]}
                    </span>
                    {isWinter && (
                      <span className="text-[10px] font-bold bg-aid-red/10 text-aid-red px-2 py-0.5 rounded">
                        #동계필수
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">{gear.gear_name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-forest">
                    {gear.purchase_price > 0
                      ? `${gear.purchase_price.toLocaleString()}원`
                      : '가격 미입력'}
                  </span>
                  <button
                    onClick={() => onDeleteGear(gear.gear_id)}
                    className="block ml-auto mt-1 text-[10px] text-gray-400 hover:text-aid-red"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {gear.custom_memo && (
                <p className="text-xs text-gray-600 bg-surface rounded-xl px-3 py-2">
                  📝 {gear.custom_memo}
                </p>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                {gear.season_tags.map((season) => (
                  <span
                    key={season}
                    className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
                  >
                    #{SEASON_LABELS[season]}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4.3 장비 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-gray-900">⛺ 새 캠핑 장비 등록</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">장비 모델명</label>
                <input
                  type="text"
                  value={gearName}
                  onChange={(e) => setGearName(e.target.value)}
                  placeholder="예: 파세코 캠프-27"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">카테고리</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GearCategory)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    구매 가격 (원)
                  </label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="189000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  사용 계절 (다중 선택)
                </label>
                <div className="flex gap-1.5">
                  {ALL_SEASONS.map((s) => {
                    const active = selectedSeasons.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => toggleSeason(s)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                          active
                            ? 'bg-forest text-white border-forest'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        {SEASON_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">한 줄 메모</label>
                <input
                  type="text"
                  value={customMemo}
                  onChange={(e) => setCustomMemo(e.target.value)}
                  placeholder="예: 등유 7L 완충 시 10시간 가동"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-forest rounded-xl"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
