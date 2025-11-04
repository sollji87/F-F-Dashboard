import { Loader2 } from 'lucide-react';

/**
 * 로딩 스피너 컴포넌트
 */
export function Loader({ message = '데이터를 불러오는 중...' }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-600 dark:text-zinc-400" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}

/**
 * 전체 페이지 로딩
 */
export function PageLoader({ message = '페이지를 불러오는 중...' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <Loader2 className="h-12 w-12 animate-spin text-zinc-600 dark:text-zinc-400" />
      <p className="text-lg text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}

