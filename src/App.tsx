import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import AppHeader from './components/layout/AppHeader';
import BottomNav from './components/layout/BottomNav';
import Toast from './components/ui/Toast';
import TripSetupModal from './components/modals/TripSetupModal';
import SettingsModal from './components/modals/SettingsModal';
import HomePage from './pages/HomePage';
import ChecklistPage from './pages/ChecklistPage';
import MapPage from './pages/MapPage';
import GearPage from './pages/GearPage';
import { useChecklist } from './hooks/useChecklist';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mockStations } from './data/mockStations';
import { mockGear } from './data/mockGear';
import { mockChecklist } from './data/mockChecklist';
import type { UserGear, AppSettings, CampingChecklist } from './types';
import { DEFAULT_APP_SETTINGS } from './types';

type Tab = 'home' | 'checklist' | 'map' | 'gear';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showTripSetupModal, setShowTripSetupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'campaid_settings',
    DEFAULT_APP_SETTINGS
  );

  const {
    checklist,
    setChecklist,
    hasSchedule,
    toggleItem,
    addItem,
    addAiRecommendedItem,
    deleteItem,
    resetAllChecks,
    restoreDefaultItems,
    customDefaultItems,
    hasCustomDefault,
    saveCurrentAsDefault,
    clearCustomDefault,
    updateSchedule,
    clearSchedule,
    progress,
    toastVisible,
    dismissToast,
  } = useChecklist({
    enableKeroseneToast: settings.enableKeroseneToast,
    nickname: settings.nickname,
  });

  const [userGear, setUserGear] = useLocalStorage<UserGear[]>('campaid_user_gear', mockGear);

  // 이전 버전의 기본 8종 샘플 장비(g001~g008)만 그대로 남아있을 경우 3종 샘플(텐트·침낭·랜턴)로 자동 업그레이드
  useEffect(() => {
    const legacyIds = new Set(['g001', 'g002', 'g003', 'g004', 'g005', 'g006', 'g007', 'g008']);
    if (userGear.length > 0 && userGear.every((g) => legacyIds.has(g.gear_id))) {
      setUserGear(mockGear);
    }
  }, [userGear, setUserGear]);

  const handleAddGear = (newGear: Omit<UserGear, 'gear_id' | 'user_id' | 'created_at'>) => {
    const item: UserGear = {
      ...newGear,
      gear_id: `g_${Date.now()}`,
      user_id: 'user_local',
      created_at: new Date().toISOString(),
    };
    setUserGear((prev) => [item, ...prev]);
  };

  const handleUpdateGear = (
    gearId: string,
    updatedGear: Omit<UserGear, 'gear_id' | 'user_id' | 'created_at'>
  ) => {
    setUserGear((prev) =>
      prev.map((g) => (g.gear_id === gearId ? { ...g, ...updatedGear } : g))
    );
  };

  const handleDeleteGear = (gearId: string) => {
    setUserGear((prev) => prev.filter((g) => g.gear_id !== gearId));
  };

  const handleRestoreBackup = (data: {
    checklist?: CampingChecklist;
    userGear?: UserGear[];
    settings?: AppSettings;
  }) => {
    if (data.checklist) {
      setChecklist(data.checklist);
    }
    if (Array.isArray(data.userGear)) {
      setUserGear(data.userGear);
    }
    if (data.settings) {
      setSettings(data.settings);
    }
  };

  const handleFactoryReset = () => {
    setChecklist(mockChecklist);
    setUserGear(mockGear);
    setSettings(DEFAULT_APP_SETTINGS);
    clearCustomDefault();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827]">
      <AppHeader
        onOpenTripSetup={() => setShowTripSetupModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <main>
        {activeTab === 'home' && (
          <HomePage
            checklist={checklist}
            hasSchedule={hasSchedule}
            progress={progress}
            stations={mockStations}
            defaultSearchRadiusKm={settings.defaultSearchRadiusKm}
            onGoChecklist={() => setActiveTab('checklist')}
            onGoMap={() => setActiveTab('map')}
            onOpenTripSetup={() => setShowTripSetupModal(true)}
            onClearSchedule={clearSchedule}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistPage
            checklist={checklist}
            hasSchedule={hasSchedule}
            progress={progress}
            userGear={userGear}
            onToggleItem={toggleItem}
            onAddItem={addItem}
            onAddAiItem={addAiRecommendedItem}
            onDeleteItem={deleteItem}
            onResetAllChecks={resetAllChecks}
            onRestoreDefaultItems={restoreDefaultItems}
            onOpenTripSetup={() => setShowTripSetupModal(true)}
          />
        )}

        {activeTab === 'map' && (
          <MapPage
            initialStations={mockStations}
            hasSchedule={hasSchedule}
            destinationName={checklist.destination_name}
            destinationAddress={checklist.destination_address}
            destinationLat={checklist.destination_lat}
            destinationLng={checklist.destination_lng}
            defaultSearchRadiusKm={settings.defaultSearchRadiusKm}
            onOpenTripSetup={() => setShowTripSetupModal(true)}
          />
        )}

        {activeTab === 'gear' && (
          <GearPage
            gearList={userGear}
            nickname={settings.nickname}
            camperTitle={settings.camperTitle}
            onAddGear={handleAddGear}
            onUpdateGear={handleUpdateGear}
            onDeleteGear={handleDeleteGear}
          />
        )}
      </main>

      {/* 캠핑 일정 & 목적지 캠핑장 설정 모달 */}
      <TripSetupModal
        visible={showTripSetupModal}
        checklist={checklist}
        hasSchedule={hasSchedule}
        onClose={() => setShowTripSetupModal(false)}
        onSave={updateSchedule}
        onClearSchedule={clearSchedule}
      />

      {/* 앱 환경설정 & 데이터 관리 모달 */}
      <SettingsModal
        visible={showSettingsModal}
        settings={settings}
        checklist={checklist}
        userGear={userGear}
        hasCustomDefault={hasCustomDefault}
        customDefaultCount={customDefaultItems?.length ?? 0}
        onClose={() => setShowSettingsModal(false)}
        onUpdateSettings={setSettings}
        onSaveCurrentAsDefault={saveCurrentAsDefault}
        onClearCustomDefault={clearCustomDefault}
        onRestoreDefaultChecklist={restoreDefaultItems}
        onRestoreBackup={handleRestoreBackup}
        onFactoryReset={handleFactoryReset}
        onResetGear={() => setUserGear(mockGear)}
      />

      {/* §5.3 유기적 UX 인터랙션: 난로/등유통 체크 시 4초간 스낵바 노출 */}
      <Toast
        visible={toastVisible}
        onDismiss={dismissToast}
        onNavigateToMap={() => setActiveTab('map')}
      />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      <Analytics />
    </div>
  );
}
