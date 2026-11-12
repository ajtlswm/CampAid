import { useState, useCallback } from 'react';
import type { CampingChecklist, ChecklistItem, GearCategory } from '../types';
import { KEROSENE_KEYWORDS } from '../types';
import { mockChecklist } from '../data/mockChecklist';
import { useLocalStorage } from './useLocalStorage';

export interface UpdateScheduleParams {
  title: string;
  target_date: string;
  end_date?: string;
  destination_name: string;
  destination_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  resetChecks?: boolean;
}

export function useChecklist(onKeroseneDetected?: () => void) {
  const [checklist, setChecklist] = useLocalStorage<CampingChecklist>(
    'campaid_checklist',
    mockChecklist
  );
  const [toastVisible, setToastVisible] = useState(false);

  const hasSchedule = Boolean(
    checklist.has_schedule === true &&
      (checklist.target_date || checklist.destination_name)
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      setChecklist((prev) => {
        const updated = {
          ...prev,
          items: prev.items.map((item) => {
            if (item.item_id !== itemId) return item;
            const newChecked = !item.is_checked;
            if (
              newChecked &&
              KEROSENE_KEYWORDS.some((kw) => item.item_name.includes(kw))
            ) {
              setToastVisible(true);
              onKeroseneDetected?.();
            }
            return { ...item, is_checked: newChecked, checked_by: newChecked ? '나' : undefined };
          }),
        };
        return updated;
      });
    },
    [setChecklist, onKeroseneDetected]
  );

  const addItem = useCallback(
    (itemName: string, category: GearCategory) => {
      const newItem: ChecklistItem = {
        item_id: `i_${Date.now()}`,
        category,
        item_name: itemName,
        is_checked: false,
        is_ai_recommended: false,
      };
      setChecklist((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    },
    [setChecklist]
  );

  const addAiRecommendedItem = useCallback(
    (itemName: string, category: GearCategory) => {
      if (checklist.items.some((i) => i.item_name === itemName)) return;
      const newItem: ChecklistItem = {
        item_id: `i_ai_${Date.now()}`,
        category,
        item_name: itemName,
        is_checked: false,
        is_ai_recommended: true,
      };
      setChecklist((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    },
    [setChecklist, checklist.items]
  );

  const updateSchedule = useCallback(
    (params: UpdateScheduleParams) => {
      setChecklist((prev) => ({
        ...prev,
        has_schedule: true,
        title:
          params.title.trim() ||
          (params.destination_name ? `${params.destination_name} 캠핑` : '나의 캠핑 일정'),
        target_date: params.target_date,
        end_date: params.end_date,
        destination_name: params.destination_name,
        destination_address: params.destination_address,
        destination_lat: params.destination_lat,
        destination_lng: params.destination_lng,
        items: params.resetChecks
          ? prev.items.map((item) => ({ ...item, is_checked: false, checked_by: undefined }))
          : prev.items,
      }));
    },
    [setChecklist]
  );

  // 일정을 비우고 '일정 미정(기본 모드)' 상태로 완전히 초기화
  const clearSchedule = useCallback(
    (resetChecks = false) => {
      setChecklist((prev) => ({
        ...prev,
        has_schedule: false,
        title: '기본 캠핑 준비 체크리스트',
        target_date: '',
        end_date: '',
        destination_name: '',
        destination_address: '',
        destination_lat: undefined,
        destination_lng: undefined,
        items: resetChecks
          ? prev.items.map((item) => ({ ...item, is_checked: false, checked_by: undefined }))
          : prev.items,
      }));
    },
    [setChecklist]
  );

  const progress = Math.round(
    (checklist.items.filter((i) => i.is_checked).length / checklist.items.length) * 100
  );

  const dismissToast = () => setToastVisible(false);

  return {
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
  };
}
