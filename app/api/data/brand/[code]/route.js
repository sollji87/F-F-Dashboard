import { NextResponse } from 'next/server';
import { loadBrandData } from '@/lib/dataLoader';
import { generateBrandDashboard } from '@/lib/mockData';
import { BRAND_INFO } from '@/lib/types';

/**
 * GET /api/data/brand/[code]
 * 특정 브랜드의 상세 대시보드 데이터 반환 (실제 데이터 우선)
 */
export async function GET(request, context) {
  try {
    // Next.js 14+ 에서 params는 Promise일 수 있음
    const params = await Promise.resolve(context.params);
    const { code } = params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202509'; // 기본값 25년 9월
    
    console.log('API 호출:', { code, month }); // 디버깅용
    
    // 브랜드 코드 검증
    if (!BRAND_INFO[code]) {
      console.error('유효하지 않은 브랜드 코드:', code);
      return NextResponse.json(
        { success: false, error: `유효하지 않은 브랜드 코드입니다: ${code}` },
        { status: 404 }
      );
    }
    
    // 실제 데이터 로드 시도
    try {
      const dashboardData = await loadBrandData(code, month);
      console.log('실제 데이터 로드 완료:', code, dashboardData.data_source);
      
      return NextResponse.json({
        success: true,
        data: dashboardData,
        data_source: 'real',
      });
    } catch (realDataError) {
      console.warn('실제 데이터 로딩 실패, Mock 데이터 사용:', realDataError.message);
      
      // Mock 데이터로 fallback
      const dashboardData = generateBrandDashboard(code, month);
      console.log('Mock 데이터 생성 완료:', code);
      
      return NextResponse.json({
        success: true,
        data: dashboardData,
        data_source: 'mock',
        warning: '실제 데이터를 불러올 수 없어 샘플 데이터를 표시합니다.',
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

