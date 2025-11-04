'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PythonTestPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runPythonScript = async (scriptName) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: scriptName }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <main className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Python 통합 테스트
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            pandas, OpenAI, Snowflake 패키지가 설치되었습니다
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Pandas 예제</CardTitle>
              <CardDescription>
                데이터프레임 생성 및 처리
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runPythonScript('example')}
                disabled={loading}
                className="w-full"
              >
                {loading ? '실행 중...' : '실행'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OpenAI 예제</CardTitle>
              <CardDescription>
                GPT API 호출 테스트
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runPythonScript('openai_example')}
                disabled={loading}
                className="w-full"
                variant="secondary"
              >
                {loading ? '실행 중...' : '실행'}
              </Button>
              <p className="mt-2 text-xs text-zinc-500">
                .env에 OPENAI_API_KEY 필요
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snowflake 예제</CardTitle>
              <CardDescription>
                데이터베이스 연결 테스트
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => runPythonScript('snowflake_example')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? '실행 중...' : '실행'}
              </Button>
              <p className="mt-2 text-xs text-zinc-500">
                .env에 Snowflake 정보 필요
              </p>
            </CardContent>
          </Card>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>실행 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>환경 변수 설정 방법</CardTitle>
            <CardDescription>
              프로젝트 루트에 .env.local 파일 생성
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">OpenAI 설정:</h3>
              <code className="block bg-zinc-100 dark:bg-zinc-900 p-3 rounded text-sm">
                OPENAI_API_KEY=your_api_key_here
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Snowflake 설정:</h3>
              <code className="block bg-zinc-100 dark:bg-zinc-900 p-3 rounded text-sm">
                {`SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_user
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema`}
              </code>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

