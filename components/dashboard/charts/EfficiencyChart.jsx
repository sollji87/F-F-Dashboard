'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * 효율성 지표 트렌드 차트 (비용률/인당/매장당)
 */
export function EfficiencyChart({ data, title = '효율성 지표 추이' }) {
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
  
  // 2025년 데이터만 필터링
  const filtered2025Data = data.filter(item => item.month.startsWith('2025'));
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthLabel = `${label.substring(0, 4)}년 ${label.substring(4, 6)}월`;
      
      return (
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
          <p className="font-semibold text-sm mb-2">{monthLabel}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <span style={{ color: entry.color }}>{entry.name}:</span>
                <span className="font-semibold" style={{ color: entry.color }}>
                  {entry.name === '비용률' || entry.name === '광고비율'
                    ? `${entry.value.toFixed(1)}%`
                    : `${entry.value.toFixed(1)}백만원`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">{title}</CardTitle>
            <CardDescription className="text-xs">매출대비 비용률, 광고비율, 인당 비용, 매장당 비용</CardDescription>
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
            <LineChart data={filtered2025Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.substring(4, 6)}월`}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                label={{ value: '비용률 (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toLocaleString()}`}
                label={{ value: '비용 (백만원)', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                iconType="line"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="cost_ratio" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                name="비용률"
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cost_per_person" 
                stroke="#10b981" 
                strokeWidth={2.5}
                name="인당 비용"
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cost_per_store" 
                stroke="#f59e0b" 
                strokeWidth={2.5}
                name="매장당 비용"
                dot={{ r: 4, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="ad_ratio" 
                stroke="#ec4899" 
                strokeWidth={2.5}
                name="광고비율"
                dot={{ r: 4, fill: '#ec4899' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      )}
    </Card>
  );
}

