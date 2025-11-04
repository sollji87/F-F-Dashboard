/**
 * AI 인사이트 생성 및 CSV 저장 스크립트
 * 로컬에서 실행하여 모든 브랜드/월별 AI 인사이트를 미리 생성
 */

import { config } from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local 로드
config({ path: path.join(__dirname, '..', '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BRANDS = ['MLB', 'MLB_KIDS', 'DISCOVERY', 'DUVETICA', 'SERGIO_TACCHINI'];
const MONTHS = ['202501', '202502', '202503', '202504', '202505', '202506', '202507', '202508', '202509', '202510'];

/**
 * 브랜드/월별 데이터 로드
 */
async function loadBrandMonthData(brandCode, month) {
  try {
    // 실제 데이터 로드 (여기서는 간단히 API 호출)
    const response = await fetch(`http://localhost:3000/api/data/brand/${brandCode}?month=${month}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ 데이터 로드 실패 [${brandCode} ${month}]:`, error.message);
    return null;
  }
}

/**
 * AI 인사이트 생성
 */
async function generateInsight(brandCode, month, data) {
  try {
    const { kpi, trendData, categoryMonthly } = data;

    // 월별 추이 데이터 포맷팅
    const trendSummary = trendData?.slice(-6).map(d => 
      `${d.month.substring(4,6)}월: ${d.total_cost.toLocaleString()}백만원 (YOY ${d.yoy.toFixed(1)}%)`
    ).join('\n') || '데이터 없음';

    // 주요 카테고리
    const topCategories = categoryMonthly?.slice(0, 5).map(cat => ({
      name: cat.category,
      amount: cat.current,
      ratio: ((cat.current / kpi.total_cost) * 100).toFixed(1),
    })) || [];

    // 프롬프트 생성
    const prompt = `당신은 비용 분석 전문가입니다. 다음 데이터를 분석하여 인사이트를 제공해주세요.

브랜드: ${brandCode}
기준월: ${month}

KPI 지표:
- 총비용: ${kpi.total_cost?.toLocaleString()}백만원
- 매출대비 비용률: ${kpi.cost_ratio}%
- 인당 비용: ${kpi.cost_per_person}백만원
- 매장당 비용: ${kpi.cost_per_store}백만원
- 전년 대비 증감률(YOY): ${kpi.yoy}%

월별 비용 추이 (최근 6개월):
${trendSummary}

주요 비용 카테고리:
${topCategories.map(cat => `- ${cat.name}: ${cat.amount?.toLocaleString()}백만원 (${cat.ratio}%)`).join('\n')}

분석 관점: 월별 비용 추이 및 YOY 증감 패턴을 분석하여 인사이트를 제공해주세요.

다음 형식으로 JSON 응답을 생성해주세요:
{
  "summary": "전체 요약 (2-3문장)",
  "key_findings": ["주요 발견사항 1", "주요 발견사항 2", "주요 발견사항 3"],
  "risks": ["리스크 요인 1", "리스크 요인 2"],
  "action_items": ["액션 아이템 1", "액션 아이템 2", "액션 아이템 3"]
}`;

    console.log(`🤖 AI 분석 중 [${brandCode} ${month}]...`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 재무 및 비용 분석 전문가입니다. 데이터를 기반으로 실용적이고 구체적인 인사이트를 제공합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const insights = JSON.parse(completion.choices[0].message.content);
    console.log(`✅ AI 분석 완료 [${brandCode} ${month}]`);
    
    return insights;
  } catch (error) {
    console.error(`❌ AI 인사이트 생성 실패 [${brandCode} ${month}]:`, error.message);
    return null;
  }
}

/**
 * CSV 파일로 저장
 */
function saveInsightToCSV(brandCode, month, insights) {
  try {
    const csvPath = path.join(__dirname, '..', 'public', 'data', 'ai_insights', `insights_${brandCode}_${month}.csv`);
    
    // CSV 형식으로 변환
    const csvContent = `field,value
summary,"${insights.summary.replace(/"/g, '""')}"
key_findings,"${insights.key_findings.join('|').replace(/"/g, '""')}"
risks,"${insights.risks.join('|').replace(/"/g, '""')}"
action_items,"${insights.action_items.join('|').replace(/"/g, '""')}"`;

    // UTF-8 BOM 추가
    fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf8');
    console.log(`💾 CSV 저장 완료: ${csvPath}`);
  } catch (error) {
    console.error(`❌ CSV 저장 실패 [${brandCode} ${month}]:`, error.message);
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 AI 인사이트 생성 시작...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const brandCode of BRANDS) {
    for (const month of MONTHS) {
      console.log(`\n📊 처리 중: ${brandCode} - ${month}`);
      
      // 1. 데이터 로드
      const data = await loadBrandMonthData(brandCode, month);
      if (!data || !data.kpi) {
        console.log(`⚠️  데이터 없음, 스킵 [${brandCode} ${month}]`);
        failCount++;
        continue;
      }

      // 2. AI 인사이트 생성
      const insights = await generateInsight(brandCode, month, data);
      if (!insights) {
        failCount++;
        continue;
      }

      // 3. CSV 저장
      saveInsightToCSV(brandCode, month, insights);
      successCount++;

      // API 호출 제한 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n\n🎉 AI 인사이트 생성 완료!');
  console.log(`✅ 성공: ${successCount}건`);
  console.log(`❌ 실패: ${failCount}건`);
  console.log(`\n📁 저장 위치: public/data/ai_insights/\n`);
}

// 스크립트 실행
main().catch(console.error);

