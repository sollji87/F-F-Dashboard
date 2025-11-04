'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * 대분류 YOY 비교 차트 (당월/누적 토글)
 */
export function CategoryYoYChart({ monthlyData, ytdData, title = '비용 대분류 YOY 비교' }) {
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
  
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
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            dataKey="category" 
            type="category" 
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value) => `${value.toLocaleString()}백만원`}
          />
          <Legend />
          <Bar dataKey="current" fill="#3b82f6" name="당해" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
          <Bar dataKey="previous" fill="#94a3b8" name="전년" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>비용 카테고리별 전년 대비 비교</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="monthly">당월</TabsTrigger>
            <TabsTrigger value="ytd">누적(YTD)</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" className="mt-4">
            {renderChart(monthlyData)}
          </TabsContent>
          <TabsContent value="ytd" className="mt-4">
            {renderChart(ytdData)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

