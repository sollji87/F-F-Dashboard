'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Filter, X } from 'lucide-react';

/**
 * 필터바 컴포넌트
 * 월, 브랜드, 코스트센터 타입 등 필터 옵션 제공
 */
export function FilterBar({ 
  selectedMonth, 
  onMonthChange, 
  selectedCctrType, 
  onCctrTypeChange,
  selectedCategory,
  onCategoryChange,
  excludeCommon,
  onExcludeCommonChange,
  categories = [],
  showCategoryFilter = true,
  showCctrFilter = true,
}) {
  // 월 옵션 생성 (2023-01 ~ 2024-12)
  const generateMonthOptions = () => {
    const options = [];
    for (let year = 2024; year >= 2023; year--) {
      for (let month = 12; month >= 1; month--) {
        const value = `${year}${String(month).padStart(2, '0')}`;
        const label = `${year}년 ${month}월`;
        options.push({ value, label });
      }
    }
    return options;
  };
  
  const monthOptions = generateMonthOptions();
  
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">기준월:</span>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {showCctrFilter && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">코스트센터:</span>
            <Select value={selectedCctrType || 'ALL'} onValueChange={onCctrTypeChange}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="부서">부서</SelectItem>
                <SelectItem value="매장">매장</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {showCategoryFilter && categories.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">비용 분류:</span>
            <Select value={selectedCategory || 'ALL'} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={excludeCommon ? 'default' : 'outline'}
            size="sm"
            onClick={() => onExcludeCommonChange?.(!excludeCommon)}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            {excludeCommon ? <X className="mr-1 h-3 w-3" /> : null}
            공통비 제외
          </Button>
        </div>
      </div>
    </Card>
  );
}

