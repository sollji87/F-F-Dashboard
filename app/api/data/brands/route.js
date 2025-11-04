import { NextResponse } from 'next/server';
import { getAllBrandsSummary } from '@/lib/mockData';

/**
 * GET /api/data/brands
 * 모든 브랜드 요약 정보 반환
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202412';
    
    const brands = getAllBrandsSummary(month);
    
    return NextResponse.json({
      success: true,
      data: brands,
      month,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

