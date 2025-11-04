import { NextResponse } from 'next/server';
import { generateBrandDashboard } from '@/lib/mockData';
import { BRAND_INFO } from '@/lib/types';

/**
 * GET /api/data/brand/[code]
 * 특정 브랜드의 상세 대시보드 데이터 반환
 */
export async function GET(request, context) {
  try {
    // Next.js 14+ 에서 params는 Promise일 수 있음
    const params = await Promise.resolve(context.params);
    const { code } = params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202412';
    
    console.log('API 호출:', { code, month }); // 디버깅용
    
    // 브랜드 코드 검증
    if (!BRAND_INFO[code]) {
      console.error('유효하지 않은 브랜드 코드:', code);
      return NextResponse.json(
        { success: false, error: `유효하지 않은 브랜드 코드입니다: ${code}` },
        { status: 404 }
      );
    }
    
    const dashboardData = generateBrandDashboard(code, month);
    console.log('대시보드 데이터 생성 완료:', code);
    
    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

