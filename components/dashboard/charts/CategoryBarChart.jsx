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
  const [selectedL4, setSelectedL4] = useState(null); // GL_NM
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
    } else if (drillLevel === 'l4') {
      // L4에서는 계정을 선택 (코스트센터 표시용)
      console.log('✅ L4 계정 선택:', data.category);
      setSelectedL4(data.category);
    }
  };

  // 뒤로 가기
  const handleGoBack = () => {
    if (drillLevel === 'l4') {
      // L4에서 계정 선택을 해제
      if (selectedL4) {
        console.log('⏪ L4 계정 선택 해제');
        setSelectedL4(null);
      } else {
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

  // 코스트센터 차트 렌더링
  const renderCostCenterChart = (data) => {
    if (!selectedL1 && !selectedL2 && !selectedL3 && !selectedL4) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-zinc-500 text-sm">항목을 선택하면 코스트센터별 비용이 표시됩니다</p>
        </div>
      );
    }
    
    if (!data || data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-zinc-500 text-sm">선택된 항목의 코스트센터 데이터가 없습니다</p>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
            type="category" 
            dataKey="category" 
            tick={{ fontSize: 10, fill: '#374151' }}
            width={150}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: 11 }}
            iconType="rect"
            iconSize={8}
          />
          <Bar 
            dataKey="current" 
            fill="#60A5FA" 
            name="당해" 
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="previous" 
            fill="#9CA3AF" 
            name="전년" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // 커스텀 Y축 Tick (클릭 가능)
  const CustomYAxisTick = ({ x, y, payload }) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#374151"
          fontSize={11}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            console.log('📝 Y축 라벨 클릭:', payload.value);
            handleBarClick({ category: payload.value });
          }}
          onMouseEnter={(e) => {
            e.target.style.fill = '#2563eb';
            e.target.style.fontWeight = 'bold';
          }}
          onMouseLeave={(e) => {
            e.target.style.fill = '#374151';
            e.target.style.fontWeight = 'normal';
          }}
        >
          {payload.value}
        </text>
      </g>
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
            if (e && e.activePayload && e.activePayload[0]) {
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
            tick={<CustomYAxisTick />}
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
            cursor="pointer"
            onClick={(data) => {
              console.log('📊 Bar onClick:', data);
              if (data) {
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

  // 코스트센터 데이터 생성
  const getCostCenterData = (viewMode) => {
    console.log('🏢 getCostCenterData 호출:', { 
      viewMode, 
      drillLevel,
      selectedL1, 
      selectedL2, 
      selectedL3, 
      selectedL4,
      hasRawData: !!rawData, 
      selectedMonth 
    });
    
    if (!rawData || !selectedMonth) {
      console.log('❌ rawData or selectedMonth 없음');
      return [];
    }

    // 아무것도 선택되지 않았으면 빈 배열
    if (!selectedL1 && !selectedL2 && !selectedL3 && !selectedL4) {
      console.log('❌ 아무것도 선택 안됨');
      return [];
    }

    const currentYear = selectedMonth.substring(0, 4);
    const currentMonth = selectedMonth.substring(4, 6);
    const previousYear = String(parseInt(currentYear) - 1);

    console.log('📅 연도/월:', { currentYear, currentMonth, previousYear });

    // row.month는 "202510" 형식이므로 직접 비교
    const currentData = rawData.filter(row => 
      row.month.substring(0, 4) === currentYear && 
      row.month <= selectedMonth
    );
    const previousData = rawData.filter(row => 
      row.month.substring(0, 4) === previousYear && 
      row.month <= previousYear + currentMonth
    );

    console.log('📊 필터링된 데이터:', { currentData: currentData.length, previousData: previousData.length });

    const aggregation = {};

    // 선택된 레벨에 따라 필터링 (가장 깊은 레벨 우선)
    let filterCondition;
    
    if (selectedL4) {
      // L4 (계정) 선택됨
      filterCondition = (row) => 
        row.category_l1 === selectedL1 && 
        row.category_l2 === selectedL2 && 
        row.category_l3 === selectedL3 && 
        row.gl_name === selectedL4;
      console.log('🔍 L4 필터:', { selectedL1, selectedL2, selectedL3, selectedL4 });
    } else if (selectedL3) {
      // L3 (소분류) 선택됨
      filterCondition = (row) => 
        row.category_l1 === selectedL1 && 
        row.category_l2 === selectedL2 && 
        row.category_l3 === selectedL3;
      console.log('🔍 L3 필터:', { selectedL1, selectedL2, selectedL3 });
    } else if (selectedL2) {
      // L2 (중분류) 선택됨
      filterCondition = (row) => 
        row.category_l1 === selectedL1 && 
        row.category_l2 === selectedL2;
      console.log('🔍 L2 필터:', { selectedL1, selectedL2 });
    } else if (selectedL1) {
      // L1 (대분류) 선택됨
      filterCondition = (row) => row.category_l1 === selectedL1;
      console.log('🔍 L1 필터:', { selectedL1 });
    }
    
    // 샘플 데이터 확인
    if (currentData.length > 0) {
      const sample = currentData[0];
      console.log('📝 샘플 데이터 구조:', {
        category_l1: sample.category_l1,
        category_l2: sample.category_l2,
        category_l3: sample.category_l3,
        gl_name: sample.gl_name,
        cctr_name: sample.cctr_name,
        cctr_type: sample.cctr_type,
        cost_amt: sample.cost_amt
      });
    }

    // 당월/누적 처리
    if (viewMode === 'monthly') {
      // row.month는 "202510" 형식이므로 selectedMonth와 직접 비교
      currentData.filter(row => row.month === selectedMonth && filterCondition(row)).forEach(row => {
        const key = `${row.cctr_name || '미분류'} (${row.cctr_type || '-'})`;
        if (!aggregation[key]) aggregation[key] = { current: 0, previous: 0 };
        aggregation[key].current += (row.cost_amt || 0);
      });

      // 전년 동월 (예: 2024년 10월)
      const previousMonthFull = previousYear + currentMonth;
      previousData.filter(row => row.month === previousMonthFull && filterCondition(row)).forEach(row => {
        const key = `${row.cctr_name || '미분류'} (${row.cctr_type || '-'})`;
        if (!aggregation[key]) aggregation[key] = { current: 0, previous: 0 };
        aggregation[key].previous += (row.cost_amt || 0);
      });
    } else {
      // YTD
      currentData.filter(filterCondition).forEach(row => {
        const key = `${row.cctr_name || '미분류'} (${row.cctr_type || '-'})`;
        if (!aggregation[key]) aggregation[key] = { current: 0, previous: 0 };
        aggregation[key].current += (row.cost_amt || 0);
      });

      previousData.filter(filterCondition).forEach(row => {
        const key = `${row.cctr_name || '미분류'} (${row.cctr_type || '-'})`;
        if (!aggregation[key]) aggregation[key] = { current: 0, previous: 0 };
        aggregation[key].previous += (row.cost_amt || 0);
      });
    }

    const result = Object.entries(aggregation)
      .map(([category, data]) => ({
        category,
        current: Math.round(data.current / 1000000),
        previous: Math.round(data.previous / 1000000),
        yoy: data.previous > 0 ? ((data.current / data.previous) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.current - a.current)
      .slice(0, 10); // 상위 10개만
    
    console.log('✅ 코스트센터 결과:', result.length, '개 항목 (상위 10개)', result.slice(0, 3));
    return result;
  };

  return (
    <Card className="h-full flex flex-col">
      <Tabs defaultValue="monthly" className="flex-1 flex flex-col">
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
                    {drillLevel === 'l4' && '계정별 비용 비교 (선택 시 오른쪽 코스트센터 차트 표시)'}
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
          <CardContent className="flex-1">
            <TabsContent value="monthly" className="mt-0 h-full">
              <div className="grid grid-cols-2 gap-4">
                {/* 왼쪽: 계정별 차트 */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">계정별</h4>
                  {renderChart(getCurrentData('monthly'))}
                </div>
                {/* 오른쪽: 코스트센터별 차트 */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                    {selectedL4 ? `${selectedL4} > 코스트센터별` : 
                     selectedL3 ? `${selectedL3} > 코스트센터별` : 
                     selectedL2 ? `${selectedL2} > 코스트센터별` : 
                     selectedL1 ? `${selectedL1} > 코스트센터별` : 
                     '코스트센터별 (항목 선택 필요)'}
                  </h4>
                  {renderCostCenterChart(getCostCenterData('monthly'))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="ytd" className="mt-0 h-full">
              <div className="grid grid-cols-2 gap-4">
                {/* 왼쪽: 계정별 차트 */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">계정별</h4>
                  {renderChart(getCurrentData('ytd'))}
                </div>
                {/* 오른쪽: 코스트센터별 차트 */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                    {selectedL4 ? `${selectedL4} > 코스트센터별` : 
                     selectedL3 ? `${selectedL3} > 코스트센터별` : 
                     selectedL2 ? `${selectedL2} > 코스트센터별` : 
                     selectedL1 ? `${selectedL1} > 코스트센터별` : 
                     '코스트센터별 (항목 선택 필요)'}
                  </h4>
                  {renderCostCenterChart(getCostCenterData('ytd'))}
                </div>
              </div>
            </TabsContent>
          </CardContent>
        )}
      </Tabs>
    </Card>
  );
}

