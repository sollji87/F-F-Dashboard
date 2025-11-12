import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * 브랜드별 원장 데이터 조회 API (YTD 지원)
 * GET /api/ledger/[brand]?month=202410&mode=monthly
 */
export async function GET(request, { params }) {
  try {
    // Next.js 16: params는 Promise이므로 await 필요
    const { brand } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202510';
    const mode = searchParams.get('mode') || 'monthly'; // 'monthly' or 'ytd'
    
    console.log('\n========================================');
    console.log('📡 API /api/ledger/[brand] called');
    console.log('   Brand:', brand);
    console.log('   Month:', month);
    console.log('   Mode:', mode);
    console.log('========================================\n');
    
    // snowflake_costs.csv 사용 (전체 월별 데이터)
    const costsFilePath = path.join(process.cwd(), 'public', 'data', 'snowflake_costs.csv');
    console.log('📂 File path:', costsFilePath);
    console.log('📂 File exists:', fs.existsSync(costsFilePath));
    
    if (!fs.existsSync(costsFilePath)) {
      console.error('❌ File not found!');
      return NextResponse.json({
        success: false,
        error: `비용 데이터 파일을 찾을 수 없습니다: snowflake_costs.csv`
      }, { status: 404 });
    }
    
    // CSV 파일 읽기 (BOM 제거)
    let fileContent = fs.readFileSync(costsFilePath, 'utf-8');
    
    // BOM 제거
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
    
    console.log(`📊 Total records: ${records.length}`);
    console.log(`📊 First record:`, records[0]);
    
    // 브랜드명 정규화 (언더스코어를 공백으로 변환)
    const normalizedBrand = brand.replace(/_/g, ' ').toUpperCase();
    console.log(`🔍 Looking for brand: "${brand}" (normalized: "${normalizedBrand}")`);
    
    // 당년 및 전년 계산
    const currentYear = month.substring(0, 4);
    const currentMonth = month.substring(4, 6);
    const prevYear = (parseInt(currentYear) - 1).toString();
    
    // 브랜드 데이터 필터링 및 처리
    const filterAndProcess = (records, yearFilter, monthFilter, isYTD = false) => {
      return records
        .filter(row => {
          if (!row || !row.BRD_NM) return false;
          
          const rowBrand = row.BRD_NM.trim().toUpperCase();
          const rowMonth = row.YYYYMM || '';
          const rowYear = rowMonth.substring(0, 4);
          const rowMonthNum = rowMonth.substring(4, 6);
          
          // 브랜드 매칭
          if (rowBrand !== normalizedBrand) return false;
          
          // 연도 매칭
          if (rowYear !== yearFilter) return false;
          
          // 월 매칭 (YTD: 1월~선택월, Monthly: 선택월만)
          if (isYTD) {
            return parseInt(rowMonthNum) <= parseInt(monthFilter);
          } else {
            return rowMonthNum === monthFilter;
          }
        })
        .map(row => ({
          brand: row.BRD_NM || '',
          category_l1: row.CATEGORY_L1 || '',
          category_l2: row.CATEGORY_L2 || '',
          category_l3: row.CATEGORY_L3 || '',
          gl_account: row.GL_NM || '',
          amount: parseFloat(row.COST_AMT) || 0,
          year_month: row.YYYYMM || '',
        }));
    };
    
    // 당년 데이터
    const isYTD = mode === 'ytd';
    const processedData = filterAndProcess(records, currentYear, currentMonth, isYTD);
    
    // 전년 데이터
    const prevYearData = filterAndProcess(records, prevYear, currentMonth, isYTD);
    
    console.log(`✅ Current year records: ${processedData.length}`);
    console.log(`✅ Previous year records: ${prevYearData.length}`);
    console.log('========================================\n');
    
    return NextResponse.json({
      success: true,
      data: {
        brand: brand,
        month: month,
        mode: mode,
        total_transactions: processedData.length,
        details: processedData,
        prev_year_details: prevYearData,
      }
    });
    
  } catch (error) {
    console.error('💥 API Error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
