'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { Loader } from './Loader';

/**
 * AI 인사이트 패널 컴포넌트
 * OpenAI API를 통해 비용 데이터 분석 인사이트 제공
 */
export function AiInsightsPanel({ brand, month, kpi, topCategories }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const generateInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          month,
          kpi,
          topCategories,
          context: '비용 최적화 및 효율성 개선 관점에서 분석해주세요.',
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setInsights(result.insights);
      } else {
        // API 키가 없는 경우 fallback 인사이트 사용
        if (result.fallback_insights) {
          setInsights(result.fallback_insights);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="border-2 border-purple-200 dark:border-purple-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>AI 인사이트</CardTitle>
          </div>
          <Button 
            onClick={generateInsights}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                인사이트 생성
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          AI가 비용 데이터를 분석하여 인사이트를 제공합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <Loader message="AI가 데이터를 분석하는 중..." />
        )}
        
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}
        
        {!loading && !insights && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              버튼을 클릭하여 AI 인사이트를 생성하세요
            </p>
          </div>
        )}
        
        {insights && !loading && (
          <div className="space-y-6">
            {/* 요약 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-lg">전체 요약</h3>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {insights.summary}
              </p>
            </div>
            
            <Separator />
            
            {/* 주요 발견사항 */}
            {insights.key_findings && insights.key_findings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="font-semibold text-lg">주요 발견사항</h3>
                </div>
                <ul className="space-y-2">
                  {insights.key_findings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {finding}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Separator />
            
            {/* 리스크 요인 */}
            {insights.risks && insights.risks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-lg">리스크 요인</h3>
                </div>
                <ul className="space-y-2">
                  {insights.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {risk}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Separator />
            
            {/* 액션 아이템 */}
            {insights.action_items && insights.action_items.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-lg">권장 액션</h3>
                </div>
                <ul className="space-y-2">
                  {insights.action_items.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 bg-green-50 dark:bg-green-950">
                        ✓
                      </Badge>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {action}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

