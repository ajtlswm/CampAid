import type { CampingChecklist } from '../types';

export const mockChecklist: CampingChecklist = {
  checklist_id: 'cl_001',
  has_schedule: false,
  title: '기본 캠핑 준비 체크리스트',
  target_date: '',
  end_date: '',
  destination_name: '',
  destination_address: '',
  destination_lat: undefined,
  destination_lng: undefined,
  invite_code: 'CAMP-2612',
  items: [
    // 텐트/타프
    { item_id: 'i001', category: 'TENT', item_name: '텐트 (거실형)', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i002', category: 'TENT', item_name: '타프', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i003', category: 'TENT', item_name: '팩/말렛', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i004', category: 'TENT', item_name: '이너텐트 그라운드시트', is_checked: false, checked_by: undefined, is_ai_recommended: false },
    { item_id: 'i005', category: 'TENT', item_name: '랜턴 폴', is_checked: false, checked_by: undefined, is_ai_recommended: false },
    // 취사
    { item_id: 'i006', category: 'COOKING', item_name: '버너 (캠핑용)', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i007', category: 'COOKING', item_name: '코펠 세트', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i008', category: 'COOKING', item_name: '가스 카트리지 (3개)', is_checked: false, checked_by: undefined, is_ai_recommended: false },
    { item_id: 'i009', category: 'COOKING', item_name: '식재료 / 양념', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i010', category: 'COOKING', item_name: '수저/젓가락 세트', is_checked: false, checked_by: undefined, is_ai_recommended: false },
    // 침구
    { item_id: 'i011', category: 'SLEEPING', item_name: '동계 침낭 (-10℃급)', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i012', category: 'SLEEPING', item_name: '에어매트리스', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i013', category: 'SLEEPING', item_name: '핫팩 (10개)', is_checked: false, checked_by: undefined, is_ai_recommended: false },
    { item_id: 'i014', category: 'SLEEPING', item_name: '담요 (추가)', is_checked: false, checked_by: undefined, is_ai_recommended: false },
    // 동계용품
    { item_id: 'i015', category: 'WINTER_AID', item_name: '파세코 팬히터', is_checked: false, checked_by: undefined, is_ai_recommended: true },
    { item_id: 'i016', category: 'WINTER_AID', item_name: '등유통 (10L)', is_checked: false, checked_by: undefined, is_ai_recommended: true },
    { item_id: 'i017', category: 'WINTER_AID', item_name: '일산화탄소 경보기', is_checked: false, checked_by: undefined, is_ai_recommended: true },
    { item_id: 'i018', category: 'WINTER_AID', item_name: '방한화/방한장갑', is_checked: true, checked_by: '나', is_ai_recommended: false },
    { item_id: 'i019', category: 'WINTER_AID', item_name: '핫워터백 (보온물통)', is_checked: false, checked_by: undefined, is_ai_recommended: true },
    { item_id: 'i020', category: 'WINTER_AID', item_name: '뽁뽁이 단열재', is_checked: false, checked_by: undefined, is_ai_recommended: false },
  ],
};
