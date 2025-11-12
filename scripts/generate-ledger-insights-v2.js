/**
 * 비용 계정별 AI 인사이트 생성 스크립트 V2
 * 실제 전표 데이터를 읽어서 OpenAI로 분석
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRANDS = ['MLB', 'MLB KIDS', 'DUVETICA', 'Discovery', 'SERGIO TACCHINI'];
const CURRENT_MONTH = '202510';
const PREV_MONTH = '202410';

// 고정 인사이트 (특정 계정에 대해 동일한 설명)
const FIXED_INSIGHTS = {
  '복리후생비_의료/건강': '전년 산재보험료 환급 발생',
  '복리후생비_의료_건강': '전년 산재보험료 환급 발생',
};

/**
 * CSV 파일 읽기
 */
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length <= 1) return [];
  
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    // CSV 파싱 (따옴표 처리)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

/**
 * 전표 데이터 요약 - 텍스트 중심 (전체 분석)
 */
function summarizeTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    return { total: 0, count: 0, items: [], keywords: [] };
  }
  
  let total = 0;
  const items = [];
  const textFrequency = {}; // 키워드 빈도 분석
  
  transactions.forEach(row => {
    const amount = parseFloat(row['금액(현지 통화)']) || 0;
    const text = row['텍스트'] || '';
    const costCenter = row['코스트센터명'] || '';
    
    total += amount;
    
    // 모든 전표의 텍스트와 금액 저장
    if (text) {
      items.push({
        text: text.substring(0, 80), // 텍스트 길이 제한
        amount,
        costCenter,
      });
      
      // 키워드 추출 (한글, 영문, 숫자만)
      const words = text.match(/[가-힣a-zA-Z0-9]+/g) || [];
      words.forEach(word => {
        if (word.length >= 2) { // 2글자 이상만
          textFrequency[word] = (textFrequency[word] || 0) + 1;
        }
      });
    }
  });
  
  // 금액 절대값 순으로 정렬
  items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  
  // 빈도 높은 키워드 추출 (상위 20개)
  const keywords = Object.entries(textFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, freq]) => `${word}(${freq}건)`);
  
  return { 
    total, 
    count: transactions.length, 
    items: items.slice(0, 30), // 상위 30개 전표
    keywords, // 전체 키워드 요약
  };
}

/**
 * OpenAI로 전표 데이터 분석
 */
async function analyzeWithTransactions(brand, accountName, prevData, currData) {
  const prevSummary = summarizeTransactions(prevData);
  const currSummary = summarizeTransactions(currData);
  
  const diff = currSummary.total - prevSummary.total;
  const yoy = prevSummary.total !== 0 
    ? ((diff / prevSummary.total) * 100).toFixed(1) 
    : 0;
  
  // 전년/당년 텍스트 비교
  const prevTexts = prevSummary.items.map(item => `${item.text} (${(item.amount / 1000000).toFixed(1)}백만)`);
  const currTexts = currSummary.items.map(item => `${item.text} (${(item.amount / 1000000).toFixed(1)}백만)`);
  
  // 신규/제거 키워드 찾기
  const prevKeywordSet = new Set(prevSummary.keywords.map(k => k.split('(')[0]));
  const currKeywordSet = new Set(currSummary.keywords.map(k => k.split('(')[0]));
  
  const newKeywords = [...currKeywordSet].filter(k => !prevKeywordSet.has(k)).slice(0, 5);
  const removedKeywords = [...prevKeywordSet].filter(k => !currKeywordSet.has(k)).slice(0, 5);
  
  let prompt = `당신은 패션 브랜드의 재무 분석 전문가입니다. 전표 텍스트를 **매우 꼼꼼히** 비교하여 구체적인 변동 원인을 찾아야 합니다.

브랜드: ${brand}
계정: ${accountName}

【전년 (${PREV_MONTH.substring(0, 4)}년 ${parseInt(PREV_MONTH.substring(4, 6))}월)】
- 총액: ${(prevSummary.total / 1000000).toFixed(0)}백만원 (${prevSummary.count}건)
- 주요 키워드: ${prevSummary.keywords.slice(0, 10).join(', ')}
- 주요 전표 (금액 큰 순 상위 30개):
${prevTexts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

【당년 (${CURRENT_MONTH.substring(0, 4)}년 ${parseInt(CURRENT_MONTH.substring(4, 6))}월)】
- 총액: ${(currSummary.total / 1000000).toFixed(0)}백만원 (${currSummary.count}건)
- 주요 키워드: ${currSummary.keywords.slice(0, 10).join(', ')}
- 주요 전표 (금액 큰 순 상위 30개):
${currTexts.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

【변동 분석】
- 차이: ${diff >= 0 ? '+' : ''}${(diff / 1000000).toFixed(0)}백만원 (${yoy}%)
${newKeywords.length > 0 ? `- 신규 키워드: ${newKeywords.join(', ')}` : ''}
${removedKeywords.length > 0 ? `- 제거된 키워드: ${removedKeywords.join(', ')}` : ''}

**분석 지침:**
1. 전년과 당년의 전표 텍스트를 **한 줄씩 비교**하세요
2. 신규로 등장한 구체적인 이름/프로젝트를 찾으세요 (예: "카리나", "뉴진스", "특정 캠페인명")
3. 사라진 항목이나 금액이 크게 변동된 항목을 찾으세요
4. 키워드 변화도 참고하세요

**30자 이내**로 가장 구체적이고 핵심적인 원인을 작성하세요.

좋은 예시:
- "신규 모델(카리나) 계약으로 비용 증가"
- "온라인 광고 캠페인(MLB X 뉴진스) 확대"
- "매장 리뉴얼 공사 완료로 비용 감소"

나쁜 예시 (너무 일반적):
- "광고비 증가"
- "비용 감소"
- "전년 대비 변동"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 전표 텍스트를 한 줄씩 꼼꼼히 비교하여 구체적인 변동 원인(인명, 프로젝트명, 캠페인명 등)을 찾아내는 재무 분석 전문가입니다. 일반적인 표현 대신 구체적인 고유명사를 반드시 포함하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // 더 정확한 분석
      max_tokens: 150,
    });

    let insight = response.choices[0].message.content.trim();
    
    // 따옴표 제거 (CSV 파싱 오류 방지)
    insight = insight.replace(/^["']|["']$/g, ''); // 앞뒤 따옴표 제거
    insight = insight.replace(/"/g, ''); // 내부 따옴표 제거
    insight = insight.replace(/^-\s*/, ''); // 맨 앞 "- " 제거
    
    return insight;
  } catch (error) {
    console.error(`❌ AI 분석 실패 (${accountName}):`, error.message);
    return `전년 대비 ${Math.abs(yoy)}% ${yoy >= 0 ? '증가' : '감소'}`;
  }
}

/**
 * L3 계정별 인사이트 생성
 */
async function generateL3Insights(brand) {
  console.log(`\n🔍 ${brand} L3 계정별 인사이트 생성 중...`);
  
  const glDir = path.join(__dirname, '..', 'public', 'data', 'gl_analysis', brand);
  
  if (!fs.existsSync(glDir)) {
    console.error(`❌ GL 분석 폴더 없음: ${glDir}`);
    return [];
  }
  
  // 모든 L3 계정 파일 찾기 (combined 제외)
  const files = fs.readdirSync(glDir)
    .filter(f => f.endsWith(`_${CURRENT_MONTH}.csv`));
  
  console.log(`📊 총 ${files.length}개 계정 발견`);
  
  const insights = [];
  let processed = 0;
  
  for (const file of files) {
    const accountName = file.replace(`_${CURRENT_MONTH}.csv`, '');
    const prevFile = `${accountName}_${PREV_MONTH}.csv`;
    
    const currPath = path.join(glDir, file);
    const prevPath = path.join(glDir, prevFile);
    
    // 전년/당년 데이터 읽기
    const currData = readCSV(currPath);
    const prevData = fs.existsSync(prevPath) ? readCSV(prevPath) : [];
    
    if (currData.length === 0) {
      console.log(`  ⚠️  ${accountName}: 데이터 없음`);
      continue;
    }
    
    // 카테고리 정보 추출
    const firstRow = currData[0];
    const l1 = firstRow['CATEGORY_L1'] || '';
    const l2 = firstRow['CATEGORY_L2'] || '';
    const l3 = firstRow['CATEGORY_L3'] || accountName;
    
    console.log(`  📊 L3: ${l3}`);
    
    // 고정 인사이트 확인
    let insight;
    if (FIXED_INSIGHTS[accountName] || FIXED_INSIGHTS[l3]) {
      insight = FIXED_INSIGHTS[accountName] || FIXED_INSIGHTS[l3];
      console.log(`    ✅ 고정 인사이트 적용`);
    } else {
      // AI 분석
      insight = await analyzeWithTransactions(brand, accountName, prevData, currData);
    }
    
    // 금액 집계
    const currAmount = currData.reduce((sum, row) => sum + (parseFloat(row['금액(현지 통화)']) || 0), 0);
    const prevAmount = prevData.reduce((sum, row) => sum + (parseFloat(row['금액(현지 통화)']) || 0), 0);
    const diff = currAmount - prevAmount;
    const yoy = prevAmount !== 0 ? Math.round((diff / prevAmount) * 100) : 0;
    
    insights.push({
      brand,
      level: 'L3',
      category_l1: l1,
      category_l2: l2,
      category_l3: l3,
      current_amount: Math.round(currAmount),
      prev_amount: Math.round(prevAmount),
      diff: Math.round(diff),
      yoy,
      insight,
    });
    
    processed++;
    
    // API 호출 제한 방지 (0.5초 대기)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 진행상황 표시
    if (processed % 10 === 0) {
      console.log(`  ✅ ${processed}/${files.length} 완료...`);
    }
  }
  
  console.log(`✅ ${brand} 총 ${insights.length}개 인사이트 생성 완료`);
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
  console.log('🚀 비용 계정별 AI 인사이트 생성 시작 (V2 - 전표 데이터 기반)\n');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }
  
  console.log(`📌 총 ${BRANDS.length}개 브랜드 처리`);
  console.log(`   브랜드: ${BRANDS.join(', ')}\n`);
  
  for (const brand of BRANDS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏷️  브랜드: ${brand}`);
    console.log('='.repeat(60));
    
    const insights = await generateL3Insights(brand);
    
    if (insights.length > 0) {
      saveInsightsToCSV(insights, brand, CURRENT_MONTH);
    } else {
      console.log(`⚠️  ${brand}: 인사이트 없음`);
    }
    
    // 브랜드 간 대기 (1초)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 모든 브랜드의 인사이트 생성 완료!');
  console.log('='.repeat(60));
}

main().catch(console.error);

