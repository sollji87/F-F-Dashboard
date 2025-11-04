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
export async function loadBrandData(brandCode, currentMonth = '202509') {
  // 1. Snowflake 데이터 시도
  const snowflakeData = await loadSnowflakeData(currentMonth);
  
  // 2. CSV 인원수 데이터 시도
  const headcountData = await loadHeadcountFromCSV(currentMonth);
  
  // 3. Mock 데이터 생성 (기본)
  const mockData = generateMockData(brandCode);
  const previousYearMonth = `${parseInt(currentMonth.substring(0, 4)) - 1}${currentMonth.substring(4, 6)}`;
  
  // 4. 데이터 병합
  let finalData = mockData;
  
  // Snowflake 데이터가 있으면 총비용과 매출 업데이트
  if (snowflakeData) {
    const brandSnowflakeData = snowflakeData.find(d => d.BRAND_CODE === brandCode);
    if (brandSnowflakeData) {
      finalData = finalData.map(row => ({
        ...row,
        cost_amt: row.month === currentMonth 
          ? brandSnowflakeData.TOTAL_COST / Object.keys(COST_CATEGORIES).length 
          : row.cost_amt,
        sale_amt: row.month === currentMonth 
          ? brandSnowflakeData.TOTAL_SALES / Object.keys(COST_CATEGORIES).length 
          : row.sale_amt,
      }));
    }
  }
  
  // CSV 인원수 데이터가 있으면 업데이트
  if (headcountData && headcountData[brandCode]) {
    finalData = finalData.map(row => ({
      ...row,
      headcount: row.month === currentMonth ? headcountData[brandCode] : row.headcount,
    }));
  }
  
  // KPI 계산
  const kpi = calculateKPI(finalData, currentMonth, previousYearMonth);
  
  return {
    brand_code: brandCode,
    brand_name: BRAND_INFO[brandCode].name,
    current_month: currentMonth,
    kpi,
    monthly_data: finalData,
    data_source: {
      snowflake: !!snowflakeData,
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
        brandCosts.forEach(cost => {
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
      const costPerPerson = headcount > 0 ? totalCost / headcount : 0;
      const yoyCost = prevTotalCost > 0 ? (totalCost / prevTotalCost) * 100 : 0;
      const yoySales = prevTotalSales > 0 ? (totalSales / prevTotalSales) * 100 : 0;
      
      // 백만원 단위로 변환 (반올림)
      const totalCostInMillion = Math.round(totalCost / 1000000);
      const totalSalesInMillion = Math.round(totalSales / 1000000);
      const costPerPersonInMillion = Math.round(costPerPerson / 1000000);
      
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

