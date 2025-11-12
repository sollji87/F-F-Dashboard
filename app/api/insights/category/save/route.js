import { NextResponse } from 'next/server';
import { saveCategoryInsightsToCSV } from '@/lib/aiInsightsLoader';

/**
 * POST /api/insights/category/save
 * 카테고리별 AI 인사이트를 CSV 파일로 저장
 */
export async function POST(request) {
  try {
    const { brandCode, category, month, insights } = await request.json();
    
    if (!brandCode || !category || !month || !insights) {
      return NextResponse.json({
        success: false,
        error: '필수 파라미터가 누락되었습니다.',
      }, { status: 400 });
    }
    
    console.log(`💾 카테고리 인사이트 저장 요청:`, { brandCode, category, month });
    
    // CSV 파일로 저장
    const saved = saveCategoryInsightsToCSV(brandCode, category, month, insights);
    
    if (saved) {
      return NextResponse.json({
        success: true,
        message: '인사이트가 CSV 파일로 저장되었습니다.',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'CSV 파일 저장에 실패했습니다.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Category Insights Save API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
      },
      { status: 500 }
    );
  }
}

