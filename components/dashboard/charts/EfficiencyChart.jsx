'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
      const year = label.substring(0, 4);
      const month = label.substring(4, 6);
      const monthLabel = `${year}년 ${parseInt(month)}월`;
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-zinc-200" style={{ minWidth: '160px' }}>
          <p className="font-bold text-sm mb-2 text-zinc-900">{monthLabel}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-zinc-700">{entry.name}</span>
                </div>
                <span className="text-xs font-semibold text-zinc-900 text-right">
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
            <CardDescription className="text-xs">비율(꺾은선): 비용률, 광고비율 | 금액(막대): 인당 비용, 매장당 비용</CardDescription>
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
            <ComposedChart data={filtered2025Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                label={{ value: '비율 (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
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
                wrapperStyle={{ fontSize: 12 }}
                iconType="rect"
                iconSize={10}
                content={(props) => {
                  const { payload } = props;
                  if (!payload) return null;
                  
                  // 범례 순서: 막대(금액) → 꺾은선(비율)
                  const orderedItems = [
                    {
                      value: '인당 비용',
                      type: 'rect',
                      color: '#A7F3D0',
                    },
                    {
                      value: '매장당 비용',
                      type: 'rect',
                      color: '#FED7AA',
                    },
                    {
                      value: '비용률',
                      type: 'line',
                      color: '#93C5FD',
                    },
                    {
                      value: '광고비율',
                      type: 'line',
                      color: '#F9A8D4',
                    }
                  ];
                  
                  return (
                    <ul className="flex flex-wrap justify-center gap-4 mt-4">
                      {orderedItems.map((entry, index) => (
                        <li 
                          key={`item-${index}`} 
                          className="flex items-center gap-2"
                        >
                          {entry.type === 'line' ? (
                            <svg width="14" height="14" viewBox="0 0 14 14">
                              <line x1="0" y1="7" x2="14" y2="7" stroke={entry.color} strokeWidth="2" />
                            </svg>
                          ) : (
                            <svg width="10" height="10">
                              <rect width="10" height="10" fill={entry.color} />
                            </svg>
                          )}
                          <span className="text-xs text-zinc-700">{entry.value}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }}
              />
              {/* 금액 지표 - 막대 (먼저 렌더링) */}
              <Bar 
                yAxisId="right"
                dataKey="cost_per_person" 
                fill="#A7F3D0" 
                name="인당 비용"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="cost_per_store" 
                fill="#FED7AA" 
                name="매장당 비용"
                radius={[4, 4, 0, 0]}
              />
              {/* 비율 지표 - 꺾은선 (나중에 렌더링 = 위에 표시) */}
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="cost_ratio" 
                stroke="#93C5FD" 
                strokeWidth={3}
                name="비용률"
                dot={{ r: 5, fill: '#93C5FD', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="ad_ratio" 
                stroke="#F9A8D4" 
                strokeWidth={3}
                name="광고비율"
                dot={{ r: 5, fill: '#F9A8D4', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      )}
    </Card>
  );
}

