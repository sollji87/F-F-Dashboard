import { NextResponse } from 'next/server';
import { saveAiInsightsToCSV } from '@/lib/aiInsightsLoader';

/**
 * POST /api/insights/save
 * 월별 AI 인사이트 저장
 */
export async function POST(request) {
  try {
    const { brandCode, month, insights } = await request.json();
    
    if (!brandCode || !month || !insights) {
      return NextResponse.json({
        success: false,
        error: 'brandCode, month, insights가 필요합니다.',
      }, { status: 400 });
    }
    
    // CSV 파일로 저장
    const saved = saveAiInsightsToCSV(brandCode, month, insights);
    
    if (saved) {
      return NextResponse.json({
        success: true,
        message: '인사이트가 저장되었습니다.',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '인사이트 저장에 실패했습니다.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('💥 인사이트 저장 API 에러:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

