import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

/**
 * KPI 카드 컴포넌트
 * 주요 지표를 카드 형태로 표시하며, 전년 대비 증감을 시각화
 */
export function KpiCard({ title, value, unit, yoy, format = 'number', description }) {
  // YOY에 따른 색상 및 아이콘
  const getYoyDisplay = () => {
    if (yoy === null || yoy === undefined || isNaN(yoy)) {
      return {
        icon: <Minus className="h-4 w-4" />,
        color: 'text-zinc-500',
        bgColor: 'bg-zinc-100 dark:bg-zinc-800',
        text: '-',
      };
    }
    
    if (yoy > 0) {
      return {
        icon: <ArrowUp className="h-4 w-4" />,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950',
        text: `+${yoy.toFixed(1)}%`,
      };
    } else if (yoy < 0) {
      return {
        icon: <ArrowDown className="h-4 w-4" />,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        text: `${yoy.toFixed(1)}%`,
      };
    } else {
      return {
        icon: <Minus className="h-4 w-4" />,
        color: 'text-zinc-500',
        bgColor: 'bg-zinc-100 dark:bg-zinc-800',
        text: '0%',
      };
    }
  };
  
  const yoyDisplay = getYoyDisplay();
  
  // 값 포맷팅
  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    
    switch (format) {
      case 'currency':
        return val.toLocaleString();
      case 'percent':
        return `${val.toFixed(1)}`;
      case 'decimal':
        return val.toFixed(1);
      default:
        return val.toLocaleString();
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {title}
        </CardTitle>
        <Badge 
          variant="secondary" 
          className={`${yoyDisplay.bgColor} ${yoyDisplay.color} flex items-center gap-1 text-xs`}
        >
          {yoyDisplay.icon}
          <span className="font-semibold">{yoyDisplay.text}</span>
        </Badge>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="flex items-baseline gap-1 sm:gap-2">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold">
            {formatValue(value)}
          </div>
          {unit && (
            <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {unit}
            </div>
          )}
        </div>
        {description && (
          <p className="mt-1 sm:mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

