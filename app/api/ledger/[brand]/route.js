import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * 브랜드별 원장 데이터 조회 API (간소화 버전)
 * GET /api/ledger/[brand]?month=202410
 */
export async function GET(request, { params }) {
  try {
    // Next.js 16: params는 Promise이므로 await 필요
    const { brand } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '202510';
    
    console.log('\n========================================');
    console.log('📡 API /api/ledger/[brand] called');
    console.log('   Brand:', brand);
    console.log('   Month:', month);
    console.log('========================================\n');
    
    // 비용 데이터 파일 경로
    const costsFilePath = path.join(process.cwd(), 'public', 'data', 'costs', `costs_${month}.csv`);
    console.log('📂 File path:', costsFilePath);
    console.log('📂 File exists:', fs.existsSync(costsFilePath));
    
    if (!fs.existsSync(costsFilePath)) {
      console.error('❌ File not found!');
      return NextResponse.json({
        success: false,
        error: `비용 데이터 파일을 찾을 수 없습니다: costs_${month}.csv`
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
    
    // 모든 브랜드 목록 확인
    const allBrands = [...new Set(records.map(r => r.brand))];
    console.log(`📊 All brands in file:`, allBrands);
    
    // 브랜드명 정규화 (언더스코어를 공백으로 변환)
    const normalizedBrand = brand.replace(/_/g, ' ');
    console.log(`🔍 Looking for brand: "${brand}" (normalized: "${normalizedBrand}")`);
    
    // 브랜드 데이터 필터링
    const brandData = records.filter(row => {
      if (!row || !row.brand) {
        return false;
      }
      const rowBrand = row.brand.trim().toUpperCase();
      const searchBrand = normalizedBrand.trim().toUpperCase();
      const match = rowBrand === searchBrand;
      
      if (records.indexOf(row) < 5) {
        console.log(`   Comparing: "${row.brand}" vs "${normalizedBrand}" = ${match}`);
      }
      return match;
    });
    
    console.log(`✅ Filtered records for ${brand}: ${brandData.length}`);
    
    if (brandData.length > 0) {
      console.log(`✅ Sample filtered record:`, brandData[0]);
    }
    
    // 데이터 처리
    const processedData = brandData.map(row => ({
      brand: row.brand || '',
      category_l1: row.category_l1 || '',
      category_l2: row.category_l2 || '',
      category_l3: row.category_l3 || '',
      gl_account: row.gl_account || '',
      amount: parseFloat(row.amount) || 0,
      year_month: row.year_month || month,
    }));
    
    // 총액 계산
    const totalAmount = processedData.reduce((sum, row) => sum + row.amount, 0);
    
    console.log(`💰 Total amount: ${totalAmount}`);
    
    // 전년 데이터 불러오기 (작년 같은 달)
    const prevYear = parseInt(month.substring(0, 4)) - 1;
    const prevMonth = `${prevYear}${month.substring(4, 6)}`;
    const prevFilePath = path.join(process.cwd(), 'public', 'data', 'costs', `costs_${prevMonth}.csv`);
    
    let prevYearData = [];
    if (fs.existsSync(prevFilePath)) {
      console.log(`📂 Loading previous year data: ${prevMonth}`);
      let prevFileContent = fs.readFileSync(prevFilePath, 'utf-8');
      if (prevFileContent.charCodeAt(0) === 0xFEFF) {
        prevFileContent = prevFileContent.slice(1);
      }
      const prevRecords = parse(prevFileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
      
      const prevBrandData = prevRecords.filter(row => {
        if (!row || !row.brand) return false;
        const rowBrand = row.brand.trim().toUpperCase();
        const searchBrand = normalizedBrand.trim().toUpperCase();
        return rowBrand === searchBrand;
      });
      
      prevYearData = prevBrandData.map(row => ({
        brand: row.brand || '',
        category_l1: row.category_l1 || '',
        category_l2: row.category_l2 || '',
        category_l3: row.category_l3 || '',
        gl_account: row.gl_account || '',
        amount: parseFloat(row.amount) || 0,
        year_month: prevMonth,
      }));
      
      console.log(`✅ Previous year records: ${prevYearData.length}`);
    } else {
      console.log(`⚠️ No previous year data found: ${prevMonth}`);
    }
    
    console.log('========================================\n');
    
    return NextResponse.json({
      success: true,
      data: {
        brand: brand,
        month: month,
        total_amount: Math.round(totalAmount),
        total_transactions: processedData.length,
        categories: [],
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
