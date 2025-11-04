import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

/**
 * KPI 카드 컴포넌트
 * 주요 지표를 카드 형태로 표시하며, 전년 대비 증감을 시각화
 */
export function KpiCard({ 
  title, 
  value, 
  unit, 
  yoy, 
  format = 'number', 
  description, 
  isEditable = false, 
  comment = '',
  onCommentChange,
  brandColor,
  prevValue, // 전년 값 추가
  isRatioCard = false // 매출대비 비용률 카드인지 여부
}) {
  // YOY에 따른 색상 및 텍스트
  const getYoyDisplay = () => {
    if (!prevValue) {
      return {
        color: 'text-zinc-500',
        bgColor: 'bg-zinc-100 dark:bg-zinc-800',
        prevText: '-',
        yoyText: '-',
      };
    }
    
    if (isRatioCard) {
      // 매출대비 비용률: 포인트 차이 계산
      const diff = value - prevValue; // %p 차이
      const isWorse = diff > 0; // 비용률이 증가하면 나쁨
      
      return {
        color: isWorse ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
        bgColor: isWorse ? 'bg-red-50 dark:bg-red-950' : 'bg-blue-50 dark:bg-blue-950',
        prevText: `전년 ${prevValue.toFixed(1)}%`,
        yoyText: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%p`,
      };
    } else {
      // 일반 금액: 100% 기준으로 색상 결정
      const isIncrease = yoy > 100;
      
      return {
        color: isIncrease ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
        bgColor: isIncrease ? 'bg-red-50 dark:bg-red-950' : 'bg-blue-50 dark:bg-blue-950',
        prevText: `전년 ${prevValue.toLocaleString()}${unit || ''}`,
        yoyText: `${yoy.toFixed(1)}%`,
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
    <Card 
      className="overflow-hidden transition-all hover:shadow-lg h-[120px] flex flex-col justify-center"
      style={{ 
        borderLeft: brandColor ? `4px solid ${brandColor}` : undefined,
        borderTop: brandColor ? `1px solid ${brandColor}20` : undefined,
      }}
    >
      <div className="px-4 py-3 space-y-2">
        {/* 헤더 */}
        <div className="flex flex-row items-start justify-between space-y-0">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-tight pr-2">
            {title}
          </h3>
        <Badge 
          variant="secondary" 
          className={`${yoyDisplay.bgColor} ${yoyDisplay.color} flex flex-col items-end gap-0 text-[10px] px-2 py-1.5 flex-shrink-0 font-semibold leading-tight`}
        >
          <span className="whitespace-nowrap">{yoyDisplay.prevText}</span>
          <span className="text-xs font-bold">{yoyDisplay.yoyText}</span>
        </Badge>
        </div>
        
        {/* 숫자 */}
        <div className="flex items-baseline gap-1.5">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight leading-none" style={{ color: brandColor }}>
            {formatValue(value)}
          </div>
          {unit && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {unit}
            </div>
          )}
        </div>
        
        {/* 설명 */}
        {description && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
            {description}
          </p>
        )}
        
        {/* 편집 모드: 코멘트 입력란 */}
        {isEditable && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              💬 코멘트
            </label>
            <Textarea
              value={comment}
              onChange={(e) => onCommentChange && onCommentChange(e.target.value)}
              placeholder="이 지표에 대한 코멘트를 입력하세요..."
              className="text-xs min-h-[60px] resize-none border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-600"
            />
          </div>
        )}
        
        {/* 저장된 코멘트 표시 */}
        {!isEditable && comment && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">
              💬 {comment}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

