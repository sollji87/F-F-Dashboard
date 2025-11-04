'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestSnowflakePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/data/snowflake/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month: '202509' }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '데이터 내보내기 실패');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Snowflake 데이터 내보내기
          </h1>
          <p className="text-slate-600">
            Snowflake에서 데이터를 조회하여 CSV 파일로 저장합니다
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              데이터 내보내기
            </CardTitle>
            <CardDescription>
              매출 데이터와 비용 데이터를 Snowflake에서 조회하여 public/data 폴더에 CSV 파일로 저장합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleExport}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  데이터 내보내는 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Snowflake 데이터 내보내기
                </>
              )}
            </Button>

            {/* Success Result */}
            {result && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-green-800 font-semibold">
                  <CheckCircle className="h-5 w-5" />
                  {result.message}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="font-medium text-green-900">저장된 파일:</div>
                  <ul className="list-disc list-inside space-y-1 text-green-700">
                    <li>{result.files.sales} ({result.record_count.sales.toLocaleString()}건)</li>
                    <li>{result.files.costs} ({result.record_count.costs.toLocaleString()}건)</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-green-200">
                  <p className="text-xs text-green-600">
                    💡 파일은 프로젝트의 public/data 폴더에 저장되었습니다.
                  </p>
                </div>
              </div>
            )}

            {/* Error Result */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-semibold">
                  <XCircle className="h-5 w-5" />
                  오류 발생
                </div>
                <p className="text-sm text-red-700">{error}</p>
                <div className="pt-2 border-t border-red-200">
                  <p className="text-xs text-red-600">
                    💡 .env.local 파일의 Snowflake 연결 정보를 확인해주세요.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 참고사항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex gap-2">
              <span className="font-semibold min-w-[120px]">매출 데이터:</span>
              <span>snowflake_sales.csv (월별 브랜드별 실판매출액)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-[120px]">비용 데이터:</span>
              <span>snowflake_costs.csv (월별 브랜드별 카테고리별 비용)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-[120px]">조회 기간:</span>
              <span>2024년 1월 ~ 2025년 12월</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-[120px]">브랜드:</span>
              <span>MLB, MLB_KIDS, DISCOVERY, DUVETICA, SERGIO_TACCHINI</span>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            메인 페이지로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}

