'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

/**
 * 브랜드 선택 카드 컴포넌트 - 상세 정보 포함
 */
export function BrandCard({ brand }) {
  const { brand_code, brand_name, shortName, color, kpi, categoryBreakdown } = brand;
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 디버깅: 데이터 확인
  console.log(`[${brand_code}] KPI:`, kpi);
  
  const isPositiveYoy = kpi.yoy_cost > 0;
  
  // YOY 색상 결정
  const getYoyColor = (yoy) => {
    if (yoy >= 100) return 'text-red-600 dark:text-red-400';
    if (yoy >= 50) return 'text-orange-600 dark:text-orange-400';
    if (yoy >= 0) return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <Card className="relative overflow-hidden border-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
      {/* 배경 그라데이션 */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{ 
          background: `linear-gradient(135deg, ${color} 0%, transparent 100%)` 
        }}
      />
      
      <CardHeader className="relative p-4 sm:p-5 pb-3">
        {/* 헤더: 아이콘 + 브랜드명 + YOY */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md"
              style={{ backgroundColor: color }}
            >
              {shortName}
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">{brand_name}</CardTitle>
              <div className="flex items-center gap-1 mt-1">
                {kpi.yoy_sales !== undefined && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    매출액YOY {kpi.yoy_sales.toFixed(0)}%
                  </Badge>
                )}
                {kpi.yoy_cost !== undefined && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    영업비YOY {kpi.yoy_cost.toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 주요 지표 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-3 sm:p-4 space-y-2">
          {/* 총비용, 인원수, 실판매출액 */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">총비용</div>
              <div className="font-bold text-sm sm:text-base whitespace-nowrap">
                {kpi.total_cost.toLocaleString()}
                <span className="text-[10px] text-zinc-500 ml-0.5">백만원</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">인원수</div>
              <div className="font-bold text-sm sm:text-base whitespace-nowrap">
                {kpi.headcount}
                <span className="text-[10px] text-zinc-500 ml-0.5">명</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">실판매출액</div>
              <div className="font-bold text-sm sm:text-base whitespace-nowrap">
                {kpi.total_sales.toLocaleString()}
                <span className="text-[10px] text-zinc-500 ml-0.5">백만원</span>
              </div>
            </div>
          </div>
          
          {/* 영업비율 & 인당비용 */}
          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-zinc-600 dark:text-zinc-400">영업비율</span>
                <span className="font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400">
                  {kpi.operating_ratio.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-600 dark:text-zinc-400">인당비용</span>
                <span className="font-bold text-sm sm:text-base text-purple-600 dark:text-purple-400">
                  {kpi.cost_per_person.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500">백만원</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative p-4 sm:p-5 pt-0">
        {/* 영업비 상세보기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }}
          className="w-full justify-between mb-3 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold">영업비 상세보기</span>
            <span className="text-[9px] text-zinc-400">(공통비 제외)</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* 상세 비용 항목 */}
        {isExpanded && categoryBreakdown && (
          <div className="mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-2">
              {categoryBreakdown.map((item, idx) => (
                <>
                  <div key={`name-${idx}`} className="text-xs text-zinc-700 dark:text-zinc-300 py-1 overflow-visible whitespace-normal">
                    {item.name}
                  </div>
                  <div key={`amount-${idx}`} className="text-xs font-semibold text-right py-1 whitespace-nowrap">
                    {item.amount.toLocaleString()}
                  </div>
                  <div 
                    key={`yoy-${idx}`} 
                    className={`text-xs font-bold text-right py-1 min-w-[60px] whitespace-nowrap ${
                      item.yoy > 100 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {item.yoy.toLocaleString()}%
                  </div>
                </>
              ))}
            </div>
          </div>
        )}

        {/* 하단 요약 - Top 3 카테고리 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {categoryBreakdown?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
              <div className="text-xs text-zinc-700 dark:text-zinc-300 font-bold break-words leading-tight min-h-[2.5rem] flex items-center justify-center">
                {item.name}
              </div>
              <div className="text-sm font-bold mt-1">{item.amount?.toLocaleString() || '-'}</div>
            </div>
          ))}
        </div>

        {/* 상세 대시보드 링크 */}
        <Link href={`/dashboard/${brand_code}`}>
          <Button className="w-full" size="sm" style={{ backgroundColor: color }}>
            전체 대시보드 보기
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * 브랜드 선택 그리드
 */
export function BrandSelector({ brands }) {
  return (
    <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {brands.map(brand => (
        <BrandCard key={brand.brand_code} brand={brand} />
      ))}
    </div>
  );
}

