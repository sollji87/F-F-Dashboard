import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * 에러 상태 컴포넌트
 */
export function ErrorState({ 
  title = '오류가 발생했습니다', 
  message = '데이터를 불러오는 중 문제가 발생했습니다.', 
  onRetry 
}) {
  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

