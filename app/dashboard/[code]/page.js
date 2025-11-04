'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { YoYTrendChart } from '@/components/dashboard/charts/YoYTrendChart';
import { CategoryYoYChart } from '@/components/dashboard/charts/CategoryBarChart';
import { EfficiencyChart } from '@/components/dashboard/charts/EfficiencyChart';
import { AiInsightsPanel } from '@/components/dashboard/AiInsightsPanel';
import { PageLoader } from '@/components/dashboard/Loader';
import { ErrorState } from '@/components/dashboard/ErrorState';
import { ArrowLeft, Download } from 'lucide-react';
import { BRAND_INFO, COST_CATEGORIES } from '@/lib/types';

export default function BrandDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const brandCode = params.code;
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 필터 상태
  const [selectedMonth, setSelectedMonth] = useState('202412');
  const [selectedCctrType, setSelectedCctrType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [excludeCommon, setExcludeCommon] = useState(false);
  
  useEffect(() => {
    if (brandCode) {
      fetchDashboardData();
    }
  }, [brandCode, selectedMonth]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data/brand/${brandCode}?month=${selectedMonth}`);
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 차트 데이터 가공
  const getChartData = () => {
    if (!dashboardData) return { trendData: [], categoryMonthly: [], categoryYtd: [], efficiencyData: [] };
    
    const { monthly_data } = dashboardData;
    
    // 월별 집계
    const monthlyAgg = {};
    monthly_data.forEach(row => {
      if (!monthlyAgg[row.month]) {
        monthlyAgg[row.month] = {
          month: row.month,
          cost: 0,
          sale: 0,
          headcount: row.headcount,
          store_cnt: row.store_cnt,
        };
      }
      monthlyAgg[row.month].cost += row.cost_amt;
      monthlyAgg[row.month].sale += row.sale_amt;
    });
    
    // 트렌드 데이터 (YOY 계산)
    const trendData = Object.values(monthlyAgg)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((curr, idx, arr) => {
        const prevYearMonth = `${parseInt(curr.month.substring(0, 4)) - 1}${curr.month.substring(4, 6)}`;
        const prevYear = arr.find(d => d.month === prevYearMonth);
        const yoy = prevYear ? ((curr.cost - prevYear.cost) / prevYear.cost) * 100 : 0;
        
        return {
          month: curr.month,
          cost: Math.round(curr.cost),
          yoy: Math.round(yoy * 10) / 10,
        };
      });
    
    // 효율성 데이터
    const efficiencyData = Object.values(monthlyAgg)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        month: d.month,
        cost_ratio: d.sale > 0 ? (d.cost / d.sale) * 100 : 0,
        cost_per_person: d.headcount > 0 ? d.cost / d.headcount / 1000000 : 0,
        cost_per_store: d.store_cnt > 0 ? d.cost / d.store_cnt / 1000000 : 0,
      }));
    
    // 카테고리별 집계 (당월)
    const currentMonthData = monthly_data.filter(d => d.month === selectedMonth);
    const categoryAgg = {};
    currentMonthData.forEach(row => {
      if (!categoryAgg[row.category_l1]) {
        categoryAgg[row.category_l1] = { current: 0, previous: 0 };
      }
      categoryAgg[row.category_l1].current += row.cost_amt;
    });
    
    // 전년 동월 데이터
    const prevYearMonth = `${parseInt(selectedMonth.substring(0, 4)) - 1}${selectedMonth.substring(4, 6)}`;
    const prevMonthData = monthly_data.filter(d => d.month === prevYearMonth);
    prevMonthData.forEach(row => {
      if (!categoryAgg[row.category_l1]) {
        categoryAgg[row.category_l1] = { current: 0, previous: 0 };
      }
      categoryAgg[row.category_l1].previous += row.cost_amt;
    });
    
    const categoryMonthly = Object.entries(categoryAgg)
      .map(([category, data]) => ({
        category,
        current: Math.round(data.current),
        previous: Math.round(data.previous),
      }))
      .sort((a, b) => b.current - a.current);
    
    return { trendData, categoryMonthly, categoryYtd: categoryMonthly, efficiencyData };
  };
  
  if (loading) {
    return <PageLoader message="대시보드 데이터를 불러오는 중..." />;
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
        <div className="mx-auto max-w-7xl">
          <ErrorState 
            title="데이터 로딩 실패"
            message={error}
            onRetry={fetchDashboardData}
          />
        </div>
      </div>
    );
  }
  
  if (!dashboardData) return null;
  
  const brandInfo = BRAND_INFO[brandCode];
  const { kpi } = dashboardData;
  const { trendData, categoryMonthly, categoryYtd, efficiencyData } = getChartData();
  
  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6 md:p-8 dark:bg-black">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
                <div 
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg"
                  style={{ backgroundColor: brandInfo.color }}
                >
                  {brandInfo.shortName}
                </div>
                <span className="break-words">{brandInfo.name} 비용 분석</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {selectedMonth.substring(0, 4)}년 {parseInt(selectedMonth.substring(4, 6))}월 기준
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full sm:w-auto text-sm">
            <Download className="mr-2 h-4 w-4" />
            데이터 다운로드
          </Button>
        </div>
        
        {/* 필터바 */}
        <FilterBar 
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedCctrType={selectedCctrType}
          onCctrTypeChange={setSelectedCctrType}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          excludeCommon={excludeCommon}
          onExcludeCommonChange={setExcludeCommon}
          categories={Object.values(COST_CATEGORIES)}
        />
        
        {/* KPI 카드 */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            title="총비용"
            value={kpi.total_cost}
            unit="백만원"
            yoy={kpi.yoy}
            format="currency"
            description="전년 동월 대비"
          />
          <KpiCard 
            title="매출대비 비용률"
            value={kpi.cost_ratio}
            unit="%"
            yoy={kpi.yoy}
            format="decimal"
            description="효율성 지표"
          />
          <KpiCard 
            title="인당 비용"
            value={kpi.cost_per_person}
            unit="백만원"
            yoy={kpi.yoy}
            format="decimal"
            description="직원 1인당 평균"
          />
          <KpiCard 
            title="매장당 비용"
            value={kpi.cost_per_store}
            unit="백만원"
            yoy={kpi.yoy}
            format="decimal"
            description="매장 1개당 평균"
          />
        </div>
        
        {/* 차트 섹션 */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <YoYTrendChart data={trendData} />
          </div>
          
          <CategoryYoYChart 
            monthlyData={categoryMonthly}
            ytdData={categoryYtd}
          />
          
          <EfficiencyChart data={efficiencyData} />
          
          {/* AI 인사이트 패널 */}
          <div className="lg:col-span-2">
            <AiInsightsPanel 
              brand={brandInfo.name}
              month={selectedMonth}
              kpi={kpi}
              topCategories={categoryMonthly.slice(0, 5).map(cat => ({
                name: cat.category,
                amount: cat.current,
                ratio: ((cat.current / kpi.total_cost) * 100).toFixed(1),
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

