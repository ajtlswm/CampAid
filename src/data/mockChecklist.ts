import type { CampingChecklist } from '../types';

export const mockChecklist: CampingChecklist = {
  checklist_id: 'cl_002',
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
    // 1. 동계/보온 용품 (WINTER_AID)
    { item_id: 'i001', category: 'WINTER_AID', item_name: '팬히터', is_checked: false, is_ai_recommended: true },
    { item_id: 'i002', category: 'WINTER_AID', item_name: '등유난로', is_checked: false, is_ai_recommended: false },
    { item_id: 'i003', category: 'WINTER_AID', item_name: '등유통', is_checked: false, is_ai_recommended: true },
    { item_id: 'i004', category: 'WINTER_AID', item_name: '전기장판', is_checked: false, is_ai_recommended: true },
    { item_id: 'i005', category: 'WINTER_AID', item_name: '일산화탄소 경보기', is_checked: false, is_ai_recommended: true },
    { item_id: 'i006', category: 'WINTER_AID', item_name: '전기히터', is_checked: false, is_ai_recommended: false },
    { item_id: 'i007', category: 'WINTER_AID', item_name: '발포매트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i008', category: 'WINTER_AID', item_name: '이동링', is_checked: false, is_ai_recommended: false },
    { item_id: 'i009', category: 'WINTER_AID', item_name: '핫팩', is_checked: false, is_ai_recommended: false },
    { item_id: 'i010', category: 'WINTER_AID', item_name: '가습기', is_checked: false, is_ai_recommended: false },

    // 2. 텐트 / 타프 (TENT)
    { item_id: 'i011', category: 'TENT', item_name: '텐트 (거실형)', is_checked: false, is_ai_recommended: false },
    { item_id: 'i012', category: 'TENT', item_name: '이너텐트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i013', category: 'TENT', item_name: '그라운드시트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i014', category: 'TENT', item_name: '타프', is_checked: false, is_ai_recommended: false },
    { item_id: 'i015', category: 'TENT', item_name: '팩', is_checked: false, is_ai_recommended: false },
    { item_id: 'i016', category: 'TENT', item_name: '팩망치', is_checked: false, is_ai_recommended: false },
    { item_id: 'i017', category: 'TENT', item_name: '폴대', is_checked: false, is_ai_recommended: false },

    // 3. 취사 / 주방 (COOKING)
    { item_id: 'i018', category: 'COOKING', item_name: '버너 (캠핑용)', is_checked: false, is_ai_recommended: false },
    { item_id: 'i019', category: 'COOKING', item_name: '코펠 세트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i020', category: 'COOKING', item_name: '이소가스', is_checked: false, is_ai_recommended: false },
    { item_id: 'i021', category: 'COOKING', item_name: '부탄가스', is_checked: false, is_ai_recommended: false },
    { item_id: 'i022', category: 'COOKING', item_name: '양념', is_checked: false, is_ai_recommended: false },
    { item_id: 'i023', category: 'COOKING', item_name: '수저/젓가락 세트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i024', category: 'COOKING', item_name: '집게', is_checked: false, is_ai_recommended: false },
    { item_id: 'i025', category: 'COOKING', item_name: '가위', is_checked: false, is_ai_recommended: false },
    { item_id: 'i026', category: 'COOKING', item_name: '주걱', is_checked: false, is_ai_recommended: false },
    { item_id: 'i027', category: 'COOKING', item_name: '컵', is_checked: false, is_ai_recommended: false },

    // 4. 침구 / 수면 (SLEEPING)
    { item_id: 'i028', category: 'SLEEPING', item_name: '침낭', is_checked: false, is_ai_recommended: false },
    { item_id: 'i029', category: 'SLEEPING', item_name: '에어박스', is_checked: false, is_ai_recommended: false },
    { item_id: 'i030', category: 'SLEEPING', item_name: '자충매트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i031', category: 'SLEEPING', item_name: '베개', is_checked: false, is_ai_recommended: false },
    { item_id: 'i032', category: 'SLEEPING', item_name: '세면도구', is_checked: false, is_ai_recommended: false },
    { item_id: 'i033', category: 'SLEEPING', item_name: '수건', is_checked: false, is_ai_recommended: false },

    // 5. 조명 / 전기 (LIGHTING)
    { item_id: 'i034', category: 'LIGHTING', item_name: '메인 랜턴', is_checked: false, is_ai_recommended: false },
    { item_id: 'i035', category: 'LIGHTING', item_name: '서브 랜턴', is_checked: false, is_ai_recommended: false },

    // 6. 기타 용품 (ETC)
    { item_id: 'i036', category: 'ETC', item_name: '전기릴선', is_checked: false, is_ai_recommended: false },
    { item_id: 'i037', category: 'ETC', item_name: '멀티탭', is_checked: false, is_ai_recommended: false },
    { item_id: 'i038', category: 'ETC', item_name: 'USB 충전기/충전선', is_checked: false, is_ai_recommended: false },
    { item_id: 'i039', category: 'ETC', item_name: '써큘레이터', is_checked: false, is_ai_recommended: false },
    { item_id: 'i040', category: 'ETC', item_name: '화로대', is_checked: false, is_ai_recommended: false },
    { item_id: 'i041', category: 'ETC', item_name: '냉장고', is_checked: false, is_ai_recommended: false },
    { item_id: 'i042', category: 'ETC', item_name: '물통', is_checked: false, is_ai_recommended: false },

    // 7. 구매할거 (SHOPPING)
    { item_id: 'i043', category: 'SHOPPING', item_name: '물', is_checked: false, is_ai_recommended: false },
    { item_id: 'i044', category: 'SHOPPING', item_name: '고기', is_checked: false, is_ai_recommended: false },
    { item_id: 'i045', category: 'SHOPPING', item_name: '햇반', is_checked: false, is_ai_recommended: false },
    { item_id: 'i046', category: 'SHOPPING', item_name: '밀키트', is_checked: false, is_ai_recommended: false },
    { item_id: 'i047', category: 'SHOPPING', item_name: '컵라면', is_checked: false, is_ai_recommended: false },
  ],
};
