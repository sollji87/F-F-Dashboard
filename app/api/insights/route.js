import { NextResponse } from 'next/server';

/**
 * POST /api/insights
 * OpenAI를 사용하여 비용 데이터 인사이트 생성
 */
export async function POST(request) {
  try {
    const { brand, month, kpi, topCategories, context } = await request.json();
    
    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API 키가 설정되지 않았습니다.',
        fallback_insights: {
          summary: 'AI 인사이트를 사용하려면 OpenAI API 키를 설정해주세요.',
          key_findings: ['Vercel 대시보드 → Settings → Environment Variables에서 OPENAI_API_KEY를 추가하세요.'],
          risks: ['API 키 미설정'],
          action_items: ['OpenAI API 키 설정 필요'],
        },
      });
    }
    
    // OpenAI 동적 import
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    
    // 프롬프트 생성
    const prompt = `당신은 비용 분석 전문가입니다. 다음 데이터를 분석하여 인사이트를 제공해주세요.

브랜드: ${brand}
기준월: ${month}

KPI 지표:
- 총비용: ${kpi.total_cost?.toLocaleString()}백만원
- 매출대비 비용률: ${kpi.cost_ratio}%
- 인당 비용: ${kpi.cost_per_person}백만원
- 매장당 비용: ${kpi.cost_per_store}백만원
- 전년 대비 증감률(YOY): ${kpi.yoy}%

주요 비용 카테고리:
${topCategories?.map(cat => `- ${cat.name}: ${cat.amount?.toLocaleString()}백만원 (${cat.ratio}%)`).join('\n')}

${context ? `추가 컨텍스트: ${context}` : ''}

다음 형식으로 JSON 응답을 생성해주세요:
{
  "summary": "전체 요약 (2-3문장)",
  "key_findings": ["주요 발견사항 1", "주요 발견사항 2", "주요 발견사항 3"],
  "risks": ["리스크 요인 1", "리스크 요인 2"],
  "action_items": ["액션 아이템 1", "액션 아이템 2", "액션 아이템 3"]
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 재무 분석 전문가입니다. 비용 데이터를 분석하고 실행 가능한 인사이트를 제공합니다. 항상 JSON 형식으로 응답하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });
    
    const insights = JSON.parse(response.choices[0].message.content);
    
    return NextResponse.json({
      success: true,
      insights,
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      },
    });
    
  } catch (error) {
    console.error('Insights API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        fallback_insights: {
          summary: 'AI 인사이트를 생성할 수 없습니다. OpenAI API 키를 확인해주세요.',
          key_findings: ['데이터 분석 중...'],
          risks: ['API 연결 필요'],
          action_items: ['.env.local에 OPENAI_API_KEY 설정'],
        },
      },
      { status: 500 }
    );
  }
}

