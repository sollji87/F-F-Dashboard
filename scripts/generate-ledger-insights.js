/**
 * 비용 계정별 AI 인사이트 생성 스크립트
 * 각 브랜드의 CATEGORY_L1, L2, L3별로 AI 분석 결과를 생성합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// ES 모듈에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRANDS = ['MLB', 'MLB KIDS', 'Discovery', 'Duvetica', 'SERGIO TACCHINI'];
const MONTHS = ['202410', '202510']; // 전년, 당년

/**
 * CSV 파일 읽기
 */
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${filePath}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

/**
 * 브랜드별 계층 구조 데이터 집계
 */
function aggregateHierarchy(data) {
  const hierarchy = {};
  
  data.forEach(row => {
    const l1 = row.category_l1 || '미분류';
    const l2 = row.category_l2 || '미분류';
    const l3 = row.category_l3 || '미분류';
    const amount = parseFloat(row.amount) || 0;
    
    if (!hierarchy[l1]) {
      hierarchy[l1] = { amount: 0, children: {} };
    }
    hierarchy[l1].amount += amount;
    
    if (!hierarchy[l1].children[l2]) {
      hierarchy[l1].children[l2] = { amount: 0, children: {} };
    }
    hierarchy[l1].children[l2].amount += amount;
    
    if (!hierarchy[l1].children[l2].children[l3]) {
      hierarchy[l1].children[l2].children[l3] = { amount: 0 };
    }
    hierarchy[l1].children[l2].children[l3].amount += amount;
  });
  
  return hierarchy;
}

/**
 * OpenAI를 사용하여 비용 계정 분석
 */
async function analyzeCategory(brand, level, categoryName, currentAmount, prevAmount, subcategories = null) {
  const diff = currentAmount - prevAmount;
  const yoy = prevAmount > 0 ? ((diff / prevAmount) * 100).toFixed(1) : 0;
  
  let prompt = `당신은 패션 브랜드의 재무 분석 전문가입니다.

브랜드: ${brand}
비용 카테고리: ${categoryName} (${level})
전년 동월 비용: ${(prevAmount / 1000000).toFixed(0)}백만원
당년 비용: ${(currentAmount / 1000000).toFixed(0)}백만원
증감: ${diff >= 0 ? '+' : ''}${(diff / 1000000).toFixed(0)}백만원 (${yoy}%)
`;

  if (subcategories && Object.keys(subcategories).length > 0) {
    prompt += `\n하위 카테고리:\n`;
    Object.entries(subcategories).forEach(([name, data]) => {
      const subDiff = data.amount - (data.prev_amount || 0);
      prompt += `- ${name}: ${(data.amount / 1000000).toFixed(0)}백만원 (${subDiff >= 0 ? '+' : ''}${(subDiff / 1000000).toFixed(0)}백만원)\n`;
    });
  }

  prompt += `\n위 비용 변동에 대해 **30자 이내**로 핵심 인사이트를 제공해주세요. 
예시: "매장 확장으로 임차료 증가", "광고 집행 축소로 감소", "신규 직원 채용으로 증가"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 간결하고 명확한 재무 분석가입니다. 30자 이내로 핵심만 전달하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`❌ AI 분석 실패 (${categoryName}):`, error.message);
    return `전년 대비 ${Math.abs(yoy)}% ${yoy >= 0 ? '증가' : '감소'}`;
  }
}

/**
 * 계층별 인사이트 생성
 */
async function generateInsights(brand, currentData, prevData) {
  console.log(`\n🔍 ${brand} 인사이트 생성 중...`);
  
  const currentHierarchy = aggregateHierarchy(currentData);
  const prevHierarchy = aggregateHierarchy(prevData);
  
  const insights = [];
  
  // L1 분석
  for (const [l1Name, l1Data] of Object.entries(currentHierarchy)) {
    const prevL1Amount = prevHierarchy[l1Name]?.amount || 0;
    
    console.log(`  📊 L1: ${l1Name}`);
    const l1Insight = await analyzeCategory(
      brand,
      'CATEGORY_L1',
      l1Name,
      l1Data.amount,
      prevL1Amount,
      l1Data.children
    );
    
    insights.push({
      brand,
      level: 'L1',
      category_l1: l1Name,
      category_l2: '',
      category_l3: '',
      current_amount: Math.round(l1Data.amount),
      prev_amount: Math.round(prevL1Amount),
      diff: Math.round(l1Data.amount - prevL1Amount),
      yoy: prevL1Amount > 0 ? Math.round(((l1Data.amount - prevL1Amount) / prevL1Amount) * 100) : 0,
      insight: l1Insight,
    });
    
    // L2 분석
    for (const [l2Name, l2Data] of Object.entries(l1Data.children)) {
      const prevL2Amount = prevHierarchy[l1Name]?.children[l2Name]?.amount || 0;
      
      console.log(`    📊 L2: ${l2Name}`);
      const l2Insight = await analyzeCategory(
        brand,
        'CATEGORY_L2',
        l2Name,
        l2Data.amount,
        prevL2Amount,
        l2Data.children
      );
      
      insights.push({
        brand,
        level: 'L2',
        category_l1: l1Name,
        category_l2: l2Name,
        category_l3: '',
        current_amount: Math.round(l2Data.amount),
        prev_amount: Math.round(prevL2Amount),
        diff: Math.round(l2Data.amount - prevL2Amount),
        yoy: prevL2Amount > 0 ? Math.round(((l2Data.amount - prevL2Amount) / prevL2Amount) * 100) : 0,
        insight: l2Insight,
      });
      
      // L3 분석
      for (const [l3Name, l3Data] of Object.entries(l2Data.children)) {
        const prevL3Amount = prevHierarchy[l1Name]?.children[l2Name]?.children[l3Name]?.amount || 0;
        
        console.log(`      📊 L3: ${l3Name}`);
        const l3Insight = await analyzeCategory(
          brand,
          'CATEGORY_L3',
          l3Name,
          l3Data.amount,
          prevL3Amount
        );
        
        insights.push({
          brand,
          level: 'L3',
          category_l1: l1Name,
          category_l2: l2Name,
          category_l3: l3Name,
          current_amount: Math.round(l3Data.amount),
          prev_amount: Math.round(prevL3Amount),
          diff: Math.round(l3Data.amount - prevL3Amount),
          yoy: prevL3Amount > 0 ? Math.round(((l3Data.amount - prevL3Amount) / prevL3Amount) * 100) : 0,
          insight: l3Insight,
        });
      }
    }
  }
  
  return insights;
}

/**
 * CSV 저장
 */
function saveInsightsToCSV(insights, brand, month) {
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'ledger_insights');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `${brand.replace(/\s+/g, '_')}_${month}_insights.csv`);
  
  const headers = 'brand,level,category_l1,category_l2,category_l3,current_amount,prev_amount,diff,yoy,insight\n';
  const rows = insights.map(row => 
    `"${row.brand}","${row.level}","${row.category_l1}","${row.category_l2}","${row.category_l3}",${row.current_amount},${row.prev_amount},${row.diff},${row.yoy},"${row.insight}"`
  ).join('\n');
  
  fs.writeFileSync(outputPath, headers + rows, 'utf-8');
  console.log(`✅ 저장 완료: ${outputPath}`);
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🚀 비용 계정별 AI 인사이트 생성 시작\n');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }
  
  for (const brand of BRANDS) {
    const currentMonth = '202510';
    const prevMonth = '202410';
    
    // 데이터 파일 경로
    const currentFilePath = path.join(__dirname, '..', 'public', 'data', 'costs', `costs_${currentMonth}.csv`);
    const prevFilePath = path.join(__dirname, '..', 'public', 'data', 'costs', `costs_${prevMonth}.csv`);
    
    // 데이터 읽기
    const currentAllData = readCSV(currentFilePath);
    const prevAllData = readCSV(prevFilePath);
    
    // 브랜드 필터링
    const currentData = currentAllData.filter(row => row.brand === brand);
    const prevData = prevAllData.filter(row => row.brand === brand);
    
    if (currentData.length === 0) {
      console.log(`⚠️  ${brand}: 데이터 없음`);
      continue;
    }
    
    // 인사이트 생성
    const insights = await generateInsights(brand, currentData, prevData);
    
    // CSV 저장
    saveInsightsToCSV(insights, brand, currentMonth);
    
    // API 호출 제한 방지 (1초 대기)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ 모든 브랜드의 인사이트 생성 완료!');
}

main().catch(console.error);

