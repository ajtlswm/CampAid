// ============================================
// 캠프에이드 (CampAid) TypeScript 타입 정의
// 명세서 §4 기반
// ============================================

export type GearCategory = 'TENT' | 'COOKING' | 'SLEEPING' | 'LIGHTING' | 'WINTER_AID' | 'ETC';
export type SeasonTag = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type BrandCode = 'SKE' | 'GSC' | 'HDO' | 'SOL' | 'RTO' | 'ETC';

// § 4.1 등유 주유소
export interface KeroseneStation {
  station_id: string;
  station_name: string;
  brand_code: BrandCode;
  kerosene_price: number;       // 실내등유 리터당 가격 (원)
  latitude: number;             // WGS84 위도
  longitude: number;            // WGS84 경도
  address: string;
  tel_number?: string;
  is_24_hours: boolean;
  has_thin_nozzle?: boolean;    // 얇은 주유건 보유 여부 (캠퍼 제보)
  review_summary?: string;      // 캠퍼 한 줄 팁
}

// § 4.2 유저 장비 인벤토리
export interface UserGear {
  gear_id: string;
  user_id: string;
  gear_name: string;
  category: GearCategory;
  purchase_price: number;       // 미입력 시 0
  season_tags: SeasonTag[];
  custom_memo?: string;
  created_at: string;           // ISO Date String
}

// § 4.3 체크리스트
export interface CampingChecklist {
  checklist_id: string;
  has_schedule?: boolean;       // 캠핑 일정 설정 여부 (false일 경우 '일정 없음' 기본 모드)
  title: string;
  target_date: string;          // 출발일 (YYYY-MM-DD, 일정 없을 시 빈 문자열 가능)
  end_date?: string;            // 복귀일 (YYYY-MM-DD)
  destination_name: string;     // 목적지 캠핑장명 (일정 없을 시 빈 문자열 가능)
  destination_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  invite_code: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  item_id: string;
  category: GearCategory;
  item_name: string;
  is_checked: boolean;
  checked_by?: string;
  is_ai_recommended: boolean;
}

// 인기 캠핑장 프리셋 및 검색 결과 타입
export interface CampsitePreset {
  id: string;
  name: string;
  region: string;
  address: string;
  lat: number;
  lng: number;
  tempOffset: number;           // 서울 기준 기온 보정치 (예: 가평/홍천은 -3℃)
}

// 날씨 정보 (기상청 API or 날짜/지역 기반 시뮬레이션)
export interface WeatherInfo {
  temperature: number;          // 예상 최저 기온 (℃)
  sky_condition: 'CLEAR' | 'CLOUDY' | 'RAINY' | 'SNOWY';
  min_temp: number;
  max_temp: number;
  wind_speed: number;
  location_name: string;
}

// 카테고리 한글 레이블
export const CATEGORY_LABELS: Record<GearCategory, string> = {
  TENT: '텐트/타프',
  COOKING: '취사',
  SLEEPING: '침구',
  LIGHTING: '조명',
  WINTER_AID: '동계용품',
  ETC: '기타',
};

// 계절 한글 레이블
export const SEASON_LABELS: Record<SeasonTag, string> = {
  SPRING: '봄',
  SUMMER: '여름',
  AUTUMN: '가을',
  WINTER: '겨울',
};

// 브랜드 한글 레이블
export const BRAND_LABELS: Record<BrandCode, string> = {
  SKE: 'SK에너지',
  GSC: 'GS칼텍스',
  HDO: 'HD현대오일뱅크',
  SOL: 'S-OIL',
  RTO: '알뜰주유소',
  ETC: '기타',
};

// 등유 키워드 (크로스 트리거용)
export const KEROSENE_KEYWORDS = ['팬히터', '난로', '등유', '등유통', '제리캔'];
