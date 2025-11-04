'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

// CATEGORY_L1별 색상 정의 (월별 추이 차트와 동일)
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
 * 대분류 YOY 비교 차트 (당월/누적 토글 + 드릴다운)
 */
export function CategoryYoYChart({ monthlyData, ytdData, rawData, selectedMonth, onCategorySelect, title = '비용 대분류 YOY 비교' }) {
  const [drillLevel, setDrillLevel] = useState('l1'); // 'l1', 'l2', 'l3', 'l4'
  const [selectedL1, setSelectedL1] = useState(null);
  const [selectedL2, setSelectedL2] = useState(null);
  const [selectedL3, setSelectedL3] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 드릴다운 데이터 생성
  const getDrillDownData = (level, parent) => {
    if (!rawData || !selectedMonth) {
      console.log('❌ rawData or selectedMonth missing:', { hasRawData: !!rawData, selectedMonth });
      return [];
    }

    const currentYear = selectedMonth.substring(0, 4);
    const prevYear = (parseInt(currentYear) - 1).toString();
    const monthNum = selectedMonth.substring(4, 6);

    // 현재 월 데이터 (month 필드 사용)
    const currentData = rawData.filter(row => row.month === selectedMonth);
    // 전년 동월 데이터
    const previousData = rawData.filter(row => row.month === `${prevYear}${monthNum}`);

    console.log(`📊 드릴다운 [${level}] [${parent}]:`, {
      currentDataCount: currentData.length,
      previousDataCount: previousData.length,
      sampleRow: currentData[0]
    });

    let aggregation = {};

    if (level === 'l2') {
      // 중분류 (선택된 대분류 하위)
      currentData.filter(row => row.category_l1 === parent).forEach(row => {
        const key = row.category_l2 || '기타';
        if (!aggregation[key]) {
          aggregation[key] = { current: 0, previous: 0 };
        }
        aggregation[key].current += (row.cost_amt || 0);
      });

      previousData.filter(row => row.category_l1 === parent).forEach(row => {
        const key = row.category_l2 || '기타';
        if (!aggregation[key]) {
          aggregation[key] = { current: 0, previous: 0 };
        }
        aggregation[key].previous += (row.cost_amt || 0);
      });
    } else if (level === 'l3') {
      // 소분류 (선택된 중분류 하위)
      currentData.filter(row => row.category_l1 === selectedL1 && row.category_l2 === parent).forEach(row => {
        const key = row.category_l3 || '기타';
        if (!aggregation[key]) {
          aggregation[key] = { current: 0, previous: 0 };
        }
        aggregation[key].current += (row.cost_amt || 0);
      });

      previousData.filter(row => row.category_l1 === selectedL1 && row.category_l2 === parent).forEach(row => {
        const key = row.category_l3 || '기타';
        if (!aggregation[key]) {
          aggregation[key] = { current: 0, previous: 0 };
        }
        aggregation[key].previous += (row.cost_amt || 0);
      });
    } else if (level === 'l4') {
      // 계정별 (GL_NM - 선택된 소분류 하위)
      currentData.filter(row => 
        row.category_l1 === selectedL1 && 
        row.category_l2 === selectedL2 && 
        row.category_l3 === parent
      ).forEach(row => {
        const key = row.gl_name || '기타';
        if (!aggregation[key]) {
          aggregation[key] = { current: 0, previous: 0 };
        }
        aggregation[key].current += (row.cost_amt || 0);
      });

      previousData.filter(row => 
        row.category_l1 === selectedL1 && 
        row.category_l2 === selectedL2 && 
        row.category_l3 === parent
      ).forEach(row => {
        const key = row.gl_name || '기타';
        if (!aggregation[key]) {
          aggregation[key] = { current: 0, previous: 0 };
        }
        aggregation[key].previous += (row.cost_amt || 0);
      });
    }

    return Object.entries(aggregation)
      .map(([category, data]) => ({
        category,
        current: Math.round(data.current / 1000000), // 원 -> 백만원 단위
        previous: Math.round(data.previous / 1000000), // 원 -> 백만원 단위
      }))
      .sort((a, b) => b.current - a.current);
  };

  // 바 클릭 핸들러
  const handleBarClick = (data) => {
    console.log('🖱️ 바 클릭:', { drillLevel, data });
    
    if (drillLevel === 'l1') {
      // 대분류 클릭 → 중분류 확인
      const l2Data = getDrillDownData('l2', data.category);
      console.log('🔍 L2 데이터 확인:', l2Data);
      
      // 부모 컴포넌트에 선택된 대분류 전달
      if (onCategorySelect) {
        onCategorySelect(data.category);
      }
      
      // 중분류가 1개이고, 이름이 대분류와 같으면 소분류로 바로 이동
      if (l2Data.length === 1 && l2Data[0].category === data.category) {
        console.log('⏭️ L1 → L3 (중분류 스킵):', data.category);
        setSelectedL1(data.category);
        setSelectedL2(l2Data[0].category);
        setDrillLevel('l3');
      } else {
        console.log('➡️ L1 → L2 이동:', data.category);
        setSelectedL1(data.category);
        setDrillLevel('l2');
      }
    } else if (drillLevel === 'l2') {
      // 중분류 클릭 → 소분류 확인
      const l3Data = getDrillDownData('l3', data.category);
      console.log('🔍 L3 데이터 확인:', l3Data);
      
      // 소분류가 1개이고, 이름이 중분류와 같으면 계정별로 바로 이동
      if (l3Data.length === 1 && l3Data[0].category === data.category) {
        console.log('⏭️ L2 → L4 (소분류 스킵):', data.category);
        setSelectedL2(data.category);
        setSelectedL3(l3Data[0].category);
        setDrillLevel('l4');
      } else {
        console.log('➡️ L2 → L3 이동:', data.category);
        setSelectedL2(data.category);
        setDrillLevel('l3');
      }
    } else if (drillLevel === 'l3') {
      console.log('➡️ L3 → L4 이동:', data.category);
      setSelectedL3(data.category);
      setDrillLevel('l4');
    }
  };

  // 뒤로 가기
  const handleGoBack = () => {
    if (drillLevel === 'l4') {
      // L4 → L3 또는 L2로 복귀
      // 소분류가 1개이고 중분류와 이름이 같았다면 L2로 바로 복귀
      const l3Data = getDrillDownData('l3', selectedL2);
      if (l3Data.length === 1 && l3Data[0].category === selectedL2) {
        console.log('⏪ L4 → L2 (소분류 스킵)');
        setSelectedL3(null);
        setSelectedL2(null);
        setDrillLevel('l2');
      } else {
        console.log('⏪ L4 → L3');
        setSelectedL3(null);
        setDrillLevel('l3');
      }
    } else if (drillLevel === 'l3') {
      // L3 → L2 또는 L1로 복귀
      // 중분류가 1개이고 대분류와 이름이 같았다면 L1로 바로 복귀
      const l2Data = getDrillDownData('l2', selectedL1);
      if (l2Data.length === 1 && l2Data[0].category === selectedL1) {
        console.log('⏪ L3 → L1 (중분류 스킵)');
        setSelectedL3(null);
        setSelectedL2(null);
        setSelectedL1(null);
        setDrillLevel('l1');
      } else {
        console.log('⏪ L3 → L2');
        setSelectedL2(null);
        setDrillLevel('l2');
      }
    } else if (drillLevel === 'l2') {
      console.log('⏪ L2 → L1');
      setSelectedL1(null);
      setDrillLevel('l1');
    }
  };

  // 현재 레벨의 데이터 가져오기
  const getCurrentData = (viewMode) => {
    const baseData = viewMode === 'monthly' ? monthlyData : ytdData;
    
    if (drillLevel === 'l1') {
      // 대분류 데이터도 백만원 단위로 변환
      return baseData.map(item => ({
        ...item,
        current: Math.round(item.current / 1000000),
        previous: Math.round(item.previous / 1000000),
      }));
    } else if (drillLevel === 'l2') {
      return getDrillDownData('l2', selectedL1);
    } else if (drillLevel === 'l3') {
      return getDrillDownData('l3', selectedL2);
    } else if (drillLevel === 'l4') {
      return getDrillDownData('l4', selectedL3);
    }
    return baseData;
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const currentData = payload.find(p => p.dataKey === 'current');
    const previousData = payload.find(p => p.dataKey === 'previous');
    
    const current = currentData?.value || 0;
    const previous = previousData?.value || 0;
    const yoy = previous > 0 ? (current / previous) * 100 : 0;

    return (
      <div className="bg-white dark:bg-zinc-800 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg min-w-[200px]">
        <p className="font-bold text-sm mb-2 text-zinc-900 dark:text-zinc-100">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">당해:</span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {current.toLocaleString()}백만원
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">전년:</span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {previous.toLocaleString()}백만원
            </span>
          </div>
          <hr className="my-1.5 border-zinc-200 dark:border-zinc-600" />
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">YOY:</span>
            <span className={`text-xs font-bold ${yoy > 100 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {yoy.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-zinc-500">데이터가 없습니다</p>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onClick={(e) => {
            if (e && e.activePayload && e.activePayload[0] && drillLevel !== 'l4') {
              handleBarClick(e.activePayload[0].payload);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(value) => `${value.toLocaleString()}`}
            label={{ value: '비용 (백만원)', position: 'insideBottomRight', offset: 0, style: { fontSize: 12, fill: '#6b7280' } }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            dataKey="category" 
            type="category" 
            width={120}
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: 12 }}
            iconType="rect"
            iconSize={10}
          />
          <Bar 
            dataKey="current" 
            fill="#60A5FA" 
            name="당해" 
            radius={[0, 4, 4, 0]}
            cursor={drillLevel !== 'l4' ? 'pointer' : 'default'}
            onClick={(data) => {
              console.log('📊 Bar onClick:', data);
              if (data && drillLevel !== 'l4') {
                handleBarClick(data);
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={drillLevel === 'l1' ? (CATEGORY_COLORS[entry.category] || '#9ca3af') : '#60A5FA'} 
              />
            ))}
          </Bar>
          <Bar dataKey="previous" fill="#94a3b8" name="전년" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // 타이틀 생성
  const getTitle = () => {
    if (drillLevel === 'l1') return title;
    if (drillLevel === 'l2') return `${selectedL1} > 중분류`;
    if (drillLevel === 'l3') return `${selectedL1} > ${selectedL2} > 소분류`;
    if (drillLevel === 'l4') return `${selectedL1} > ${selectedL2} > ${selectedL3} > 계정별`;
    return title;
  };

  return (
    <Card>
      <Tabs defaultValue="monthly">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {drillLevel !== 'l1' && (
                <Button
                  onClick={handleGoBack}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <CardTitle>{getTitle()}</CardTitle>
                {!isCollapsed && (
                  <CardDescription>
                    {drillLevel === 'l1' && '비용 카테고리별 전년 대비 비교 (클릭하여 상세보기)'}
                    {drillLevel === 'l2' && '중분류별 비용 비교 (클릭하여 소분류 보기)'}
                    {drillLevel === 'l3' && '소분류별 비용 비교 (클릭하여 계정별 보기)'}
                    {drillLevel === 'l4' && '계정별 상세 비용 (GL_NM)'}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCollapsed(!isCollapsed)}
                variant="ghost"
                size="sm"
              >
                {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </Button>
              <TabsList className="grid grid-cols-2 w-[140px] h-[32px]">
                <TabsTrigger value="monthly" className="text-xs px-2 py-1">당월</TabsTrigger>
                <TabsTrigger value="ytd" className="text-xs px-2 py-1">누적</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <TabsContent value="monthly" className="mt-0">
              {renderChart(getCurrentData('monthly'))}
            </TabsContent>
            <TabsContent value="ytd" className="mt-0">
              {renderChart(getCurrentData('ytd'))}
            </TabsContent>
          </CardContent>
        )}
      </Tabs>
    </Card>
  );
}
