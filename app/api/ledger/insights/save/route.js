import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * POST /api/ledger/insights/save
 * L3 계정별 인사이트 저장
 */
export async function POST(request) {
  try {
    const { brandName, month, category_l1, category_l2, category_l3, insight } = await request.json();
    
    if (!brandName || !month || !category_l1 || !category_l2 || !category_l3) {
      return NextResponse.json({
        success: false,
        error: 'brandName, month, category_l1, category_l2, category_l3가 필요합니다.',
      }, { status: 400 });
    }
    
    const csvPath = path.join(process.cwd(), 'public', 'data', 'ledger_insights', `${brandName}_${month}_insights.csv`);
    
    // 파일이 없으면 에러
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({
        success: false,
        error: `인사이트 파일을 찾을 수 없습니다: ${brandName}_${month}_insights.csv`,
      }, { status: 404 });
    }
    
    // CSV 파일 읽기
    let fileContent = fs.readFileSync(csvPath, 'utf-8');
    
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
    
    // 해당 L3 계정 찾아서 업데이트
    let found = false;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (
        record.level === 'L3' &&
        record.category_l1 === category_l1 &&
        record.category_l2 === category_l2 &&
        record.category_l3 === category_l3
      ) {
        records[i].insight = insight || '';
        found = true;
        break;
      }
    }
    
    if (!found) {
      return NextResponse.json({
        success: false,
        error: '해당 L3 계정을 찾을 수 없습니다.',
      }, { status: 404 });
    }
    
    // CSV로 다시 저장 (직접 문자열 생성)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      // 따옴표가 있으면 이스케이프 처리
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };
    
    const csvLines = ['brand,level,category_l1,category_l2,category_l3,current_amount,prev_amount,diff,yoy,insight'];
    records.forEach(record => {
      csvLines.push([
        escapeCSV(record.brand),
        escapeCSV(record.level),
        escapeCSV(record.category_l1),
        escapeCSV(record.category_l2),
        escapeCSV(record.category_l3),
        escapeCSV(record.current_amount),
        escapeCSV(record.prev_amount),
        escapeCSV(record.diff),
        escapeCSV(record.yoy),
        escapeCSV(record.insight),
      ].join(','));
    });
    
    // UTF-8 with BOM으로 저장
    fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf-8');
    
    console.log(`✅ L3 인사이트 저장 성공: ${brandName}_${month}_insights.csv - ${category_l1}/${category_l2}/${category_l3}`);
    
    return NextResponse.json({
      success: true,
      message: '인사이트가 저장되었습니다.',
    });
  } catch (error) {
    console.error('💥 L3 인사이트 저장 API 에러:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

