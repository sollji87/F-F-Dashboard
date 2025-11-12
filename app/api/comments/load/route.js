import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/comments/load?brandCode=MLB&month=202510
 * KPI 코멘트를 CSV 파일에서 로드
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandCode = searchParams.get('brandCode');
    const month = searchParams.get('month');
    
    if (!brandCode || !month) {
      return NextResponse.json({
        success: false,
        error: '필수 파라미터가 누락되었습니다.',
      }, { status: 400 });
    }
    
    const csvPath = path.join(process.cwd(), 'public', 'data', 'comments', `${brandCode}_${month}.csv`);
    
    // 파일 존재 확인
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({
        success: true,
        comments: {
          total_cost: '',
          cost_ratio: '',
          cost_per_person: '',
          cost_per_store: '',
        },
      });
    }

    // CSV 파일 읽기
    const csvContent = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''); // BOM 제거
    const lines = csvContent.split('\n').filter(line => line.trim());

    const comments = {
      total_cost: '',
      cost_ratio: '',
      cost_per_person: '',
      cost_per_store: '',
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV 라인 파싱 (field,"value" 형식)
      const match = line.match(/^([^,]+),"(.*)"/);
      if (!match) continue;

      const field = match[1].trim();
      const value = match[2].replace(/""/g, '"'); // CSV 이스케이프 해제

      if (field === 'total_cost') {
        comments.total_cost = value;
      } else if (field === 'cost_ratio') {
        comments.cost_ratio = value;
      } else if (field === 'cost_per_person') {
        comments.cost_per_person = value;
      } else if (field === 'cost_per_store') {
        comments.cost_per_store = value;
      }
    }

    console.log(`✅ 코멘트 로드 성공: ${brandCode}_${month}`);
    
    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error('Comments Load API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
      },
      { status: 500 }
    );
  }
}

