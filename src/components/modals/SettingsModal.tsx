import { useState, useRef } from 'react';
import type {
  AppSettings,
  CampingChecklist,
  ChecklistItem,
  UserGear,
} from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../types';
import { mockChecklist } from '../../data/mockChecklist';
import { mockGear } from '../../data/mockGear';

interface SettingsModalProps {
  visible: boolean;
  settings: AppSettings;
  checklist: CampingChecklist;
  userGear: UserGear[];
  hasCustomDefault: boolean;
  customDefaultCount: number;
  onClose: () => void;
  onUpdateSettings: (next: AppSettings) => void;
  onSaveCurrentAsDefault: () => void;
  onClearCustomDefault: () => void;
  onRestoreDefaultChecklist: () => void;
  onRestoreBackup: (data: {
    checklist?: CampingChecklist;
    userGear?: UserGear[];
    settings?: AppSettings;
  }) => void;
  onFactoryReset: () => void;
  onResetGear: () => void;
}

const CAMPER_TITLES = [
  '프로 동계 캠퍼',
  '오토캠핑 마니아',
  '감성 캠퍼',
  '가족 캠퍼',
  '미니멀 백패커',
];

export default function SettingsModal({
  visible,
  settings,
  checklist,
  userGear,
  hasCustomDefault,
  customDefaultCount,
  onClose,
  onUpdateSettings,
  onSaveCurrentAsDefault,
  onClearCustomDefault,
  onRestoreDefaultChecklist,
  onRestoreBackup,
  onFactoryReset,
  onResetGear,
}: SettingsModalProps) {
  const [nickname, setNickname] = useState(settings.nickname);
  const [camperTitle, setCamperTitle] = useState(settings.camperTitle);
  const [radiusKm, setRadiusKm] = useState<5 | 10 | 15>(settings.defaultSearchRadiusKm);
  const [enableToast, setEnableToast] = useState(settings.enableKeroseneToast);

  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!visible) return null;

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // 프로필 & 옵션 즉시 저장
  const handleSaveProfileAndOptions = () => {
    onUpdateSettings({
      nickname: nickname.trim() || DEFAULT_APP_SETTINGS.nickname,
      camperTitle: camperTitle.trim() || DEFAULT_APP_SETTINGS.camperTitle,
      defaultSearchRadiusKm: radiusKm,
      enableKeroseneToast: enableToast,
    });
    showNotice('✓ 프로필 및 환경설정이 저장되었습니다.');
  };

  // 백업 데이터 페이로드 생성
  const createBackupPayload = () => ({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings: {
      nickname: nickname.trim() || settings.nickname,
      camperTitle: camperTitle.trim() || settings.camperTitle,
      defaultSearchRadiusKm: radiusKm,
      enableKeroseneToast: enableToast,
    },
    checklist,
    userGear,
  });

  // 1-A. 클립보드로 백업 코드 복사
  const handleCopyBackupCode = async () => {
    try {
      const jsonStr = JSON.stringify(createBackupPayload());
      const encoded = btoa(encodeURIComponent(jsonStr));
      await navigator.clipboard.writeText(encoded);
      showNotice('📋 백업 코드가 복사되었습니다! 카톡 나에게 보내기로 다른 기기에 전달하세요.');
    } catch {
      showNotice('클립보드 복사에 실패했습니다. JSON 파일 다운로드를 이용해 주세요.', 'error');
    }
  };

  // 1-B. 백업 코드 붙여넣기 복원
  const handleRestoreFromCode = () => {
    const raw = backupCodeInput.trim();
    if (!raw) {
      showNotice('복원할 백업 코드를 입력해 주세요.', 'error');
      return;
    }
    try {
      const decodedStr = raw.startsWith('{')
        ? raw
        : decodeURIComponent(atob(raw));
      const parsed = JSON.parse(decodedStr);
      if (!parsed.checklist && !parsed.userGear) {
        throw new Error('Invalid backup format');
      }
      onRestoreBackup({
        checklist: parsed.checklist,
        userGear: parsed.userGear,
        settings: parsed.settings,
      });
      if (parsed.settings) {
        setNickname(parsed.settings.nickname || DEFAULT_APP_SETTINGS.nickname);
        setCamperTitle(parsed.settings.camperTitle || DEFAULT_APP_SETTINGS.camperTitle);
        setRadiusKm(parsed.settings.defaultSearchRadiusKm || 10);
        setEnableToast(parsed.settings.enableKeroseneToast ?? true);
      }
      setBackupCodeInput('');
      setShowPasteBox(false);
      showNotice('🎉 백업 데이터가 성공적으로 복원되었습니다!');
    } catch {
      showNotice('올바르지 않은 백업 코드입니다. 다시 확인해 주세요.', 'error');
    }
  };

  // 1-C. JSON 백업 파일 다운로드
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(createBackupPayload(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `campaid-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('⬇️ 백업 JSON 파일이 다운로드되었습니다.');
  };

  // 1-D. JSON 백업 파일 불러오기
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed.checklist && !parsed.userGear) {
          throw new Error('Invalid file');
        }
        onRestoreBackup({
          checklist: parsed.checklist,
          userGear: parsed.userGear,
          settings: parsed.settings,
        });
        showNotice('🎉 JSON 백업 파일에서 데이터가 복원되었습니다!');
      } catch {
        showNotice('유효한 CampAid 백업 JSON 파일이 아닙니다.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasKakaoKey = Boolean(import.meta.env.VITE_KAKAO_MAP_APP_KEY);
  const hasOpinetKey = Boolean(import.meta.env.VITE_OPINET_API_KEY);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* 헤더 */}
        <div className="bg-forest text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/75 block">
              App Preferences & Data Management
            </span>
            <h3 className="text-base font-bold mt-0.5">⚙️ 캠프에이드 환경설정 & 데이터 관리</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* 알림 배너 */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 ${
              statusMessage.type === 'error'
                ? 'bg-aid-red text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 본문 스크롤 영역 */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* 1. 데이터 백업 & 기기 간 옮기기 */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                <span>💾 1. 데이터 백업 & 기기 간 옮기기 (PC ↔ 스마트폰)</span>
              </h4>
              <span className="text-[10px] font-bold text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                Lv.1 로컬 저장소
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              내가 정리한 체크리스트({checklist.items.length}개)와 장비고({userGear.length}점)를 코드로 복사해 카카오톡 &lsquo;나에게 보내기&rsquo;로 다른 기기에 그대로 옮길 수 있습니다.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyBackupCode}
                className="bg-forest hover:bg-forest-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>📋</span>
                <span>백업 코드 복사</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteBox((p) => !p)}
                className="bg-surface hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>📥</span>
                <span>백업 코드 붙여넣기</span>
              </button>
            </div>

            {showPasteBox && (
              <div className="bg-surface rounded-xl p-3 space-y-2 border border-gray-200">
                <textarea
                  value={backupCodeInput}
                  onChange={(e) => setBackupCodeInput(e.target.value)}
                  placeholder="복사한 백업 코드를 여기에 붙여넣으세요..."
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-forest"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteBox(false);
                      setBackupCodeInput('');
                    }}
                    className="text-xs font-bold text-gray-500 px-3 py-1.5 rounded-lg bg-white border border-gray-200"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreFromCode}
                    className="text-xs font-bold text-white px-3.5 py-1.5 rounded-lg bg-forest"
                  >
                    즉시 복원하기
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleDownloadJson}
                className="text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2 rounded-xl flex items-center justify-center gap-1"
              >
                <span>⬇️</span>
                <span>JSON 파일 저장</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 py-2 rounded-xl flex items-center justify-center gap-1"
              >
                <span>⬆️</span>
                <span>JSON 파일 불러오기</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </div>
          </section>

          {/* 2. 나만의 기본 체크리스트 저장 */}
          <section className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-gray-900">
                📋 2. 나만의 기본 체크리스트 템플릿 설정
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  hasCustomDefault
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {hasCustomDefault
                  ? `커스텀 기본값 (${customDefaultCount}개)`
                  : `앱 기본값 (${mockChecklist.items.length}개)`}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              현재 체크리스트의 준비물 구성을 &lsquo;내 기본 목록&rsquo;으로 저장해 두면, 체크리스트 탭에서 [기본 목록 복원]을 눌렀을 때 내 맞춤 목록으로 초기화됩니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onSaveCurrentAsDefault();
                  showNotice(
                    `📌 현재 준비물(${checklist.items.length}개)이 내 기본 체크리스트로 저장되었습니다!`
                  );
                }}
                className="flex-1 bg-forest/10 hover:bg-forest hover:text-white text-forest text-xs font-bold py-2.5 px-3 rounded-xl transition-colors"
              >
                📌 현재 구성을 내 기본값으로 저장 ({checklist.items.length}개)
              </button>
              {hasCustomDefault && (
                <button
                  type="button"
                  onClick={() => {
                    onClearCustomDefault();
                    showNotice('🔄 앱 초기 47개 기본 준비물 목록으로 되돌렸습니다.');
                  }}
                  className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </section>

          {/* 3. 내 캠퍼 프로필 커스텀 */}
          <section className="space-y-2.5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-extrabold text-gray-900">
              👤 3. 내 캠퍼 프로필 설정
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  캠퍼 닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="에이드캠퍼"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-forest"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  캠핑 스타일 칭호
                </label>
                <input
                  type="text"
                  value={camperTitle}
                  onChange={(e) => setCamperTitle(e.target.value)}
                  placeholder="프로 동계 캠퍼"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-forest"
                />
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {CAMPER_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCamperTitle(t)}
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                    camperTitle === t
                      ? 'bg-forest text-white border-forest'
                      : 'bg-surface text-gray-600 border-gray-200'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </section>

          {/* 4. 등유 지도 & 알림 옵션 설정 */}
          <section className="space-y-2.5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-extrabold text-gray-900">
              ⛽ 4. 등유 지도 탐색 반경 & 알림 설정
            </h4>
            <div>
              <span className="text-[11px] font-bold text-gray-600 block mb-1.5">
                주유소 기본 탐색 반경
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([5, 10, 15] as const).map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setRadiusKm(km)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      radiusKm === km
                        ? 'bg-forest text-white border-forest shadow-2xs'
                        : 'bg-surface text-gray-600 border-gray-200'
                    }`}
                  >
                    {km === 5 ? '5km (근교)' : km === 10 ? '10km (권장)' : '15km (외곽)'}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between bg-surface rounded-xl px-3 py-2.5 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-gray-800 block">
                  난로·등유통 체크 시 하단 알림창 표시
                </span>
                <span className="text-[10px] text-gray-500">
                  체크리스트에서 온열장비 체크 시 등유 지도 바로가기 스낵바 노출
                </span>
              </div>
              <input
                type="checkbox"
                checked={enableToast}
                onChange={(e) => setEnableToast(e.target.checked)}
                className="w-4 h-4 accent-forest rounded"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveProfileAndOptions}
              className="w-full bg-forest hover:bg-forest-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-colors"
            >
              ✓ 프로필 및 탐색 옵션 저장하기
            </button>
          </section>

          {/* 5. 데이터 초기화 & 연동 상태 확인 */}
          <section className="space-y-2.5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-extrabold text-gray-900">
              🔌 5. 외부 API 연동 상태 & 데이터 초기화
            </h4>
            <div className="bg-surface rounded-xl p-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">카카오맵 & 장소 검색 SDK</span>
                <span className="font-bold text-emerald-700">
                  {hasKakaoKey ? '🟢 정상 연동됨' : '⚪ 미설정'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">오피넷(Opinet) 실내등유 가격 API</span>
                <span className="font-bold text-emerald-700">
                  {hasOpinetKey ? '🟢 정상 연동됨' : '⚪ 미설정'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Open-Meteo 실시간 기상예보</span>
                <span className="font-bold text-emerald-700">🟢 실시간 연동됨 (16일 예보)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onRestoreDefaultChecklist();
                  showNotice('체크리스트가 기본 준비물 목록으로 초기화되었습니다.');
                }}
                className="py-2 px-3 rounded-xl text-[11px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                🔄 체크리스트 초기화
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetGear();
                  showNotice('장비고가 초기 샘플 장비(8점)로 초기화되었습니다.');
                }}
                className="py-2 px-3 rounded-xl text-[11px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                ⛺ 장비고 초기화
              </button>
            </div>

            {!confirmFactoryReset ? (
              <button
                type="button"
                onClick={() => setConfirmFactoryReset(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-aid-red bg-aid-red/5 hover:bg-aid-red/15 border border-aid-red/25 transition-colors"
              >
                🗑️ 앱 전체 데이터 공장초기화
              </button>
            ) : (
              <div className="bg-aid-red/10 border border-aid-red/30 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-aid-red">
                  ⚠️ 정말 모든 일정·체크리스트·장비고·설정을 초기 상태로 되돌릴까요?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmFactoryReset(false)}
                    className="flex-1 py-2 text-xs font-bold bg-white text-gray-600 rounded-lg border border-gray-200"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFactoryReset();
                      setConfirmFactoryReset(false);
                      showNotice('모든 데이터가 초기 상태로 리셋되었습니다.');
                    }}
                    className="flex-1 py-2 text-xs font-bold bg-aid-red text-white rounded-lg"
                  >
                    전체 초기화 실행
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
export type { ChecklistItem, mockGear };
