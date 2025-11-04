import { NextResponse } from 'next/server';
import { loadAiInsightsFromCSV } from '@/lib/aiInsightsLoader';

/**
 * POST /api/insights
 * CSV에서 미리 생성된 AI 인사이트 로드 (배포용)
 * 로컬에서는 generate-ai-insights.js 스크립트로 인사이트 생성
 */
export async function POST(request) {
  try {
    const { brand, month, brandCode } = await request.json();
    
    // CSV에서 인사이트 로드
    const insights = loadAiInsightsFromCSV(brandCode, month);
    
    if (insights) {
      console.log(`✅ CSV에서 AI 인사이트 로드 성공: ${brandCode}_${month}`);
      return NextResponse.json({
        success: true,
        insights,
        source: 'csv',
      });
    }
    
    // CSV 파일이 없는 경우 fallback 메시지
    return NextResponse.json({
      success: false,
      error: 'AI 인사이트를 찾을 수 없습니다.',
      fallback_insights: {
        summary: `${brand} ${month.substring(0, 4)}년 ${month.substring(4, 6)}월 AI 인사이트가 아직 생성되지 않았습니다.`,
        key_findings: [
          '로컬에서 npm run generate-insights 명령어로 AI 인사이트를 생성해주세요.',
          '생성된 인사이트는 자동으로 배포 환경에 반영됩니다.',
        ],
        risks: ['AI 인사이트 미생성'],
        action_items: ['로컬에서 인사이트 생성 스크립트 실행'],
      },
    });
  } catch (error) {
    console.error('Insights API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        fallback_insights: {
          summary: 'AI 인사이트를 로드할 수 없습니다.',
          key_findings: ['데이터 로드 중 오류 발생'],
          risks: ['시스템 오류'],
          action_items: ['관리자에게 문의'],
        },
      },
      { status: 500 }
    );
  }
}

