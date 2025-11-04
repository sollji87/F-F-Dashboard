import { NextResponse } from 'next/server';
import { loadAllBrandsSummary } from '@/lib/dataLoader';
import { getAllBrandsSummary } from '@/lib/mockData';

/**
 * GET /api/data/brands
 * 모든 브랜드 요약 정보 반환 (실제 데이터 우선, Mock 데이터 fallback)
 */
export async function GET(request) {
  console.log('📡 GET /api/data/brands 요청 받음');
  
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202510'; // 기본값 25년 10월
    
    console.log('📅 요청 월:', month);
    
    // 실제 데이터 로드 시도
    try {
      console.log('🔄 loadAllBrandsSummary 호출 시작...');
      const brands = await loadAllBrandsSummary(month);
      console.log('✅ loadAllBrandsSummary 완료, 브랜드 수:', brands.length);
      
      return NextResponse.json({
        success: true,
        data: brands,
        month,
        data_source: 'real', // Snowflake + CSV
      });
    } catch (realDataError) {
      console.error('❌ 실제 데이터 로딩 실패:', realDataError);
      console.error('에러 스택:', realDataError.stack);
      
      // Mock 데이터로 fallback
      const brands = getAllBrandsSummary(month);
      return NextResponse.json({
        success: true,
        data: brands,
        month,
        data_source: 'mock', // Mock 데이터
        warning: '실제 데이터를 불러올 수 없어 샘플 데이터를 표시합니다.',
        error: realDataError.message,
      });
    }
  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

