import { NextResponse } from 'next/server';
import { loadCategoryInsightsFromCSV, saveCategoryInsightsToCSV } from '@/lib/aiInsightsLoader';

/**
 * POST /api/insights/category
 * 특정 대분류 카테고리에 대한 AI 인사이트 생성/로드
 * CSV 파일이 있으면 로드, 없으면 생성 후 저장
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
    
    // CSV 파일이 없으면 구조화된 분석 생성
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
    
    // CSV 파일로 저장
    const saved = saveCategoryInsightsToCSV(brandCode, category, month, insights);
    
    return NextResponse.json({
      success: true,
      insights,
      source: saved ? 'csv_created' : 'structured',
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

