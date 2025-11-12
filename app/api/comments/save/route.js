import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/comments/save
 * KPI 코멘트를 CSV 파일로 저장
 */
export async function POST(request) {
  try {
    const { brandCode, month, comments } = await request.json();
    
    if (!brandCode || !month || !comments) {
      return NextResponse.json({
        success: false,
        error: '필수 파라미터가 누락되었습니다.',
      }, { status: 400 });
    }
    
    console.log(`💾 코멘트 저장 요청:`, { brandCode, month });
    
    const commentsDir = path.join(process.cwd(), 'public', 'data', 'comments');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(commentsDir)) {
      fs.mkdirSync(commentsDir, { recursive: true });
    }

    const csvPath = path.join(commentsDir, `${brandCode}_${month}.csv`);
    
    // CSV 형식으로 변환
    const csvLines = ['field,value'];
    csvLines.push(`total_cost,"${(comments.total_cost || '').replace(/"/g, '""')}"`);
    csvLines.push(`cost_ratio,"${(comments.cost_ratio || '').replace(/"/g, '""')}"`);
    csvLines.push(`cost_per_person,"${(comments.cost_per_person || '').replace(/"/g, '""')}"`);
    csvLines.push(`cost_per_store,"${(comments.cost_per_store || '').replace(/"/g, '""')}"`);
    
    // 파일 저장 (UTF-8 with BOM)
    fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf8');
    
    console.log(`✅ 코멘트 저장 성공: ${brandCode}_${month}`);
    
    return NextResponse.json({
      success: true,
      message: '코멘트가 CSV 파일로 저장되었습니다.',
    });
  } catch (error) {
    console.error('Comments Save API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
      },
      { status: 500 }
    );
  }
}

