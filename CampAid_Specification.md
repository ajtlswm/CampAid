# 🏕️ 캠프에이드 (CampAid) - Product & Technical Specification

> **문서 목적:** Google Antigravity IDE 에이전트가 프로젝트의 전체 맥락, UI/UX 구조, 데이터 모델 및 외부 API 연동 규격을 이해하고 즉시 프로토타입 및 풀스택 애플리케이션을 빌드할 수 있도록 작성된 마스터 기획 명세서입니다.

---

## 1. 프로젝트 개요 (Project Overview)

* **서비스명:** 캠프에이드 (CampAid)
* **핵심 컨셉:** 캠퍼를 위한 구급상자(Aid Kit) 컨셉의 올인원 캠핑 유틸리티 웹앱
* **핵심 기능 2축:**
  1. **스마트 캠핑 체크리스트:** 계절/날씨 기반 필수 장비 추천, 진척도 게이지, 카카오톡/링크 기반 공동 작업 및 역할 분담
  2. **등유 판매 주유소 지도 검색:** 출발지-목적지(캠핑장) 경로상 주유소 매칭 및 현재 지도 중심 등유 주유소 탐색, 실시간 실내등유 가격 마커 표시
* **수익화 모델 (BM):** 구글 애드센스(웹앱) 및 구글 애드몹(하이브리드 앱 패키징 시 전면/배너/네이티브 광고) 연동 대비 영역 확보
* **권장 기술 스택 (Antigravity 빌드 가이드):**
  * **Frontend:** React (Next.js 또는 Vite) + Tailwind CSS (모바일 퍼스트 반응형 웹앱)
  * **State & Storage:** LocalStorage (초기 MVP 무로그인 지원) 또는 Firebase / Supabase (실시간 체크리스트 동기화 및 장비 인벤토리 저장)
  * **Map & API:** Kakao Maps JavaScript SDK (좌표 변환 내장 기능 활용), 한국석유공사 오피넷(Opinet) 오픈 API, 기상청 단기예보 API

---

## 2. 브랜드 디자인 시스템 (Design System)

에이전트는 프론트엔드 UI 구현 시 아래의 컬러 팔레트와 디자인 토큰을 엄격히 준수합니다.

* **비주얼 무드:** 감성 캠핑 코지 무드(Cozy Mood) + 직관적인 미니멀 유틸리티 대시보드
* **Color Palette:**
  * `Primary (Deep Forest Green)`: `#1E3F20` / `#2C5E3B` (헤더, 활성화된 탭 아이콘, 진행률 게이지 바, 주요 브랜드 요소)
  * `Accent (Aid Red)`: `#FF4D4D` / `#E63946` (디데이 강조, 영하 기온 경고, 최저가 주유소 하이라이트, 미체크 필수 항목)
  * `Background`: `#F8F9FA` (Off-White 전체 배경), `#FFFFFF` (Pure White 카드 배경)
  * `Surface / Secondary`: `#F1F3F5` (날씨 대시보드 및 인포 박스)
  * `Text`: `#111827` (기본 본문), `#6B7280` (보조 설명 및 마이크로 카피)
* **UI 컴포넌트 스타일:**
  * 카드 컴포넌트는 `rounded-2xl` 모서리와 은은한 그림자(`shadow-sm` ~ `shadow-md`)를 적용하여 입체감 부여
  * 모바일 환경에서 한 손 조작(엄지손가락 영역)이 용이하도록 하단 고정 내비게이션 바(Bottom GNB) 채택

---

## 3. 정보 구조도 (IA: Information Architecture)

| Depth 1 (GNB) | Depth 2 (화면/기능) | Depth 3 (상세 요소 및 인터랙션) | 비고 / 연동 |
| :--- | :--- | :--- | :--- |
| **1. 홈 (대시보드)** | 1.1. 상단 헤더 | 설정 버튼, 중앙 로고(`CAMP AID` + 텐트 엠블럼), 알림 아이콘 | 브랜드 컬러(`#1E3F20`) 배경 또는 깔끔한 상단 바 |
| | 1.2. 개인화 캠핑 대시보드 | 다음 캠핑 D-Day (`D-2 to Camping`), 목적지 캠핑장명, 실시간 날씨 및 기온 (`-2℃ 🥶`) | 영하 기온일 경우 텍스트 에이드 레드 강조 |
| | 1.3. 핵심 기능 대형 카드 | **카드 A:** `🎒 내 캠핑 짐 챙기기 (83%)` + 프로그레스 바 + 남은 준비물 요약<br>**카드 B:** `⛽ 가는 길에 등유 주유소 찾기` + 목적지 경로상 최저가 매칭 안내 | 각각 체크리스트 상세, 등유 지도로 즉시 라우팅 |
| | 1.4. 유틸리티/광고 배너 | 실시간 캠핑 팁 롤링 배너 (추후 AdSense/AdMob 네이티브 광고 슬롯) | 하단 GNB 바로 위 배치 |
| **2. 스마트 체크리스트** | 2.1. 체크리스트 상세 | 캠핑 일정 헤더, 참여 멤버 프로필 및 `[🔗 친구 초대하기]` 공유 버튼 | URL 파라미터 또는 코드 기반 실시간 동기화 |
| | 2.2. 진척도 및 AI 추천 | 전체 진척도 게이지 바(%), 날씨 연동 **동계 필수품 추천 칩** (`팬히터`, `일산화탄소 경보기`, `등유통`) | 칩 클릭 시 리스트에 즉시 추가 |
| | 2.3. 아코디언 리스트 | 카테고리별 접기/펼치기 (`텐트/타프`, `취사`, `침구`, `동계용품`), 체크 시 취소선 및 하단 정렬 | **`[난로/등유통]` 체크 시 등유 지도 이동 스낵바 팝업 노출** |
| | 2.4. 추가 액션 | 우측 하단 플로팅 버튼 (`[➕ 새 준비물 추가]`), `[내 장비고에서 가져오기]` 모달 | |
| **3. 등유 지도 검색** | 3.1. 통합 지도 뷰 | Kakao Maps 전체 화면 뷰, 상단 검색바(현재 위치 모드 / 출발지-목적지 경로 모드 전환) | |
| | 3.2. 원터치 재검색 & 필터 | 지도 이동 시 노출되는 `[🔍 현재 지도 중심으로 검색]` 플로팅 버튼<br>가로 스크롤 필터 칩: `[💰 최저가순]`, `[⏱️ 24시영업]`, `[🚗 리뷰많은순]` | |
| | 3.3. 가격 커스텀 마커 | 일반 핀 대신 **실내등유 리터당 가격(`1,350원`)**이 표기된 말풍선 커스텀 오버레이 | 구역 내 최저가 주유소는 에이드 레드/그린 하이라이트 |
| | 3.4. 하단 상세 슬라이드 카드 | 주유소명, 등유 가격, 거리, 캠퍼 한 줄 팁(주유건 두께 등), `[티맵/카카오내비 길찾기]` 버튼 | 외부 내비게이션 URL Scheme 호출 |
| **4. 나의 장비고 (마이)** | 4.1. 프로필 & 자산 통계 | 캠퍼 닉네임, 보유 장비 수, **내 장비 총 자산 규모 정산 카드 (원)** | 등록된 장비 구매가(`purchase_price`) 합산 |
| | 4.2. 장비 인벤토리 리스트 | 카테고리 탭 (`전체`, `텐트/타프`, `취사`, `동계용품`), 장비 카드(모델명, 스펙 메모, 계절 태그) | 계절 태그(`#동계필수`)는 체크리스트와 자동 매핑 |
| | 4.3. 장비 등록 모달 | 장비명, 카테고리, 사용 계절 다중 선택, 구매 가격(선택), 한 줄 메모 입력 폼 | |

---

## 4. 핵심 데이터 모델 명세 (Database Schema)

### 4.1. `KeroseneStation` (등유 주유소 데이터)
*한국석유공사 오피넷(Opinet) API 응답 데이터를 파싱 및 좌표 변환하여 관리합니다.*

```typescript
interface KeroseneStation {
  station_id: string;        // PK: 오피넷 주유소 고유 코드 (예: "A0001234")
  station_name: string;      // 주유소 명칭 (예: "에이드캠핑 주유소")
  brand_code: 'SKE' | 'GSC' | 'HDO' | 'SOL' | 'RTO' | 'ETC'; // 정유사 코드
  kerosene_price: number;    // 실내등유 리터당 가격 (예: 1350)
  latitude: number;          // WGS84 위도 (KATEC X/Y에서 변환된 값)
  longitude: number;         // WGS84 경도 (KATEC X/Y에서 변환된 값)
  address: string;           // 도로명 또는 지번 주소
  tel_number?: string;       // 전화번호
  is_24_hours: boolean;      // 24시간 영업 여부
  has_thin_nozzle?: boolean; // 캠퍼 제보: 난로 주입용 얇은 주유건 보유 여부
  review_summary?: string;   // 캠퍼 한 줄 팁 요약
}
```

### 4.2. `UserGear` (유저 캠핑 장비 인벤토리)

```typescript
type GearCategory = 'TENT' | 'COOKING' | 'SLEEPING' | 'LIGHTING' | 'WINTER_AID' | 'ETC';
type SeasonTag = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

interface UserGear {
  gear_id: string;           // PK: 장비 고유 ID
  user_id: string;           // FK: 소유 유저 ID
  gear_name: string;         // 장비 모델명 (예: "파세코 캠프-25S")
  category: GearCategory;    // 카테고리
  purchase_price: number;    // 구매 가격 (미입력 시 0, 총 자산 계산용)
  season_tags: SeasonTag[];  // 활용 계절 태그
  custom_memo?: string;      // 스펙 및 주의사항 메모 (예: "등유 7L 완충 시 10시간 가동")
  created_at: string;        // ISO Date String
}
```

### 4.3. `CampingChecklist` & `ChecklistItem` (스마트 체크리스트)

```typescript
interface CampingChecklist {
  checklist_id: string;      // PK: 체크리스트 고유 ID
  title: string;             // 일정 제목 (예: "가평 자라섬 캠핑")
  target_date: string;       // 캠핑 예정일 (YYYY-MM-DD)
  destination_name: string;  // 목적지 캠핑장명
  destination_lat?: number;  // 목적지 위도 (날씨 및 경로 검색 연동용)
  destination_lng?: number;  // 목적지 경도
  invite_code: string;       // 공동 편집 초대 코드
  items: ChecklistItem[];    // 소속 아이템 배열
}

interface ChecklistItem {
  item_id: string;           // PK: 아이템 고유 ID
  category: GearCategory;    // 카테고리
  item_name: string;         // 준비물 명칭 (예: "일산화탄소 경보기")
  is_checked: boolean;       // 체크 완료 여부
  checked_by?: string;       // 체크한 멤버 닉네임
  is_ai_recommended: boolean;// 날씨/계절 기반 AI 추천 항목 여부
}
```

---

## 5. 핵심 기술 구현 및 예외 처리 가이드 (Technical Rules)

### 5.1. 좌표계 변환 규칙 (필수 구현)
* **이슈:** 한국석유공사 오피넷(Opinet) API는 대한민국 평면 직각 좌표계인 **KATEC (TM128)** 포맷으로 좌표를 반환하지만, 지도 SDK(카카오맵/네이버지도) 및 내비게이션은 **WGS84 (위경도)** 좌표계를 사용합니다.
* **해결 방법 (클라이언트 사이드 실시간 변환):**
  * **카카오맵 SDK 사용 시 (권장):** 별도의 백엔드 배치 서버 없이 프론트엔드에서 `kakao.maps.services.Geocoder` 또는 `kakao.maps.Coords(katecX, katecY).toLatLng()` 내장 메서드를 호출하여 즉시 WGS84 위경도로 변환 후 마커를 렌더링합니다.
  * **네이버 지도 SDK 사용 시:** `proj4` 라이브러리를 설치하고 KATEC 투영 정의(`+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43`)를 등록하여 실시간 변환합니다.

### 5.2. 외부 내비게이션 앱 연동 (URL Scheme)
지도 하단 상세 카드의 `[길찾기 시작]` 버튼 클릭 시 모바일 환경에 맞춰 외부 내비게이션 앱을 호출합니다.
* **카카오내비:** `kakaonavi://search?q=${encodeURIComponent(station_name)}&epX=${longitude}&epY=${latitude}`
* **티맵(TMAP):** `tmap://route?goalname=${encodeURIComponent(station_name)}&goalx=${longitude}&goaly=${latitude}`
* *참고:* PC 웹 브라우저에서 테스트할 경우를 대비해 카카오맵 웹 길찾기 URL(`https://map.kakao.com/link/to/${station_name},${latitude},${longitude}`)로 폴백(Fallback) 처리합니다.

### 5.3. 유기적 UX 인터랙션 (Cross-Feature Trigger)
* 유저가 **스마트 체크리스트**에서 `팬히터`, `난로`, `등유`, `등유통`, `제리캔` 키워드가 포함된 항목을 체크(`is_checked = true`)하면, 화면 하단에 4초간 토스트/스낵바 알림을 띄웁니다.
  * **문구:** `"동계 난방 준비 완료! 가는 길 최저가 등유 주유소를 확인해 볼까요?"` + `[등유 지도 보기]` 액션 버튼

---

## 6. Antigravity 에이전트 작업 지시 프롬프트 (Execution Plan)

Antigravity IDE에서 이 문서를 기반으로 프로젝트를 시작할 때 아래 순서대로 빌드를 진행하세요.

1. **Step 1 (프로젝트 초기화 및 디자인 세팅):** 모바일 퍼스트 뷰포트(`max-w-md mx-auto`) 기반의 웹앱 프로젝트를 생성하고, `Deep Forest Green (#1E3F20)` 및 `Aid Red (#FF4D4D)` 컬러 시스템을 적용합니다.
2. **Step 2 (Mock 데이터 및 UI 프로토타입 빌드):** 오피넷 API 키 발급 전이라도 즉시 화면을 테스트할 수 있도록, 수도권 및 가평 인근의 가상 `KeroseneStation` Mock 데이터(10개 이상)와 기본 `CampingChecklist`, `UserGear` 샘플 데이터를 구성하여 4개 탭(홈, 체크리스트, 등유지도, 마이)의 전체 UI와 인터랙션을 완성합니다.
3. **Step 3 (실제 API 연동):** 환경변수(`.env`)에 `OPINET_API_KEY`와 `KAKAO_MAP_APP_KEY`를 분리하여, 키 입력 즉시 실제 실시간 등유 가격과 지도가 작동하도록 API 서비스 레이어를 모듈화합니다.
