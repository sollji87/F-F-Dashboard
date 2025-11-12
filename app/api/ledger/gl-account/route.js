import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * GL계정별 상세 데이터 조회 API
 * GET /api/ledger/gl-account?brand=MLB&gl_account=광고선전비_매체광고&type=combined
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand');
    const glAccount = searchParams.get('gl_account');
    const type = searchParams.get('type') || 'combined'; // 'combined', '202410', '202510'
    
    if (!brand || !glAccount) {
      return NextResponse.json({
        success: false,
        error: 'brand와 gl_account 파라미터가 필요합니다'
      }, { status: 400 });
    }
    
    // 브랜드명 매핑
    const brandMap = {
      'MLB': 'MLB',
      'MLB_KIDS': 'MLB_KIDS',
      'DISCOVERY': 'Discovery',
      'DUVETICA': 'Duvetica',
      'SERGIO_TACCHINI': 'SERGIO_TACCHINI',
    };
    
    const folderName = brandMap[brand] || brand;
    
    // 파일명 정제 (GL계정명)
    const safeGlName = glAccount
      .replace(/\//g, '_')
      .replace(/\\/g, '_')
      .replace(/:/g, '')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .trim();
    
    // 파일 경로
    const fileName = type === 'combined' 
      ? `${safeGlName}_combined.csv`
      : `${safeGlName}_${type}.csv`;
    
    const filePath = path.join(
      process.cwd(), 
      'public', 
      'data', 
      'gl_analysis', 
      folderName, 
      fileName
    );
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: `파일을 찾을 수 없습니다: ${fileName}`
      }, { status: 404 });
    }
    
    // CSV 파일 읽기
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // 데이터 처리
    const processedData = records.map(row => ({
      brand: row.brand,
      category_l1: row.category_l1 || '',
      category_l2: row.category_l2 || '',
      category_l3: row.category_l3 || '',
      gl_account: row.gl_account || '',
      amount: parseFloat(row.amount) || 0,
      year_month: row.year_month,
    }));
    
    // 월별 집계
    const monthlyAgg = {};
    processedData.forEach(row => {
      const month = row.year_month;
      if (!monthlyAgg[month]) {
        monthlyAgg[month] = {
          month: month,
          amount: 0,
          count: 0,
        };
      }
      monthlyAgg[month].amount += row.amount;
      monthlyAgg[month].count += 1;
    });
    
    const monthlySummary = Object.values(monthlyAgg)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        month: m.month,
        amount: Math.round(m.amount),
        count: m.count,
      }));
    
    // YoY 계산 (combined인 경우)
    let yoyAnalysis = null;
    if (type === 'combined' && monthlySummary.length === 2) {
      const [prev, curr] = monthlySummary;
      const yoyChange = prev.amount > 0 ? ((curr.amount - prev.amount) / prev.amount) * 100 : 0;
      yoyAnalysis = {
        prev_year: {
          month: prev.month,
          amount: prev.amount,
        },
        curr_year: {
          month: curr.month,
          amount: curr.amount,
        },
        change: curr.amount - prev.amount,
        change_percent: Math.round(yoyChange * 10) / 10,
      };
    }
    
    return NextResponse.json({
      success: true,
      data: {
        brand: brand,
        gl_account: glAccount,
        type: type,
        total_amount: Math.round(processedData.reduce((sum, row) => sum + row.amount, 0)),
        total_records: processedData.length,
        monthly_summary: monthlySummary,
        yoy_analysis: yoyAnalysis,
        details: processedData,
      }
    });
    
  } catch (error) {
    console.error('GL계정 데이터 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

