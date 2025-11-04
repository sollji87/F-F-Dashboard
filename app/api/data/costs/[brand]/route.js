import { NextResponse } from 'next/server';
import { loadCostsFromCSV } from '@/lib/dataLoader';

const BRAND_CODE_MAP = {
  'MLB': 'M',
  'MLB_KIDS': 'I',
  'DISCOVERY': 'X',
  'DUVETICA': 'V',
  'SERGIO_TACCHINI': 'ST',
};

/**
 * GET /api/data/costs/[brand]
 * 특정 브랜드의 원본 비용 데이터 조회 (드릴다운용)
 */
export async function GET(request, context) {
  try {
    // Next.js 15+ context.params 처리
    const params = await Promise.resolve(context.params);
    const { brand: brandCode } = params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202510';
    
    // Snowflake 데이터 로드
    const costsData = await loadCostsFromCSV();
    
    if (!costsData) {
      return NextResponse.json({
        success: false,
        error: 'Snowflake 비용 데이터를 찾을 수 없습니다.',
      });
    }
    
    // 브랜드 코드 변환
    const snowflakeBrandCode = BRAND_CODE_MAP[brandCode] || brandCode;
    
    // 해당 브랜드의 비용 데이터만 필터링
    const brandCosts = costsData.filter(cost => 
      cost.brand_code === snowflakeBrandCode
    );
    
    console.log(`📊 비용 데이터 조회 [${brandCode}]:`, {
      total: costsData.length,
      filtered: brandCosts.length,
      sampleRow: brandCosts[0]
    });
    
    return NextResponse.json({
      success: true,
      data: brandCosts,
    });
  } catch (error) {
    console.error('비용 데이터 API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

