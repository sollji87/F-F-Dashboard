'use client';

import { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { BrandSelector } from "@/components/dashboard/BrandSelector";
import { PageLoader } from "@/components/dashboard/Loader";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { BarChart3, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('202510'); // 기본값: 2025년 10월
  
  // 월 옵션 생성 (2025년 1월 ~ 10월)
  const monthOptions = [];
  for (let month = 1; month <= 10; month++) {
    const monthStr = `2025${String(month).padStart(2, '0')}`;
    const label = `2025년 ${month}월`;
    monthOptions.push({ value: monthStr, label });
  }
  
  useEffect(() => {
    fetchBrands(selectedMonth);
  }, [selectedMonth]);
  
  const fetchBrands = async (month) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data/brands?month=${month}`);
      const result = await response.json();
      
      if (result.success) {
        setBrands(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <PageLoader message="브랜드 데이터를 불러오는 중..." />;
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
        <div className="mx-auto max-w-4xl">
          <ErrorState 
            title="데이터 로딩 실패"
            message={error}
            onRetry={fetchBrands}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950 p-4 sm:p-6 md:p-8">
      <main className="mx-auto max-w-[1600px] space-y-8 sm:space-y-12">
        {/* 헤더 섹션 */}
        <div className="text-center space-y-6 pt-4 sm:pt-8 pb-4">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-800">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
              F&F 비용 분석 대시보드
          </h1>
          </div>
        </div>

        {/* 브랜드 선택 섹션 */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">브랜드 선택</h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                분석할 브랜드를 클릭하여 상세 대시보드로 이동합니다
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 hover:border-blue-300 dark:hover:border-blue-700 transition-colors font-semibold">
                    <Calendar className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {monthOptions.map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm w-fit font-semibold border-2">
                {brands.length}개 브랜드
              </Badge>
            </div>
          </div>
          
          <BrandSelector brands={brands} />
        </div>
      </main>
    </div>
  );
}
