/**
 * AI 인사이트 CSV 로더
 * 로컬에서 미리 생성된 AI 인사이트를 CSV에서 로드
 */

import fs from 'fs';
import path from 'path';

/**
 * CSV에서 AI 인사이트 로드
 */
export function loadAiInsightsFromCSV(brandCode, month) {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'data', 'ai_insights', `insights_${brandCode}_${month}.csv`);
    
    // 파일 존재 확인
    if (!fs.existsSync(csvPath)) {
      console.log(`📄 AI 인사이트 파일 없음: ${brandCode}_${month}`);
      return null;
    }

    // CSV 파일 읽기
    const csvContent = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''); // BOM 제거
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      console.log(`⚠️  AI 인사이트 파일이 비어있음: ${brandCode}_${month}`);
      return null;
    }

    // CSV 파싱
    const insights = {
      summary: '',
      key_findings: [],
      risks: [],
      action_items: [],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV 라인 파싱 (field,"value" 형식)
      const match = line.match(/^([^,]+),"(.*)"/);
      if (!match) continue;

      const field = match[1].trim();
      const value = match[2].replace(/""/g, '"'); // CSV 이스케이프 해제

      if (field === 'summary') {
        insights.summary = value;
      } else if (field === 'key_findings') {
        insights.key_findings = value.split('|').filter(item => item.trim());
      } else if (field === 'risks') {
        insights.risks = value.split('|').filter(item => item.trim());
      } else if (field === 'action_items') {
        insights.action_items = value.split('|').filter(item => item.trim());
      }
    }

    console.log(`✅ AI 인사이트 로드 성공: ${brandCode}_${month}`);
    return insights;
  } catch (error) {
    console.error(`❌ AI 인사이트 로드 에러 [${brandCode}_${month}]:`, error);
    return null;
  }
}

/**
 * 카테고리별 AI 인사이트 CSV 로드
 */
export function loadCategoryInsightsFromCSV(brandCode, category, month) {
  try {
    // 파일명에서 특수문자 제거 (/, \, :, *, ?, ", <, >, | 등)
    const sanitizedCategory = category.replace(/[\/\\:*?"<>|]/g, '_');
    const csvPath = path.join(process.cwd(), 'public', 'data', 'category_insights', `${brandCode}_${sanitizedCategory}_${month}.csv`);
    
    // 파일 존재 확인
    if (!fs.existsSync(csvPath)) {
      console.log(`📄 카테고리 인사이트 파일 없음: ${brandCode}_${category}_${month}`);
      return null;
    }

    // CSV 파일 읽기
    const csvContent = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''); // BOM 제거
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      console.log(`⚠️  카테고리 인사이트 파일이 비어있음: ${brandCode}_${category}_${month}`);
      return null;
    }

    // CSV 파싱
    const insights = {
      summary: '',
      key_findings: [],
      risks: [],
      action_items: [],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV 라인 파싱 (field,"value" 형식)
      const match = line.match(/^([^,]+),"(.*)"/);
      if (!match) continue;

      const field = match[1].trim();
      const value = match[2].replace(/""/g, '"'); // CSV 이스케이프 해제

      if (field === 'summary') {
        insights.summary = value;
      } else if (field === 'key_findings') {
        insights.key_findings = value.split('|').filter(item => item.trim());
      } else if (field === 'risks') {
        insights.risks = value.split('|').filter(item => item.trim());
      } else if (field === 'action_items') {
        insights.action_items = value.split('|').filter(item => item.trim());
      }
    }

    console.log(`✅ 카테고리 인사이트 로드 성공: ${brandCode}_${category}_${month}`);
    return insights;
  } catch (error) {
    console.error(`❌ 카테고리 인사이트 로드 에러 [${brandCode}_${category}_${month}]:`, error);
    return null;
  }
}

/**
 * 카테고리별 AI 인사이트 CSV 저장
 */
export function saveCategoryInsightsToCSV(brandCode, category, month, insights) {
  try {
    const categoryInsightsDir = path.join(process.cwd(), 'public', 'data', 'category_insights');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(categoryInsightsDir)) {
      fs.mkdirSync(categoryInsightsDir, { recursive: true });
    }

    // 파일명에서 특수문자 제거 (/, \, :, *, ?, ", <, >, | 등)
    const sanitizedCategory = category.replace(/[\/\\:*?"<>|]/g, '_');
    const csvPath = path.join(categoryInsightsDir, `${brandCode}_${sanitizedCategory}_${month}.csv`);
    
    // CSV 형식으로 변환
    const csvLines = ['field,value'];
    
    // summary
    csvLines.push(`summary,"${insights.summary.replace(/"/g, '""')}"`);
    
    // key_findings (|로 구분)
    csvLines.push(`key_findings,"${insights.key_findings.join('|').replace(/"/g, '""')}"`);
    
    // risks (|로 구분)
    csvLines.push(`risks,"${insights.risks.join('|').replace(/"/g, '""')}"`);
    
    // action_items (|로 구분)
    csvLines.push(`action_items,"${insights.action_items.join('|').replace(/"/g, '""')}"`);
    
    // 파일 저장 (UTF-8 with BOM)
    fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf8');
    
    console.log(`✅ 카테고리 인사이트 저장 성공: ${brandCode}_${category}_${month}`);
    return true;
  } catch (error) {
    console.error(`❌ 카테고리 인사이트 저장 에러 [${brandCode}_${category}_${month}]:`, error);
    return false;
  }
}

/**
 * 월별 AI 인사이트 CSV 저장
 */
export function saveAiInsightsToCSV(brandCode, month, insights) {
  try {
    const aiInsightsDir = path.join(process.cwd(), 'public', 'data', 'ai_insights');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(aiInsightsDir)) {
      fs.mkdirSync(aiInsightsDir, { recursive: true });
    }

    const csvPath = path.join(aiInsightsDir, `insights_${brandCode}_${month}.csv`);
    
    // CSV 형식으로 변환
    const csvLines = ['field,value'];
    
    // summary
    csvLines.push(`summary,"${insights.summary.replace(/"/g, '""')}"`);
    
    // key_findings (|로 구분)
    csvLines.push(`key_findings,"${insights.key_findings.join('|').replace(/"/g, '""')}"`);
    
    // risks (|로 구분)
    csvLines.push(`risks,"${insights.risks.join('|').replace(/"/g, '""')}"`);
    
    // action_items (|로 구분)
    csvLines.push(`action_items,"${insights.action_items.join('|').replace(/"/g, '""')}"`);
    
    // 파일 저장 (UTF-8 with BOM)
    fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf8');
    
    console.log(`✅ 월별 AI 인사이트 저장 성공: ${brandCode}_${month}`);
    return true;
  } catch (error) {
    console.error(`❌ 월별 AI 인사이트 저장 에러 [${brandCode}_${month}]:`, error);
    return false;
  }
}

/**
 * 모든 브랜드/월의 인사이트 존재 여부 확인
 */
export function checkAvailableInsights() {
  try {
    const insightsDir = path.join(process.cwd(), 'public', 'data', 'ai_insights');
    
    if (!fs.existsSync(insightsDir)) {
      return [];
    }

    const files = fs.readdirSync(insightsDir)
      .filter(file => file.startsWith('insights_') && file.endsWith('.csv'));

    return files.map(file => {
      const match = file.match(/insights_(.+)_(\d{6})\.csv/);
      if (match) {
        return {
          brandCode: match[1],
          month: match[2],
          file: file,
        };
      }
      return null;
    }).filter(Boolean);
  } catch (error) {
    console.error('❌ 인사이트 파일 목록 확인 에러:', error);
    return [];
  }
}

