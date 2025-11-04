/**
 * Mock 데이터 생성 함수
 * 실제 Snowflake 데이터 전까지 사용할 샘플 데이터
 */

import { BRANDS, BRAND_INFO, COST_CATEGORIES, CCTR_TYPES } from './types';

// 월 생성 헬퍼 (2023년 1월 ~ 2024년 12월)
function generateMonths() {
  const months = [];
  for (let year = 2023; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      months.push(`${year}${String(month).padStart(2, '0')}`);
    }
  }
  return months;
}

// 랜덤 비용 생성 (기본값에 변동 추가)
function randomCost(base, variance = 0.2) {
  return Math.round(base * (1 + (Math.random() - 0.5) * variance));
}

// 브랜드별 월별 데이터 생성
export function generateMockData(brandCode) {
  const months = generateMonths();
  const brandInfo = BRAND_INFO[brandCode];
  const categories = Object.entries(COST_CATEGORIES);
  
  // 브랜드별 기본 규모
  const brandScale = {
    MLB: { baseCost: 5000, headcount: 150, stores: 80 },
    MLB_KIDS: { baseCost: 2000, headcount: 60, stores: 30 },
    DISCOVERY: { baseCost: 1500, headcount: 50, stores: 25 },
    DUVETICA: { baseCost: 1000, headcount: 40, stores: 15 },
    SERGIO_TACCHINI: { baseCost: 800, headcount: 35, stores: 12 },
  };
  
  const scale = brandScale[brandCode] || brandScale.MLB;
  const monthlyData = [];
  
  months.forEach((month, idx) => {
    const year = parseInt(month.substring(0, 4));
    const monthNum = parseInt(month.substring(4, 6));
    
    // 계절성 반영 (12월, 1월 비용 증가)
    const seasonalFactor = [12, 1].includes(monthNum) ? 1.2 : 1.0;
    
    // 연도별 성장 (2024년 5% 증가)
    const growthFactor = year === 2024 ? 1.05 : 1.0;
    
    categories.forEach(([catKey, catName]) => {
      // 카테고리별 비중
      const categoryWeight = {
        PERSONNEL: 0.35,
        MARKETING: 0.20,
        RENT: 0.15,
        LOGISTICS: 0.12,
        IT: 0.08,
        ADMIN: 0.07,
        OTHER: 0.03,
      };
      
      const baseCostAmt = scale.baseCost * categoryWeight[catKey] * seasonalFactor * growthFactor;
      
      // 부서 데이터
      monthlyData.push({
        month,
        brand_code: brandCode,
        brand_name: brandInfo.name,
        cost_amt: randomCost(baseCostAmt * 0.6, 0.15), // 부서 60%
        sale_amt: randomCost(scale.baseCost * 3 * seasonalFactor * growthFactor, 0.1),
        headcount: Math.round(scale.headcount * (0.95 + Math.random() * 0.1)),
        store_cnt: Math.round(scale.stores * (0.95 + Math.random() * 0.1)),
        category_l1: catName,
        category_l2: `${catName}_중분류`,
        category_l3: `${catName}_소분류`,
        cctr_code: `DEPT_${catKey}`,
        cctr_name: `${catName} 부서`,
        cctr_type: CCTR_TYPES.DEPT,
      });
      
      // 매장 데이터
      monthlyData.push({
        month,
        brand_code: brandCode,
        brand_name: brandInfo.name,
        cost_amt: randomCost(baseCostAmt * 0.4, 0.15), // 매장 40%
        sale_amt: randomCost(scale.baseCost * 3 * seasonalFactor * growthFactor, 0.1),
        headcount: Math.round(scale.headcount * (0.95 + Math.random() * 0.1)),
        store_cnt: Math.round(scale.stores * (0.95 + Math.random() * 0.1)),
        category_l1: catName,
        category_l2: `${catName}_중분류`,
        category_l3: `${catName}_소분류`,
        cctr_code: `STORE_${catKey}`,
        cctr_name: `${catName} 매장`,
        cctr_type: CCTR_TYPES.STORE,
      });
    });
  });
  
  return monthlyData;
}

// KPI 계산
export function calculateKPI(data, currentMonth, previousYearMonth) {
  const currentData = data.filter(d => d.month === currentMonth);
  const previousData = data.filter(d => d.month === previousYearMonth);
  
  const totalCost = currentData.reduce((sum, d) => sum + d.cost_amt, 0);
  const totalSale = currentData.reduce((sum, d) => sum + d.sale_amt, 0);
  const avgHeadcount = currentData.length > 0 
    ? Math.round(currentData.reduce((sum, d) => sum + d.headcount, 0) / currentData.length)
    : 1;
  const avgStores = currentData.length > 0
    ? currentData.reduce((sum, d) => sum + d.store_cnt, 0) / currentData.length
    : 1;
  
  const previousTotalCost = previousData.reduce((sum, d) => sum + d.cost_amt, 0);
  
  const costRatio = totalSale > 0 ? (totalCost / totalSale) * 100 : 0;
  const operatingRatio = totalSale > 0 ? (totalCost / totalSale) * 1.1 * 100 : 0; // 영업비율 = 총비용 / 실판매출액 * 1.1
  const costPerPerson = avgHeadcount > 0 ? totalCost / avgHeadcount / 1000000 : 0;
  const costPerStore = avgStores > 0 ? totalCost / avgStores / 1000000 : 0;
  const yoy = previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0;
  
  return {
    total_cost: Math.round(totalCost),
    total_sales: Math.round(totalSale),
    headcount: avgHeadcount,
    cost_ratio: Math.round(costRatio * 10) / 10,
    operating_ratio: Math.round(operatingRatio * 10) / 10,
    cost_per_person: Math.round(costPerPerson * 10) / 10,
    cost_per_store: Math.round(costPerStore * 10) / 10,
    yoy: Math.round(yoy * 10) / 10,
  };
}

// 브랜드 대시보드 전체 데이터 생성
export function generateBrandDashboard(brandCode, currentMonth = '202412') {
  const monthlyData = generateMockData(brandCode);
  const previousYearMonth = `${parseInt(currentMonth.substring(0, 4)) - 1}${currentMonth.substring(4, 6)}`;
  
  const kpi = calculateKPI(monthlyData, currentMonth, previousYearMonth);
  
  return {
    brand_code: brandCode,
    brand_name: BRAND_INFO[brandCode].name,
    current_month: currentMonth,
    kpi,
    monthly_data: monthlyData,
    insights: null, // AI 인사이트는 별도 API에서 생성
  };
}

// 모든 브랜드 요약 데이터
export function getAllBrandsSummary(currentMonth = '202412') {
  return Object.keys(BRAND_INFO).map(brandCode => {
    const data = generateBrandDashboard(brandCode, currentMonth);
    const previousYearMonth = `${parseInt(currentMonth.substring(0, 4)) - 1}${currentMonth.substring(4, 6)}`;
    
    // 카테고리별 상세 데이터 생성
    const currentMonthData = data.monthly_data.filter(d => d.month === currentMonth);
    const prevMonthData = data.monthly_data.filter(d => d.month === previousYearMonth);
    
    const categoryBreakdown = Object.entries(COST_CATEGORIES).map(([key, name]) => {
      const currentCost = currentMonthData
        .filter(d => d.category_l1 === name)
        .reduce((sum, d) => sum + d.cost_amt, 0);
      
      const prevCost = prevMonthData
        .filter(d => d.category_l1 === name)
        .reduce((sum, d) => sum + d.cost_amt, 0);
      
      const yoy = prevCost > 0 ? ((currentCost - prevCost) / prevCost) * 100 : 0;
      
      return {
        name,
        amount: Math.round(currentCost),
        yoy: Math.round(yoy),
      };
    }).sort((a, b) => b.amount - a.amount);
    
    return {
      brand_code: brandCode,
      brand_name: data.brand_name,
      shortName: BRAND_INFO[brandCode].shortName,
      color: BRAND_INFO[brandCode].color,
      kpi: data.kpi,
      categoryBreakdown,
    };
  });
}

