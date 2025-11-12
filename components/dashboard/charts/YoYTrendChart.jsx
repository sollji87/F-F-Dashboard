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

// 드릴다운 차트용 파스텔 컬러 팔레트
const PASTEL_COLORS = [
  '#93C5FD', '#FCA5A5', '#86EFAC', '#FCD34D', '#C4B5FD',
  '#F9A8D4', '#A5F3FC', '#FDE68A', '#D8B4FE', '#FDA4AF',
];

// 문자열을 해시하여 고정된 색상 인덱스 반환
const getColorForString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
};

/**
 * 월별 YOY 트렌드 차트 (Stacked Bar + YOY Line)
 */
export function YoYTrendChart({ data, rawCostsData, selectedMonth, title = '월별 비용 추이 및 YOY 비교' }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [drillDownData, setDrillDownData] = useState(null);
  
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
  
  // 범례 클릭 핸들러 - 카테고리별 드릴다운
  const handleLegendClick = (category) => {
    if (category === 'YOY') return; // YOY는 드릴다운 불가
    
    if (selectedCategory === category) {
      // 이미 선택된 카테고리를 다시 클릭하면 해제
      setSelectedCategory(null);
      setDrillDownData(null);
      return;
    }
    
    setSelectedCategory(category);
    
    // rawCostsData에서 해당 카테고리의 소분류(CATEGORY_L3) 또는 계정(GL_NM) 데이터 추출
    if (!rawCostsData || rawCostsData.length === 0) {
      console.warn('원본 비용 데이터가 없습니다.');
      return;
    }
    
    // 해당 카테고리의 월별 소분류 데이터 집계
    const categoryData = rawCostsData.filter(row => row.category_l1 === category);
    
    // 월별 + 소분류별 집계
    const monthlySubcategories = {};
    categoryData.forEach(row => {
      const month = row.month;
      const subcategory = row.category_l3 || row.gl_nm || '기타'; // 소분류 또는 계정명
      const amount = row.cost_amt || 0;
      
      if (!monthlySubcategories[month]) {
        monthlySubcategories[month] = {};
      }
      if (!monthlySubcategories[month][subcategory]) {
        monthlySubcategories[month][subcategory] = 0;
      }
      monthlySubcategories[month][subcategory] += amount;
    });
    
    // 모든 소분류 추출
    const allSubcategories = new Set();
    Object.values(monthlySubcategories).forEach(monthData => {
      Object.keys(monthData).forEach(sub => allSubcategories.add(sub));
    });
    
    // 소분류별 총합 계산 후 금액 순으로 정렬
    const subcategoryTotals = {};
    Array.from(allSubcategories).forEach(sub => {
      subcategoryTotals[sub] = Object.values(monthlySubcategories).reduce((sum, monthData) => {
        return sum + (monthData[sub] || 0);
      }, 0);
    });
    
    // 상위 10개 소분류만 차트에 표시 (하지만 합계는 전체 금액 사용)
    const topSubcategories = Object.entries(subcategoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
    
    // 2025년과 2024년 데이터 분리 및 YOY 계산
    const months2025 = Object.keys(monthlySubcategories).filter(m => m.startsWith('2025')).sort();
    const months2024 = Object.keys(monthlySubcategories).filter(m => m.startsWith('2024')).sort();
    
    // 차트 데이터 생성 (2025년 기준, 선택월까지만)
    const drillData = months2025
      .filter(month => {
        // 선택월까지만 표시
        if (selectedMonth && month > selectedMonth) return false;
        
        // 해당 월에 실제 데이터가 있는지 확인
        const hasData = topSubcategories.some(sub => 
          (monthlySubcategories[month]?.[sub] || 0) > 0
        );
        return hasData;
      })
      .map(month => {
        const monthData = { month };
        
        // 각 소분류별 금액 (상위 10개만 차트에 표시)
        topSubcategories.forEach(sub => {
          const rawAmount = monthlySubcategories[month]?.[sub] || 0; // 원 단위 원본
          const amount = Math.round(rawAmount / 1000000); // 백만원 (표시용)
          monthData[sub] = amount;
        });
        
        // 전체 소분류 합계 (상위 10개가 아닌 전체 금액)
        let totalCurrentRaw = 0;
        let totalPrevRaw = 0;
        
        // 현재 월의 모든 소분류 합계
        Object.values(monthlySubcategories[month] || {}).forEach(amount => {
          totalCurrentRaw += amount;
        });
        
        // 전년(2024년) 동월의 모든 소분류 합계
        const prevMonth = month.replace('2025', '2024');
        if (monthlySubcategories[prevMonth]) {
          Object.values(monthlySubcategories[prevMonth]).forEach(amount => {
            totalPrevRaw += amount;
          });
        }
        
        // 원본 값 합계를 백만원으로 변환 (반올림은 마지막에 한 번만)
        const totalCurrent = Math.round(totalCurrentRaw / 1000000);
        const totalPrev = Math.round(totalPrevRaw / 1000000);
        
        // YOY 계산
        monthData.total_cost = totalCurrent;
        monthData.prev_cost = totalPrev;
        monthData.yoy = totalPrev > 0 ? (totalCurrent / totalPrev) * 100 : 100;
        
        // 소분류별 상세 정보 (툴팁용)
        monthData.subcategories = {};
        topSubcategories.forEach(sub => {
          monthData.subcategories[sub] = monthData[sub];
        });
        
        return monthData;
      });
    
    setDrillDownData({
      category,
      subcategories: topSubcategories,
      data: drillData,
    });
  };

  // 커스텀 툴팁 (메인 차트용) - 충돌 감지 및 자동 위치 보정
  const CustomTooltip = ({ active, payload, label, coordinate, viewBox }) => {
    if (!active || !payload || payload.length === 0) return null;

    const monthLabel = `${label.substring(2, 4)}년 ${label.substring(4, 6)}월`;
    const data = payload[0]?.payload;
    const yoyItem = payload.find(p => p.dataKey === 'yoy');
    const totalCost = data?.total_cost || 0;
    const prevCost = data?.prev_cost || 0;
    const categories = data?.categories || {};

    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1]);

    // 툴팁 크기 추정 (동적 계산)
    const tooltipWidth = 220;
    const tooltipHeight = 150 + (sortedCategories.length * 24);
    const offset = 14; // 마우스 커서 오프셋

    // 충돌 감지 및 위치 보정
    let adjustedX = (coordinate?.x || 0) + offset;
    let adjustedY = (coordinate?.y || 0) + offset;

    // 뷰포트 경계 확인
    const chartWidth = viewBox?.width || 800;
    const chartHeight = viewBox?.height || 400;

    // 오른쪽 경계 충돌 감지
    if (adjustedX + tooltipWidth > chartWidth) {
      adjustedX = (coordinate?.x || 0) - tooltipWidth - offset;
    }

    // 하단 경계 충돌 감지
    if (adjustedY + tooltipHeight > chartHeight) {
      adjustedY = (coordinate?.y || 0) - tooltipHeight - offset;
    }

    // 왼쪽 경계 보정
    if (adjustedX < 0) {
      adjustedX = offset;
    }

    // 상단 경계 보정
    if (adjustedY < 0) {
      adjustedY = offset;
    }

    return (
      <div 
        className="bg-white dark:bg-zinc-800 p-4 border-2 border-zinc-300 dark:border-zinc-600 rounded-lg shadow-xl min-w-[200px] pointer-events-none"
        style={{ 
          backgroundColor: 'white',
          position: 'absolute',
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
          zIndex: 10000,
          transform: 'translate(0, 0)',
        }}
      >
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
  
  // 드릴다운 차트용 커스텀 툴팁 컴포넌트 - 충돌 감지 및 자동 위치 보정
  const DrillDownTooltip = ({ active, payload, label, category, coordinate, viewBox }) => {
    if (!active || !payload || payload.length === 0) return null;

    const monthLabel = `${label.substring(2, 4)}년 ${label.substring(4, 6)}월`;
    const data = payload[0]?.payload;
    const yoyItem = payload.find(p => p.dataKey === 'yoy');
    const totalCost = data?.total_cost || 0;
    const prevCost = data?.prev_cost || 0;
    const subcategories = data?.subcategories || {};

    const sortedSubcategories = Object.entries(subcategories)
      .sort((a, b) => b[1] - a[1]);

    // 툴팁 크기 추정 (동적 계산)
    const tooltipWidth = 220;
    const tooltipHeight = 150 + (sortedSubcategories.length * 24);
    const offset = 14; // 마우스 커서 오프셋

    // 충돌 감지 및 위치 보정
    let adjustedX = (coordinate?.x || 0) + offset;
    let adjustedY = (coordinate?.y || 0) + offset;

    // 뷰포트 경계 확인
    const chartWidth = viewBox?.width || 800;
    const chartHeight = viewBox?.height || 400;

    // 오른쪽 경계 충돌 감지
    if (adjustedX + tooltipWidth > chartWidth) {
      adjustedX = (coordinate?.x || 0) - tooltipWidth - offset;
    }

    // 하단 경계 충돌 감지
    if (adjustedY + tooltipHeight > chartHeight) {
      adjustedY = (coordinate?.y || 0) - tooltipHeight - offset;
    }

    // 왼쪽 경계 보정
    if (adjustedX < 0) {
      adjustedX = offset;
    }

    // 상단 경계 보정
    if (adjustedY < 0) {
      adjustedY = offset;
    }

    return (
      <div 
        className="bg-white dark:bg-zinc-800 p-4 border-2 border-zinc-300 dark:border-zinc-600 rounded-lg shadow-xl min-w-[200px] pointer-events-none"
        style={{ 
          backgroundColor: 'white',
          position: 'absolute',
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
          zIndex: 10000,
          transform: 'translate(0, 0)',
        }}
      >
        <p className="font-bold text-sm mb-2 text-zinc-900 dark:text-zinc-100">{monthLabel}</p>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-purple-600">
            {category} 총비용: {totalCost.toLocaleString()}백만원
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            전년: {prevCost.toLocaleString()}백만원
          </p>
          {yoyItem && (
            <p className={`text-xs font-semibold ${yoyItem.value > 100 ? 'text-red-600' : 'text-green-600'}`}>
              YOY: {yoyItem.value.toFixed(1)}%
            </p>
          )}
          {sortedSubcategories.length > 0 && (
            <>
              <hr className="my-2 border-zinc-200 dark:border-zinc-600" />
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">소분류별 비용</p>
              {sortedSubcategories.map(([subcat, amount], index) => (
                <div key={index} className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm" 
                      style={{ backgroundColor: getColorForString(subcat) }}
                    />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{subcat}</span>
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
              domain={[0, 'auto']}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => `${Math.round(value)}%`}
              label={{ value: 'YOY (%)', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }}
              domain={['dataMin - 10', 'dataMax + 10']}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
              iconType="rect"
              iconSize={10}
              onClick={(e) => {
                if (e && e.value) {
                  handleLegendClick(e.value);
                }
              }}
              content={(props) => {
                const { payload } = props;
                if (!payload) return null;
                
                // 원하는 순서대로 범례 아이템 생성
                const orderedItems = [
                  ...categoryList.map(category => ({
                    value: category,
                    type: 'rect',
                    color: CATEGORY_COLORS[category] || '#9ca3af',
                  })),
                  {
                    value: 'YOY',
                    type: 'line',
                    color: '#EF4444',
                  }
                ];
                
                return (
                  <ul className="flex flex-wrap justify-center gap-4 mt-4">
                    {orderedItems.map((entry, index) => (
                      <li 
                        key={`item-${index}`} 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-70"
                        onClick={() => handleLegendClick(entry.value)}
                      >
                        {entry.type === 'line' ? (
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <line x1="0" y1="7" x2="14" y2="7" stroke={entry.color} strokeWidth="2" />
                          </svg>
                        ) : (
                          <span 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: entry.color }}
                          />
                        )}
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                );
              }}
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
                opacity={selectedCategory && selectedCategory !== category ? 0.3 : 1}
              />
            ))}
            
            {/* YOY Line - 범례에서 맨 뒤에 표시됨 */}
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
        
        {/* 드릴다운 차트 - 소분류 계정별 */}
        {drillDownData && (
          <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {drillDownData.category} - 소분류 계정별 월별 추이 (2025년)
              </h4>
              <Button
                onClick={() => {
                  setSelectedCategory(null);
                  setDrillDownData(null);
                }}
                variant="ghost"
                size="sm"
              >
                닫기
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={drillDownData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  domain={[0, 'auto']}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  label={{ value: 'YOY (%)', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <Tooltip content={(props) => <DrillDownTooltip {...props} category={drillDownData.category} />} />
                <Legend 
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="rect"
                  iconSize={8}
                  content={(props) => {
                    const { payload } = props;
                    if (!payload) return null;
                    
                    // 원하는 순서대로 범례 아이템 생성
                    const orderedItems = [
                      ...drillDownData.subcategories.map((sub, idx) => ({
                        value: sub,
                        type: 'rect',
                        color: PASTEL_COLORS[idx % PASTEL_COLORS.length],
                      })),
                      {
                        value: 'YOY',
                        type: 'line',
                        color: '#EF4444',
                      }
                    ];
                    
                    return (
                      <ul className="flex flex-wrap justify-center gap-3 mt-4">
                        {orderedItems.map((entry, index) => (
                          <li 
                            key={`item-${index}`} 
                            className="flex items-center gap-1.5"
                          >
                            {entry.type === 'line' ? (
                              <svg width="12" height="12" viewBox="0 0 12 12">
                                <line x1="0" y1="6" x2="12" y2="6" stroke={entry.color} strokeWidth="2" />
                              </svg>
                            ) : (
                              <span 
                                className="w-2.5 h-2.5 rounded-sm" 
                                style={{ backgroundColor: entry.color }}
                              />
                            )}
                            <span className="text-[11px] text-zinc-700 dark:text-zinc-300">{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }}
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
                
                {/* 소분류별 Stacked Bars - 파스텔톤 */}
                {drillDownData.subcategories.map((sub, idx) => (
                  <Bar 
                    key={sub}
                    yAxisId="left"
                    dataKey={sub}
                    stackId="subcategory"
                    fill={PASTEL_COLORS[idx % PASTEL_COLORS.length]}
                    name={sub}
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
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
}

