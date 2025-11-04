/**
 * 실제 데이터 로더
 * Snowflake + CSV 파일 조합
 */

import { BRAND_INFO, COST_CATEGORIES } from './types';
import { generateMockData, calculateKPI } from './mockData';
import fs from 'fs';
import path from 'path';

/**
 * CSV 파일에서 인원수 데이터 읽기 (서버 측)
 */
export async function loadHeadcountFromCSV(month) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'headcount', `headcount_${month}.csv`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`인원수 CSV 파일을 찾을 수 없습니다: ${filePath}`);
      return null;
    }
    
    const text = fs.readFileSync(filePath, 'utf8');
    // BOM 제거
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.trim().split('\n');
    
    const headcountData = {};
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 빈 줄 스킵
      
      const values = lines[i].split(',');
      const brandCode = values[0]?.trim().replace(/['"]/g, '');
      const headcount = parseInt(values[1]?.trim().replace(/['"]/g, '')) || 0;
      
      headcountData[brandCode] = headcount;
    }
    
    console.log('✅ 인원수 데이터 로드:', Object.keys(headcountData).length, '개 브랜드');
    console.log('인원수:', headcountData);
    
    return headcountData;
  } catch (error) {
    console.error('인원수 CSV 로딩 에러:', error);
    return null;
  }
}

/**
 * CSV 파일에서 매장 수 데이터 읽기 (서버 측)
 * 백화점 + 대리점 + 면세점 + 직영점 + 아울렛만 합산
 */
export async function loadStoreCountFromCSV(month, brandCode) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'store', `store_${brandCode}.csv`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`매장 수 CSV 파일을 찾을 수 없습니다: ${filePath}`);
      return null;
    }
    
    const text = fs.readFileSync(filePath, 'utf8');
    // BOM 제거
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.trim().split('\n');
    
    // 포함할 채널: 백화점, 대리점, 면세점, 직영점, 아울렛
    // 제외할 채널: 온라인, 샵인샵, 샵(위탁), 상설, 기타
    const includedChannels = ['백화점', '대리점', '면세점', '직영점', '아울렛'];
    
    let totalStoreCount = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 빈 줄 스킵
      
      const values = lines[i].split(',');
      const channel = values[1]?.trim().replace(/['"]/g, '');
      const storeCount = parseInt(values[2]?.trim().replace(/['"]/g, '')) || 0;
      const yyyymm = values[3]?.trim().replace(/['"]/g, '');
      
      // 해당 월이고, 포함할 채널인 경우만 합산
      if (yyyymm === month && includedChannels.includes(channel)) {
        totalStoreCount += storeCount;
      }
    }
    
    console.log(`✅ 매장 수 데이터 로드 (${brandCode}, ${month}):`, totalStoreCount, '개');
    
    return totalStoreCount;
  } catch (error) {
    console.error('매장 수 CSV 로딩 에러:', error);
    return null;
  }
}

/**
 * Snowflake CSV 파일에서 매출 데이터 읽기 (서버 측)
 */
export async function loadSalesFromCSV() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'snowflake_sales.csv');
    
    if (!fs.existsSync(filePath)) {
      console.warn('매출 CSV 파일을 찾을 수 없습니다:', filePath);
      return null;
    }
    
    const text = fs.readFileSync(filePath, 'utf8');
    // BOM 제거
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.trim().split('\n');
    
    const salesData = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 빈 줄 스킵
      
      const values = lines[i].split(',');
      const month = values[0]?.trim().replace(/['"]/g, '');
      const brandCode = values[1]?.trim().replace(/['"]/g, '');
      const totalSales = parseFloat(values[3]?.trim().replace(/['"]/g, '')) || 0;
      
      salesData.push({
        month: month,
        brand_code: brandCode,
        brand_name: values[2]?.trim().replace(/['"]/g, ''),
        total_sales: totalSales,
      });
    }
    
    console.log('✅ 매출 데이터 로드:', salesData.length, '건');
    console.log('샘플:', salesData[0]);
    
    return salesData;
  } catch (error) {
    console.error('매출 CSV 로딩 에러:', error);
    return null;
  }
}

/**
 * Snowflake CSV 파일에서 비용 데이터 읽기 (서버 측)
 */
export async function loadCostsFromCSV() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'snowflake_costs.csv');
    
    if (!fs.existsSync(filePath)) {
      console.warn('비용 CSV 파일을 찾을 수 없습니다:', filePath);
      return null;
    }
    
    const text = fs.readFileSync(filePath, 'utf8');
    // BOM 제거
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.trim().split('\n');
    
    const costsData = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 빈 줄 스킵
      
      const values = lines[i].split(',');
      const month = values[0]?.trim().replace(/['"]/g, '');
      const brandCode = values[1]?.trim().replace(/['"]/g, '');
      const costAmt = parseFloat(values[11]?.trim().replace(/['"]/g, '')) || 0;
      
      costsData.push({
        month: month,
        brand_code: brandCode,
        brand_name: values[2]?.trim().replace(/['"]/g, ''),
        cctr_code: values[3]?.trim().replace(/['"]/g, ''),
        cctr_name: values[4]?.trim().replace(/['"]/g, ''),
        cctr_type: values[5]?.trim().replace(/['"]/g, ''),
        category_l1: values[6]?.trim().replace(/['"]/g, ''),
        category_l2: values[7]?.trim().replace(/['"]/g, ''),
        category_l3: values[8]?.trim().replace(/['"]/g, ''),
        gl_code: values[9]?.trim().replace(/['"]/g, ''),
        gl_name: values[10]?.trim().replace(/['"]/g, ''),
        cost_amt: costAmt,
      });
    }
    
    console.log('✅ 비용 데이터 로드:', costsData.length, '건');
    console.log('샘플:', costsData[0]);
    
    return costsData;
  } catch (error) {
    console.error('비용 CSV 로딩 에러:', error);
    return null;
  }
}

/**
 * Snowflake 데이터 로드 (CSV 우선, API fallback)
 */
export async function loadSnowflakeData(month) {
  // 1. CSV 파일에서 읽기 시도
  const salesData = await loadSalesFromCSV();
  const costsData = await loadCostsFromCSV();
  
  if (salesData && costsData) {
    console.log('✅ Snowflake CSV 데이터 로드 성공');
    return { sales: salesData, costs: costsData };
  }
  
  // 2. CSV 실패 시 API 호출 시도
  try {
    const response = await fetch('/api/data/snowflake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ month }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.warn('Snowflake API 데이터 로딩 실패:', result.error);
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Snowflake 데이터 로딩 에러:', error);
    return null;
  }
}

/**
 * 실제 데이터와 Mock 데이터를 조합
 */
export async function loadBrandData(brandCode, currentMonth = '202510') {
  console.log('🔄 loadBrandData 시작:', brandCode, currentMonth);
  
  const snowflakeData = await loadSnowflakeData(currentMonth);
  const headcountData = await loadHeadcountFromCSV(currentMonth);
  
  const previousYearMonth = `${parseInt(currentMonth.substring(0, 4)) - 1}${currentMonth.substring(4, 6)}`;
  
  // 실제 데이터로 KPI 계산 (loadAllBrandsSummary와 동일한 로직)
  let totalCost = 0;
  let totalSales = 0;
  
  if (snowflakeData && snowflakeData.sales && snowflakeData.costs) {
    // 매출 데이터
    const brandSales = snowflakeData.sales.filter(s => 
      BRAND_CODE_MAP[s.brand_code] === brandCode && s.month === currentMonth
    );
    totalSales = brandSales.reduce((sum, s) => sum + s.total_sales, 0);
    
    // 비용 데이터 (공통비 제외)
    const brandCosts = snowflakeData.costs.filter(c => 
      BRAND_CODE_MAP[c.brand_code] === brandCode && 
      c.month === currentMonth &&
      c.category_l1 !== '공통비'
    );
    totalCost = brandCosts.reduce((sum, c) => sum + c.cost_amt, 0);
  }
  
  const headcount = headcountData?.[brandCode] || 0;
  
  // 전년 headcount 로드
  const prevHeadcountData = await loadHeadcountFromCSV(previousYearMonth);
  const prevHeadcount = prevHeadcountData?.[brandCode] || headcount; // fallback to current headcount
  
  // 매장 수 로드
  const storeCountData = await loadStoreCountFromCSV(currentMonth, brandCode);
  const storeCount = storeCountData || 0;
  
  // 전년 매장 수 로드
  const prevStoreCountData = await loadStoreCountFromCSV(previousYearMonth, brandCode);
  const prevStoreCount = prevStoreCountData || storeCount; // fallback to current store count
  
  // 전년 총비용/매출 계산
  let prevTotalCost = 0;
  let prevTotalSales = 0;
  if (snowflakeData && snowflakeData.costs) {
    const prevBrandCosts = snowflakeData.costs.filter(c => 
      BRAND_CODE_MAP[c.brand_code] === brandCode && 
      c.month === previousYearMonth &&
      c.category_l1 !== '공통비'
    );
    prevTotalCost = prevBrandCosts.reduce((sum, c) => sum + c.cost_amt, 0);
  }
  if (snowflakeData && snowflakeData.sales) {
    const prevBrandSales = snowflakeData.sales.filter(s => 
      BRAND_CODE_MAP[s.brand_code] === brandCode && s.month === previousYearMonth
    );
    prevTotalSales = prevBrandSales.reduce((sum, s) => sum + s.total_sales, 0);
  }
  
  // 인당 인건비 계산 (급료와 임금만)
  let salaryCost = 0;
  if (snowflakeData && snowflakeData.costs) {
    const salaryCosts = snowflakeData.costs.filter(c => 
      BRAND_CODE_MAP[c.brand_code] === brandCode && 
      c.month === currentMonth &&
      c.category_l3 === '급료와 임금'
    );
    salaryCost = salaryCosts.reduce((sum, c) => sum + c.cost_amt, 0);
  }
  
  // KPI 계산
  const operatingRatio = totalSales > 0 ? (totalCost / totalSales) * 1.1 * 100 : 0;
  const prevOperatingRatio = prevTotalSales > 0 ? (prevTotalCost / prevTotalSales) * 1.1 * 100 : 0;
  const costPerPerson = headcount > 0 ? totalCost / headcount : 0; // 당년 인당 비용
  const prevCostPerPerson = prevHeadcount > 0 ? prevTotalCost / prevHeadcount : 0; // 전년 동월 인당 비용 (전년 인원수 사용)
  const salaryPerPerson = headcount > 0 ? salaryCost / headcount : 0; // 인당 인건비 (급료와임금)
  
  // 매장당 비용 (전체 비용 / 매장 수)
  const costPerStore = storeCount > 0 ? totalCost / storeCount : 0;
  const prevCostPerStore = prevStoreCount > 0 ? prevTotalCost / prevStoreCount : 0; // 전년 동월 매장당 비용
  
  const yoyCost = prevTotalCost > 0 ? (totalCost / prevTotalCost) * 100 : 0;
  const yoyCostPerPerson = prevCostPerPerson > 0 ? (costPerPerson / prevCostPerPerson) * 100 : 0;
  const yoyCostPerStore = prevCostPerStore > 0 ? (costPerStore / prevCostPerStore) * 100 : 0;
  
  // 백만원 단위로 변환 (소수점 한자리)
  const totalCostInMillion = Math.round(totalCost / 1000000);
  const prevTotalCostInMillion = Math.round(prevTotalCost / 1000000);
  const costPerPersonInMillion = parseFloat((costPerPerson / 1000000).toFixed(1)); // 소수점 한자리
  const prevCostPerPersonInMillion = parseFloat((prevCostPerPerson / 1000000).toFixed(1)); // 소수점 한자리
  const salaryPerPersonInMillion = parseFloat((salaryPerPerson / 1000000).toFixed(1)); // 소수점 한자리
  const costPerStoreInMillion = Math.round(costPerStore / 1000000);
  const prevCostPerStoreInMillion = Math.round(prevCostPerStore / 1000000);
  
  // 월별 데이터 생성 (실제 데이터 기반)
  const year = parseInt(currentMonth.substring(0, 4));
  const prevYear = year - 1;
  const monthNum = parseInt(currentMonth.substring(4, 6));
  const monthly_data = [];
  
  // 전년도의 1월부터 선택월까지 데이터 생성
  for (let m = 1; m <= monthNum; m++) {
    const monthStr = `${prevYear}${String(m).padStart(2, '0')}`;
    
    // 해당 월의 headcount 로드
    const monthHeadcountData = await loadHeadcountFromCSV(monthStr);
    const monthHeadcount = monthHeadcountData?.[brandCode] || headcount; // fallback to current
    
    // 해당 월의 매장 수 로드
    const monthStoreCount = await loadStoreCountFromCSV(monthStr, brandCode);
    
    // 실제 Snowflake 데이터가 있으면 카테고리별로 나눠서 추가
    if (snowflakeData && snowflakeData.costs && snowflakeData.sales) {
      const monthCosts = snowflakeData.costs.filter(c => 
        BRAND_CODE_MAP[c.brand_code] === brandCode && 
        c.month === monthStr &&
        c.category_l1 !== '공통비'
      );
      
      const monthSales = snowflakeData.sales.filter(s => 
        BRAND_CODE_MAP[s.brand_code] === brandCode && s.month === monthStr
      );
      const monthlySales = monthSales.reduce((sum, s) => sum + s.total_sales, 0);
      
      // 카테고리별로 집계
      const categoryMap = {};
      monthCosts.forEach(c => {
        let cat = c.category_l1 || '기타';
        // 제간비와 지급수수료를 지급수수료로 통합
        if (cat === '제간비' || cat === '지급수수료') {
          cat = '지급수수료';
        }
        if (!categoryMap[cat]) {
          categoryMap[cat] = 0;
        }
        categoryMap[cat] += c.cost_amt;
      });
      
      // 각 카테고리별로 행 추가
      Object.entries(categoryMap).forEach(([category, cost]) => {
        monthly_data.push({
          month: monthStr,
          cost_amt: cost,
          sale_amt: monthlySales,
          headcount: monthHeadcount,
          store_cnt: monthStoreCount || storeCount,
          category_l1: category,
        });
      });
    } else {
      // 데이터가 없으면 '전체'로 fallback
      monthly_data.push({
        month: monthStr,
        cost_amt: prevTotalCost * (0.8 + Math.random() * 0.4) / monthNum,
        sale_amt: prevTotalSales * (0.8 + Math.random() * 0.4) / monthNum,
        headcount: monthHeadcount,
        store_cnt: monthStoreCount || storeCount,
        category_l1: '전체',
      });
    }
  }
  
  // 현재 연도의 1월부터 선택월까지 데이터 생성
  for (let m = 1; m <= monthNum; m++) {
    const monthStr = `${year}${String(m).padStart(2, '0')}`;
    
    // 해당 월의 headcount 로드
    const monthHeadcountData = await loadHeadcountFromCSV(monthStr);
    const monthHeadcount = monthHeadcountData?.[brandCode] || headcount; // fallback to current
    
    // 해당 월의 매장 수 로드
    const monthStoreCount = await loadStoreCountFromCSV(monthStr, brandCode);
    
    // 실제 Snowflake 데이터가 있으면 카테고리별로 나눠서 추가
    if (snowflakeData && snowflakeData.costs && snowflakeData.sales) {
      const monthCosts = snowflakeData.costs.filter(c => 
        BRAND_CODE_MAP[c.brand_code] === brandCode && 
        c.month === monthStr &&
        c.category_l1 !== '공통비'
      );
      
      const monthSales = snowflakeData.sales.filter(s => 
        BRAND_CODE_MAP[s.brand_code] === brandCode && s.month === monthStr
      );
      const monthlySales = monthSales.reduce((sum, s) => sum + s.total_sales, 0);
      
      // 카테고리별로 집계
      const categoryMap = {};
      monthCosts.forEach(c => {
        let cat = c.category_l1 || '기타';
        // 제간비와 지급수수료를 지급수수료로 통합
        if (cat === '제간비' || cat === '지급수수료') {
          cat = '지급수수료';
        }
        if (!categoryMap[cat]) {
          categoryMap[cat] = 0;
        }
        categoryMap[cat] += c.cost_amt;
      });
      
      // 각 카테고리별로 행 추가
      Object.entries(categoryMap).forEach(([category, cost]) => {
        monthly_data.push({
          month: monthStr,
          cost_amt: cost,
          sale_amt: monthlySales,
          headcount: monthHeadcount,
          store_cnt: monthStoreCount || storeCount,
          category_l1: category,
        });
      });
    } else {
      // 데이터가 없으면 '전체'로 fallback
      monthly_data.push({
        month: monthStr,
        cost_amt: totalCost * (0.8 + Math.random() * 0.4) / monthNum,
        sale_amt: totalSales * (0.8 + Math.random() * 0.4) / monthNum,
        headcount: monthHeadcount,
        store_cnt: monthStoreCount || storeCount,
        category_l1: '전체',
      });
    }
  }
  
  return {
    brand_code: brandCode,
    brand_name: BRAND_INFO[brandCode].name,
    current_month: currentMonth,
    kpi: {
      total_cost: totalCostInMillion,
      prev_total_cost: prevTotalCostInMillion, // 전년 비용 추가
      cost_ratio: parseFloat(operatingRatio.toFixed(1)),
      prev_cost_ratio: parseFloat(prevOperatingRatio.toFixed(1)), // 전년 매출대비 비용률 추가
      cost_per_person: costPerPersonInMillion,
      prev_cost_per_person: prevCostPerPersonInMillion, // 전년 인당 비용 추가
      salary_per_person: salaryPerPersonInMillion, // 인당 인건비 추가
      headcount: headcount, // 당년 인원수 추가
      prev_headcount: prevHeadcount, // 전년 인원수 추가
      cost_per_store: costPerStoreInMillion,
      prev_cost_per_store: prevCostPerStoreInMillion, // 전년 매장당 비용 추가
      store_count: storeCount, // 당년 매장 수 추가
      prev_store_count: prevStoreCount, // 전년 매장 수 추가
      yoy: parseFloat(yoyCost.toFixed(1)),
      yoy_cost_per_person: parseFloat(yoyCostPerPerson.toFixed(1)),
      yoy_cost_per_store: parseFloat(yoyCostPerStore.toFixed(1)),
    },
    monthly_data,
    data_source: {
      snowflake: !!(snowflakeData && snowflakeData.sales && snowflakeData.costs),
      csv_headcount: !!headcountData,
      mock: true,
    },
  };
}

/**
 * 브랜드 코드 매핑 (Snowflake → 시스템)
 */
const BRAND_CODE_MAP = {
  'M': 'MLB',
  'I': 'MLB_KIDS',
  'X': 'DISCOVERY',
  'V': 'DUVETICA',
  'ST': 'SERGIO_TACCHINI',
};

/**
 * 모든 브랜드 요약 데이터 (실제 데이터 사용)
 */
export async function loadAllBrandsSummary(currentMonth = '202510') {
  console.log('🔄 loadAllBrandsSummary 시작, currentMonth:', currentMonth);
  
  const snowflakeData = await loadSnowflakeData(currentMonth);
  console.log('📊 Snowflake 데이터:', snowflakeData ? 'loaded' : 'null');
  
  const headcountData = await loadHeadcountFromCSV(currentMonth);
  console.log('👥 Headcount 데이터:', headcountData);
  
  const previousYearMonth = `${parseInt(currentMonth.substring(0, 4)) - 1}${currentMonth.substring(4, 6)}`;
  
  return Promise.all(
    Object.keys(BRAND_INFO).map(async (brandCode) => {
      // Snowflake 데이터에서 해당 브랜드 찾기
      let totalCost = 0;
      let totalSales = 0;
      let categoryBreakdown = [];
      
      if (snowflakeData && snowflakeData.sales && snowflakeData.costs) {
        // 매출 데이터
        const brandSales = snowflakeData.sales.filter(s => 
          BRAND_CODE_MAP[s.brand_code] === brandCode && s.month === currentMonth
        );
        totalSales = brandSales.reduce((sum, s) => sum + s.total_sales, 0);
        
        // 비용 데이터 (공통비 제외)
        const brandCosts = snowflakeData.costs.filter(c => 
          BRAND_CODE_MAP[c.brand_code] === brandCode && 
          c.month === currentMonth &&
          c.category_l1 !== '공통비'
        );
        totalCost = brandCosts.reduce((sum, c) => sum + c.cost_amt, 0);
        
        // 전년 비용 데이터 (공통비 제외)
        const prevBrandCosts = snowflakeData.costs.filter(c => 
          BRAND_CODE_MAP[c.brand_code] === brandCode && 
          c.month === previousYearMonth &&
          c.category_l1 !== '공통비'
        );
        
        // 카테고리별 분류 (제간비 + 지급수수료 → 지급수수료로 통합)
        const categoryMap = {};
        const uniqueCategories = new Set();
        brandCosts.forEach(cost => {
          uniqueCategories.add(cost.category_l1);
          let cat = cost.category_l1 || '기타';
          // 제간비와 지급수수료를 지급수수료로 통합
          if (cat === '제간비' || cat === '지급수수료') {
            cat = '지급수수료';
          }
          if (!categoryMap[cat]) {
            categoryMap[cat] = { current: 0, prev: 0 };
          }
          categoryMap[cat].current += cost.cost_amt;
        });
        console.log(`📊 [${brandCode}] 실제 CATEGORY_L1 값:`, Array.from(uniqueCategories));
        
        prevBrandCosts.forEach(cost => {
          let cat = cost.category_l1 || '기타';
          // 제간비와 지급수수료를 지급수수료로 통합
          if (cat === '제간비' || cat === '지급수수료') {
            cat = '지급수수료';
          }
          if (!categoryMap[cat]) {
            categoryMap[cat] = { current: 0, prev: 0 };
          }
          categoryMap[cat].prev += cost.cost_amt;
        });
        
        categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => {
          const yoy = data.prev > 0 ? (data.current / data.prev) * 100 : 0;
          return {
            name,
            amount: Math.round(data.current / 1000000), // 백만원 단위
            yoy: Math.round(yoy),
          };
        }).sort((a, b) => b.amount - a.amount);
      }
      
      // 인원수
      const headcount = headcountData?.[brandCode] || 0;
      
      // 인당 인건비 계산 (급료와 임금만)
      let salaryCost = 0;
      if (snowflakeData && snowflakeData.costs) {
        const salaryCosts = snowflakeData.costs.filter(c => 
          BRAND_CODE_MAP[c.brand_code] === brandCode && 
          c.month === currentMonth &&
          c.category_l3 === '급료와 임금'
        );
        salaryCost = salaryCosts.reduce((sum, c) => sum + c.cost_amt, 0);
      }
      
      // 전년 총비용 계산 (공통비 제외)
      let prevTotalCost = 0;
      if (snowflakeData && snowflakeData.costs) {
        const prevBrandCosts = snowflakeData.costs.filter(c => 
          BRAND_CODE_MAP[c.brand_code] === brandCode && 
          c.month === previousYearMonth &&
          c.category_l1 !== '공통비'
        );
        prevTotalCost = prevBrandCosts.reduce((sum, c) => sum + c.cost_amt, 0);
      }
      
      // 전년 총매출 계산
      let prevTotalSales = 0;
      if (snowflakeData && snowflakeData.sales) {
        const prevBrandSales = snowflakeData.sales.filter(s => 
          BRAND_CODE_MAP[s.brand_code] === brandCode && s.month === previousYearMonth
        );
        prevTotalSales = prevBrandSales.reduce((sum, s) => sum + s.total_sales, 0);
      }
      
      // KPI 계산
      const operatingRatio = totalSales > 0 ? (totalCost / totalSales) * 1.1 * 100 : 0;
      const costPerPerson = headcount > 0 ? totalCost / headcount : 0; // 전체 비용으로 복원
      const salaryPerPerson = headcount > 0 ? salaryCost / headcount : 0; // 인당 인건비 (급료와 임금)
      const yoyCost = prevTotalCost > 0 ? (totalCost / prevTotalCost) * 100 : 0;
      const yoySales = prevTotalSales > 0 ? (totalSales / prevTotalSales) * 100 : 0;
      
      // 백만원 단위로 변환 (인당 인건비는 소수점 한자리)
      const totalCostInMillion = Math.round(totalCost / 1000000);
      const totalSalesInMillion = Math.round(totalSales / 1000000);
      const costPerPersonInMillion = Math.round(costPerPerson / 1000000);
      const salaryPerPersonInMillion = parseFloat((salaryPerPerson / 1000000).toFixed(1)); // 소수점 한자리
      
      return {
        brand_code: brandCode,
        brand_name: BRAND_INFO[brandCode].name,
        shortName: BRAND_INFO[brandCode].shortName,
        color: BRAND_INFO[brandCode].color,
        kpi: {
          total_cost: totalCostInMillion,
          headcount: headcount,
          total_sales: totalSalesInMillion,
          operating_ratio: parseFloat(operatingRatio.toFixed(1)),
          cost_per_person: costPerPersonInMillion,
          salary_per_person: salaryPerPersonInMillion, // 인당 인건비 추가
          yoy_cost: parseFloat(yoyCost.toFixed(1)),
          yoy_sales: parseFloat(yoySales.toFixed(1)),
        },
        categoryBreakdown,
        data_source: {
          snowflake: !!(snowflakeData && snowflakeData.sales && snowflakeData.costs),
          csv_headcount: !!headcountData,
          mock: false,
        },
      };
    })
  );
}

