/**
 * 비용 분석 대시보드 데이터 타입 정의
 */

// 브랜드 코드
export const BRANDS = {
  MLB: 'MLB',
  MLB_KIDS: 'MLB_KIDS',
  DISCOVERY: 'DISCOVERY',
  DUVETICA: 'DUVETICA',
  SERGIO_TACCHINI: 'SERGIO_TACCHINI',
};

// 브랜드 정보
export const BRAND_INFO = {
  MLB: { code: 'MLB', name: 'MLB', shortName: 'M', color: '#002D72' },
  MLB_KIDS: { code: 'MLB_KIDS', name: 'MLB KIDS', shortName: 'MK', color: '#E31937' },
  DISCOVERY: { code: 'DISCOVERY', name: 'DISCOVERY', shortName: 'DX', color: '#00A651' },
  DUVETICA: { code: 'DUVETICA', name: 'DUVETICA', shortName: 'DV', color: '#000000' },
  SERGIO_TACCHINI: { code: 'SERGIO_TACCHINI', name: 'SERGIO TACCHINI', shortName: 'ST', color: '#0066CC' },
};

// 비용 대분류
export const COST_CATEGORIES = {
  PERSONNEL: '인건비',
  MARKETING: '마케팅비',
  RENT: '임차료',
  LOGISTICS: '물류비',
  IT: 'IT비용',
  ADMIN: '관리비',
  OTHER: '기타',
};

// 코스트센터 타입
export const CCTR_TYPES = {
  DEPT: '부서',
  STORE: '매장',
};

// 기간 타입
export const PERIOD_TYPES = {
  MONTHLY: '당월',
  YTD: '누적(YTD)',
};

/**
 * 월별 비용 데이터 구조
 * @typedef {Object} MonthlyCostData
 * @property {string} month - YYYYMM 형식
 * @property {number} cost_amt - 비용액
 * @property {number} sale_amt - 매출액
 * @property {number} headcount - 인원수
 * @property {number} store_cnt - 매장수
 * @property {string} category_l1 - 대분류
 * @property {string} category_l2 - 중분류
 * @property {string} category_l3 - 소분류
 * @property {string} cctr_code - 코스트센터 코드
 * @property {string} cctr_name - 코스트센터 명
 * @property {string} cctr_type - 코스트센터 타입 (부서/매장)
 */

/**
 * KPI 메트릭
 * @typedef {Object} KpiMetrics
 * @property {number} total_cost - 총비용
 * @property {number} cost_ratio - 매출대비 비용률 (%)
 * @property {number} cost_per_person - 인당 비용 (백만원)
 * @property {number} cost_per_store - 매장당 비용 (백만원)
 * @property {number} yoy - 전년 대비 증감률 (%)
 */

/**
 * 브랜드 대시보드 데이터
 * @typedef {Object} BrandDashboardData
 * @property {string} brand_code - 브랜드 코드
 * @property {string} brand_name - 브랜드 명
 * @property {string} current_month - 현재 조회 월 (YYYYMM)
 * @property {KpiMetrics} kpi - KPI 메트릭
 * @property {Array<MonthlyCostData>} monthly_data - 월별 상세 데이터
 * @property {Object} insights - AI 인사이트
 */

