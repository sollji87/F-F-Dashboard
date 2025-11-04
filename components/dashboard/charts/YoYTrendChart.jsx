'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

// CATEGORY_L1별 색상 정의 (파스텔톤)
const CATEGORY_COLORS = {
  '인건비': '#93C5FD',           // 파스텔 블루
  '광고선전비': '#FCA5A5',       // 파스텔 레드
  '지급수수료': '#86EFAC',       // 파스텔 그린
  '자가임차료': '#FCD34D',       // 파스텔 옐로우
  'VMD': '#C4B5FD',              // 파스텔 퍼플
  'VMD/ 매장보수대': '#C4B5FD',  // 파스텔 퍼플
  '샘플대': '#F9A8D4',           // 파스텔 핑크
  '샘플대(제작/구입)': '#F9A8D4', // 파스텔 핑크
  '기타영업비': '#D1D5DB',       // 파스텔 그레이
  '공통비': '#E5E7EB',           // 연한 그레이
};

/**
 * 월별 YOY 트렌드 차트 (Stacked Bar + YOY Line)
 */
export function YoYTrendChart({ data, title = '월별 비용 추이 및 YOY 비교' }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-zinc-500">데이터가 없습니다</p>
        </CardContent>
      </Card>
    );
  }
  
  // 모든 카테고리 추출 (순서대로)
  const allCategories = new Set();
  data.forEach(d => {
    if (d.categories) {
      Object.keys(d.categories).forEach(cat => allCategories.add(cat));
    }
  });
  const categoryList = Array.from(allCategories).sort((a, b) => {
    // 인건비 > 광고선전비 > 지급수수료 > 자가임차료 > VMD > 샘플대 > 기타영업비 > 공통비
    const order = ['인건비', '광고선전비', '지급수수료', '자가임차료', 'VMD', '샘플대', '기타영업비', '공통비'];
    return order.indexOf(a) - order.indexOf(b);
  });
  
  // 실제 카테고리 이름 확인용 로그
  console.log('📊 차트 카테고리 목록:', categoryList);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const monthLabel = `${label.substring(2, 4)}년 ${label.substring(4, 6)}월`;
    const data = payload[0]?.payload; // 전체 데이터 객체
    const yoyItem = payload.find(p => p.dataKey === 'yoy');
    const totalCost = data?.total_cost || 0;
    const prevCost = data?.prev_cost || 0;
    const categories = data?.categories || {};

    // 카테고리를 금액순으로 정렬
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1]);

    return (
      <div className="bg-white dark:bg-zinc-800 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg min-w-[200px]">
        <p className="font-bold text-sm mb-2 text-zinc-900 dark:text-zinc-100">{monthLabel}</p>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-blue-600">
            총비용: {totalCost.toLocaleString()}백만원
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            전년: {prevCost.toLocaleString()}백만원
          </p>
          {yoyItem && (
            <p className={`text-xs font-semibold ${yoyItem.value > 100 ? 'text-red-600' : 'text-green-600'}`}>
              YOY: {yoyItem.value.toFixed(1)}%
            </p>
          )}
          {sortedCategories.length > 0 && (
            <>
              <hr className="my-2 border-zinc-200 dark:border-zinc-600" />
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">카테고리별 비용</p>
              {sortedCategories.map(([category, amount], index) => (
                <div key={index} className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm" 
                      style={{ backgroundColor: CATEGORY_COLORS[category] || '#9ca3af' }}
                    />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{category}</span>
                  </div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  // 데이터 변환: categories를 펼쳐서 각 카테고리를 dataKey로 사용
  const chartData = data.map(d => {
    const newData = {
      month: d.month,
      total_cost: d.total_cost,
      prev_cost: d.prev_cost,
      yoy: d.yoy,
      categories: d.categories, // 툴팁에서 사용
    };
    // 각 카테고리를 개별 필드로 추가
    categoryList.forEach(cat => {
      newData[cat] = d.categories?.[cat] || 0;
    });
    return newData;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">{title}</CardTitle>
            <CardDescription className="text-xs">카테고리별 비용 구성 및 전년 대비 증감률</CardDescription>
          </div>
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
          >
            {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => `${value.substring(4, 6)}월`}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => `${value.toLocaleString()}`}
              label={{ value: '비용 (백만원)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'YOY (%)', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }}
              domain={['dataMin - 10', 'dataMax + 10']}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 12 }}
              iconType="rect"
              iconSize={10}
            />
            
            {/* 100% 기준선 */}
            <ReferenceLine 
              yAxisId="right" 
              y={100} 
              stroke="#6b7280" 
              strokeDasharray="3 3" 
              strokeWidth={1.5}
              label={{ value: '100%', position: 'right', fill: '#6b7280', fontSize: 11 }}
            />
            
            {/* Stacked Bars for each category */}
            {categoryList.map((category, idx) => (
              <Bar 
                key={category}
                yAxisId="left"
                dataKey={category}
                stackId="cost"
                fill={CATEGORY_COLORS[category] || '#9ca3af'}
                name={category}
              />
            ))}
            
            {/* YOY Line */}
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="yoy" 
              stroke="#EF4444" 
              strokeWidth={3}
              name="YOY"
              dot={{ r: 5, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
      )}
    </Card>
  );
}

