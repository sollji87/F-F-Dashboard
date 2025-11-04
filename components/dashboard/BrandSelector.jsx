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
  
  const isPositiveYoy = kpi.yoy > 0;
  
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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs px-2 py-0">
                  YOY {kpi.yoy > 0 ? '+' : ''}{kpi.yoy.toFixed(0)}%
                </Badge>
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
              <div className="font-bold text-sm sm:text-base">
                {kpi.total_cost.toLocaleString()}
                <span className="text-xs text-zinc-500 ml-0.5">백만원</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">인원수</div>
              <div className="font-bold text-sm sm:text-base">
                {kpi.headcount}
                <span className="text-xs text-zinc-500 ml-0.5">명</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">실판매출액</div>
              <div className="font-bold text-sm sm:text-base">
                {kpi.total_sales.toLocaleString()}
                <span className="text-xs text-zinc-500 ml-0.5">백만원</span>
              </div>
            </div>
          </div>
          
          {/* 영업비율 & 인당비용 */}
          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">영업비율</span>
                <span className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400">
                  {kpi.operating_ratio.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-px bg-blue-200 dark:bg-blue-800"></div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">인당비용</span>
                <span className="font-bold text-base sm:text-lg text-purple-600 dark:text-purple-400">
                  {kpi.cost_per_person.toFixed(1)}M
                </span>
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
          <span className="text-xs sm:text-sm font-medium">영업비 상세보기</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* 상세 비용 항목 */}
        {isExpanded && categoryBreakdown && (
          <div className="space-y-2 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-3">
            {categoryBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs sm:text-sm py-1.5">
                <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{item.amount.toLocaleString()}</span>
                  <span className={`font-bold min-w-[45px] text-right ${getYoyColor(item.yoy)}`}>
                    {item.yoy >= 0 && '▲'}{item.yoy < 0 && '▼'}{Math.abs(item.yoy)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 하단 요약 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">인건비</div>
            <div className="text-sm font-bold">{categoryBreakdown?.[0]?.amount?.toLocaleString() || '-'}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">광고비</div>
            <div className="text-sm font-bold">{categoryBreakdown?.[1]?.amount?.toLocaleString() || '-'}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">지급수수료</div>
            <div className="text-sm font-bold">{categoryBreakdown?.[2]?.amount?.toLocaleString() || '-'}</div>
          </div>
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

