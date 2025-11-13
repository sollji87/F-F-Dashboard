import { NextResponse } from 'next/server';
import { loadCategoryInsightsFromCSV, saveCategoryInsightsToCSV } from '@/lib/aiInsightsLoader';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// OpenAI는 런타임에만 초기화 (빌드 타임 에러 방지)
let OpenAI;
let openai;

if (process.env.OPENAI_API_KEY) {
  try {
    OpenAI = require('openai').OpenAI;
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.warn('⚠️  OpenAI 모듈 로드 실패:', error.message);
  }
}

/**
 * 렛저 인사이트 데이터 로드 (카테고리별 상세 분석)
 */
function loadLedgerInsightsForCategory(brandCode, month, category) {
  try {
    const brandNameMap = {
      'MLB': 'MLB',
      'MLB_KIDS': 'MLB_KIDS',
      'DISCOVERY': 'Discovery',
      'DUVETICA': 'Duvetica',
      'SERGIO_TACCHINI': 'SERGIO_TACCHINI',
    };
    
    const brandName = brandNameMap[brandCode];
    const ledgerPath = path.join(process.cwd(), 'public', 'data', 'ledger_insights', `${brandName}_${month}_insights.csv`);
    
    if (!fs.existsSync(ledgerPath)) {
      console.log(`⚠️  렛저 인사이트 파일 없음: ${brandName}_${month}_insights.csv`);
      return [];
    }
    
    const ledgerCsv = fs.readFileSync(ledgerPath, 'utf-8').replace(/^\uFEFF/, '');
    const ledgerData = parse(ledgerCsv, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
    
    // 해당 카테고리의 L3 레벨만 필터링 (금액 큰 순 상위 15개)
    const l3Items = ledgerData
      .filter(row => row.level === 'L3' && row.category_l1 === category)
      .map(row => ({
        category_l2: row.category_l2,
        category_l3: row.category_l3,
        current_amount: parseFloat(row.current_amount || 0),
        prev_amount: parseFloat(row.prev_amount || 0),
        diff: parseFloat(row.diff || 0),
        yoy: parseFloat(row.yoy || 0),
        insight: row.insight || '',
      }))
      .sort((a, b) => Math.abs(b.current_amount) - Math.abs(a.current_amount))
      .slice(0, 15);
    
    console.log(`✅ ${category} 렛저 인사이트 로드: ${l3Items.length}개 항목`);
    return l3Items;
  } catch (error) {
    console.error(`❌ 렛저 인사이트 로드 실패:`, error.message);
    return [];
  }
}

/**
 * POST /api/insights/category
 * 특정 대분류 카테고리에 대한 AI 인사이트 생성/로드
 * CSV 파일이 있으면 로드, 없으면 OpenAI로 생성 후 저장
 */
export async function POST(request) {
  try {
    const { brand, brandCode, month, category, totalAmount, topL2, topL3 } = await request.json();
    
    console.log(`📊 카테고리 인사이트 요청:`, { brand, month, category });
    
    // CSV에서 기존 인사이트 로드 시도
    const existingInsights = loadCategoryInsightsFromCSV(brandCode, category, month);
    
    if (existingInsights) {
      console.log(`✅ CSV에서 카테고리 인사이트 로드: ${brandCode}_${category}_${month}`);
      return NextResponse.json({
        success: true,
        insights: existingInsights,
        source: 'csv',
      });
    }
    
    // OpenAI API 키가 없으면 fallback
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY가 설정되지 않음. Fallback 인사이트 사용.');
      const monthLabel = `${month.substring(0, 4)}년 ${month.substring(4, 6)}월`;
      
      const insights = {
        summary: `${brand}의 ${monthLabel} ${category} 비용은 총 ${totalAmount.toLocaleString()}백만원입니다. 주요 중분류는 ${topL2.map(item => item.name).slice(0, 3).join(', ')} 등으로 구성되어 있습니다.`,
        key_findings: [
          `${category} 총 비용: ${totalAmount.toLocaleString()}백만원`,
          `주요 중분류 TOP 3: ${topL2.slice(0, 3).map(item => `${item.name} (${item.amount.toLocaleString()}백만원)`).join(', ')}`,
          `주요 소분류 항목: ${topL3.slice(0, 3).map(item => item.name).join(', ')}`,
        ],
        risks: [
          `${topL2[0]?.name || '주요 항목'}의 비용 비중이 높아 해당 항목의 변동성에 민감`,
          '세부 항목별 비용 관리 필요',
        ],
        action_items: [
          `${topL2[0]?.name || '주요 항목'}에 대한 상세 분석 및 최적화 검토`,
          '예산 대비 실적 비교를 통한 차이 원인 분석',
          '전년 동월 대비 증감 원인 파악 및 대응 방안 수립',
        ],
      };
      
      return NextResponse.json({
        success: true,
        insights,
        source: 'fallback',
      });
    }
    
    // 렛저 인사이트 데이터 로드
    const ledgerInsights = loadLedgerInsightsForCategory(brandCode, month, category);
    
    // 렛저 인사이트 포맷팅
    const ledgerSummary = ledgerInsights.length > 0 
      ? ledgerInsights.map(item => 
          `- ${item.category_l2} > ${item.category_l3}: ${(item.current_amount / 1000000).toFixed(0)}백만원 (YOY ${item.yoy.toFixed(1)}%, ${item.diff >= 0 ? '+' : ''}${(item.diff / 1000000).toFixed(0)}백만원) - ${item.insight}`
        ).join('\n')
      : '상세 데이터 없음';
    
    // OpenAI로 AI 인사이트 생성
    const monthLabel = `${month.substring(0, 4)}년 ${month.substring(4, 6)}월`;
    
    const prompt = `당신은 패션 브랜드의 재무 분석 전문가입니다. 다음 **${category}** 카테고리 비용 데이터를 **깊이 있게 분석**하여 실용적이고 구체적인 인사이트를 제공해주세요.

## 📊 기본 정보
- 브랜드: ${brand}
- 기준월: ${monthLabel}
- 카테고리: ${category}
- 총 비용: ${totalAmount.toLocaleString()}백만원

## 🎯 중분류별 비용 (TOP ${topL2.length})
${topL2.map((item, idx) => `${idx + 1}. ${item.name}: ${item.amount.toLocaleString()}백만원`).join('\n')}

## 📋 소분류별 비용 (TOP ${topL3.length})
${topL3.map((item, idx) => `${idx + 1}. ${item.name}: ${item.amount.toLocaleString()}백만원`).join('\n')}

## 📋 계정별 상세 내역 (금액 큰 순 TOP 15)
${ledgerSummary}

## 🔍 분석 요구사항
1. **비용 구조 분석**: 중분류/소분류별 비중과 특징을 파악하세요
2. **변동 원인 분석**: 계정별 상세 내역의 인사이트를 참고하여 구체적인 증감 원인을 설명하세요
3. **리스크 식별**: 비용 증가 리스크, 비효율 요인을 찾으세요
4. **실행 제안**: 구체적이고 즉시 실행 가능한 액션 아이템을 제시하세요 (부서명 제외)

## 📝 출력 형식 (JSON)
{
  "summary": "전체 요약 (2-3문장, 핵심 수치와 구체적 계정명 포함)",
  "key_findings": ["주요 발견사항 1 (구체적 수치와 계정명 포함)", "주요 발견사항 2", "주요 발견사항 3"],
  "risks": ["리스크 요인 1 (영향도 포함)", "리스크 요인 2"],
  "action_items": ["실행 가능한 액션 1", "실행 가능한 액션 2", "실행 가능한 액션 3"]
}`;

    console.log(`🤖 AI 분석 중 (gpt-4o) [${brand} ${category} ${month}]...`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 패션 브랜드의 재무 및 비용 분석 전문가입니다. 계정별 상세 내역을 참고하여 구체적이고 실용적인 인사이트를 제공합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });
    
    const insights = JSON.parse(completion.choices[0].message.content);
    console.log(`✅ AI 분석 완료 [${brand} ${category} ${month}]`);
    
    // CSV 파일로 저장
    const saved = saveCategoryInsightsToCSV(brandCode, category, month, insights);
    
    return NextResponse.json({
      success: true,
      insights,
      source: saved ? 'ai_generated' : 'ai_generated_not_saved',
    });
  } catch (error) {
    console.error('Category Insights API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        fallback_insights: {
          summary: '카테고리 인사이트를 생성할 수 없습니다.',
          key_findings: ['데이터 분석 중 오류 발생'],
          risks: ['시스템 오류'],
          action_items: ['관리자에게 문의'],
        },
      },
      { status: 500 }
    );
  }
}

