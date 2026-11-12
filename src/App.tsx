import { useState } from 'react';
import AppHeader from './components/layout/AppHeader';
import BottomNav from './components/layout/BottomNav';
import Toast from './components/ui/Toast';
import TripSetupModal from './components/modals/TripSetupModal';
import HomePage from './pages/HomePage';
import ChecklistPage from './pages/ChecklistPage';
import MapPage from './pages/MapPage';
import GearPage from './pages/GearPage';
import { useChecklist } from './hooks/useChecklist';
import { useLocalStorage } from './hooks/useLocalStorage';
import { mockStations } from './data/mockStations';
import { mockGear } from './data/mockGear';
import type { UserGear } from './types';

type Tab = 'home' | 'checklist' | 'map' | 'gear';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showTripSetupModal, setShowTripSetupModal] = useState(false);

  const {
    checklist,
    hasSchedule,
    toggleItem,
    addItem,
    addAiRecommendedItem,
    updateSchedule,
    clearSchedule,
    progress,
    toastVisible,
    dismissToast,
  } = useChecklist();

  const [userGear, setUserGear] = useLocalStorage<UserGear[]>('campaid_user_gear', mockGear);

  const handleAddGear = (newGear: Omit<UserGear, 'gear_id' | 'user_id' | 'created_at'>) => {
    const item: UserGear = {
      ...newGear,
      gear_id: `g_${Date.now()}`,
      user_id: 'user_local',
      created_at: new Date().toISOString(),
    };
    setUserGear((prev) => [item, ...prev]);
  };

  const handleDeleteGear = (gearId: string) => {
    setUserGear((prev) => prev.filter((g) => g.gear_id !== gearId));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827]">
      <AppHeader onOpenTripSetup={() => setShowTripSetupModal(true)} />

      <main>
        {activeTab === 'home' && (
          <HomePage
            checklist={checklist}
            hasSchedule={hasSchedule}
            progress={progress}
            stations={mockStations}
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
            onOpenTripSetup={() => setShowTripSetupModal(true)}
          />
        )}

        {activeTab === 'gear' && (
          <GearPage
            gearList={userGear}
            onAddGear={handleAddGear}
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

      {/* §5.3 유기적 UX 인터랙션: 난로/등유통 체크 시 4초간 스낵바 노출 */}
      <Toast
        visible={toastVisible}
        onDismiss={dismissToast}
        onNavigateToMap={() => setActiveTab('map')}
      />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
