import type { UserGear } from '../types';

export const mockGear: UserGear[] = [
  {
    gear_id: 'g_sample_tent',
    user_id: 'user_local',
    gear_name: '거실형 가족 텐트',
    category: 'TENT',
    purchase_price: 580000,
    season_tags: ['SPRING', 'AUTUMN', 'WINTER'],
    custom_memo: '등록 예시용 샘플입니다. 수정하거나 삭제 후 내 텐트를 등록해 보세요!',
    created_at: '2025-10-15T09:00:00Z',
  },
  {
    gear_id: 'g_sample_sleeping',
    user_id: 'user_local',
    gear_name: '동계용 침낭 (-10℃)',
    category: 'SLEEPING',
    purchase_price: 250000,
    season_tags: ['AUTUMN', 'WINTER'],
    custom_memo: '등록 예시용 샘플입니다. 보유 중인 침낭 가격과 메모로 수정할 수 있어요.',
    created_at: '2025-10-16T09:00:00Z',
  },
  {
    gear_id: 'g_sample_lantern',
    user_id: 'user_local',
    gear_name: 'LED 메인 랜턴',
    category: 'LIGHTING',
    purchase_price: 65000,
    season_tags: ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'],
    custom_memo: '등록 예시용 샘플입니다. 필요 없으면 우측 [삭제]를 눌러 지워주세요.',
    created_at: '2025-10-17T09:00:00Z',
  },
];
