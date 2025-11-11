'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { YoYTrendChart } from '@/components/dashboard/charts/YoYTrendChart';
import { CategoryYoYChart } from '@/components/dashboard/charts/CategoryBarChart';
import { EfficiencyChart } from '@/components/dashboard/charts/EfficiencyChart';
import { AiInsightsPanel } from '@/components/dashboard/AiInsightsPanel';
import { CategoryInsightsPanel } from '@/components/dashboard/CategoryInsightsPanel';
import { PageLoader } from '@/components/dashboard/Loader';
import { ErrorState } from '@/components/dashboard/ErrorState';
import { ArrowLeft, Download, Edit3, Save, X, Calendar } from 'lucide-react';
import { BRAND_INFO } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BrandDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const brandCode = params.code;
  
  const [dashboardData, setDashboardData] = useState(null);
  const [rawCostsData, setRawCostsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 편집 모드 상태 (코멘트 편집용)
  const [isEditMode, setIsEditMode] = useState(false);
  const [comments, setComments] = useState({
    total_cost: '',
    cost_ratio: '',
    cost_per_person: '',
    cost_per_store: '',
  });
  
  // 필터 상태
  const [selectedMonth, setSelectedMonth] = useState('202510');
  const [kpiViewMode, setKpiViewMode] = useState('monthly'); // 'monthly' or 'ytd'
  const [selectedCategory, setSelectedCategory] = useState(null); // 선택된 대분류
  
  useEffect(() => {
    if (brandCode) {
      fetchDashboardData();
    }
  }, [brandCode, selectedMonth]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 대시보드 데이터 로드
      const response = await fetch(`/api/data/brand/${brandCode}?month=${selectedMonth}`);
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error);
      }
      
      // 원본 비용 데이터 로드 (드릴다운용)
      try {
        const costsResponse = await fetch(`/api/data/costs/${brandCode}?month=${selectedMonth}`);
        const costsResult = await costsResponse.json();
        if (costsResult.success) {
          setRawCostsData(costsResult.data);
          console.log('✅ 원본 비용 데이터 로드 완료:', costsResult.data.length, '건');
        }
      } catch (e) {
        console.warn('⚠️  원본 비용 데이터 로드 실패:', e);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 편집 모드 토글
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  // 코멘트 저장
  const saveComments = () => {
    setIsEditMode(false);
    alert('✅ 코멘트가 저장되었습니다!\n(임시 저장: 페이지 새로고침 시 초기화됩니다)');
  };
  
  // 코멘트 변경 핸들러
  const handleCommentChange = (field, value) => {
    setComments({
      ...comments,
      [field]: value,
    });
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
          sale: row.sale_amt, // 매출액은 처음 한 번만 할당 (모든 행에 동일한 값)
          headcount: row.headcount,
          store_cnt: row.store_cnt,
        };
      }
      monthlyAgg[row.month].cost += row.cost_amt;
      // sale은 중복 합산하지 않음 (이미 첫 번째 행에서 할당됨)
    });
    
    // 카테고리별 월별 집계 (CATEGORY_L1 기준)
    const categoryMonthlyAgg = {};
    monthly_data.forEach(row => {
      // row가 실제 Snowflake 데이터인지 확인
      const categoryL1 = row.category_l1 || row.category || '기타';
      const costAmt = row.cost_amt || row.cost || 0;
      const month = row.month || row.yyyymm;
      
      const key = `${month}_${categoryL1}`;
      if (!categoryMonthlyAgg[key]) {
        categoryMonthlyAgg[key] = {
          month: month,
          category: categoryL1,
          cost: 0,
        };
      }
      categoryMonthlyAgg[key].cost += costAmt;
    });
    
    console.log('📊 categoryMonthlyAgg 샘플:', Object.values(categoryMonthlyAgg).slice(0, 5));
    
    // 트렌드 데이터 (YOY 계산) - 2025년만 표시
    const trendData = Object.values(monthlyAgg)
      .filter(d => d.month.startsWith('2025') && d.month <= selectedMonth) // 선택월까지만 필터링
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((curr, idx, arr) => {
        const prevYearMonth = `${parseInt(curr.month.substring(0, 4)) - 1}${curr.month.substring(4, 6)}`;
        const prevYear = Object.values(monthlyAgg).find(d => d.month === prevYearMonth);
        const yoy = prevYear ? (curr.cost / prevYear.cost) * 100 : 0;
        
        // 해당 월의 카테고리별 비용 (원본 값 유지)
        const categoriesRaw = {};
        Object.values(categoryMonthlyAgg)
          .filter(c => c.month === curr.month)
          .forEach(c => {
            categoriesRaw[c.category] = c.cost; // 원 단위 원본 유지
          });
        
        // 카테고리별 비용을 백만원으로 변환 (표시용)
        const categories = {};
        Object.entries(categoriesRaw).forEach(([cat, cost]) => {
          categories[cat] = Math.round(cost / 1000000);
        });
        
        // 전체 비용은 카테고리 원본 합계 후 반올림
        const totalCostRaw = Object.values(categoriesRaw).reduce((sum, cost) => sum + cost, 0);
        
        return {
          month: curr.month,
          total_cost: Math.round(totalCostRaw / 1000000), // 원본 합계 후 백만원 변환
          prev_cost: prevYear ? Math.round(prevYear.cost / 1000000) : 0, // 전년 비용
          yoy: Math.round(yoy * 10) / 10,
          categories: categories,
        };
      });
    
    // 효율성 데이터
    const efficiencyData = Object.values(monthlyAgg)
      .filter(d => d.month <= selectedMonth) // 선택월까지만 필터링
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => {
        // 광고비 계산 (광고선전비 카테고리)
        const adCost = Object.values(categoryMonthlyAgg)
          .filter(c => c.month === d.month && c.category === '광고선전비')
          .reduce((sum, c) => sum + c.cost, 0);
        
        return {
          month: d.month,
          cost_ratio: d.sale > 0 ? (d.cost / d.sale) * 1.1 * 100 : 0, // 비용률 = 비용 / 매출액 * 1.1
          cost_per_person: d.headcount > 0 ? d.cost / d.headcount / 1000000 : 0,
          cost_per_store: d.store_cnt > 0 ? d.cost / d.store_cnt / 1000000 : 0,
          ad_ratio: d.sale > 0 ? (adCost / d.sale) * 1.1 * 100 : 0, // 광고비율 = 광고비 / 매출액 * 1.1
        };
      });
    
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
  
  // YTD (누적) 계산 - 1월부터 선택월까지
  const calculateYTD = () => {
    if (!dashboardData || !dashboardData.monthly_data) {
      return kpi;
    }
    
    const year = selectedMonth.substring(0, 4);
    const prevYear = (parseInt(year) - 1).toString();
    const currentMonthNum = parseInt(selectedMonth.substring(4, 6));
    
    // 당년 1월~선택월 누적
    const ytdData = dashboardData.monthly_data.filter(d => {
      const dataYear = d.month.substring(0, 4);
      const dataMonth = parseInt(d.month.substring(4, 6));
      return dataYear === year && dataMonth <= currentMonthNum;
    });
    
    // 월별로 그룹화 (카테고리별 중복 제거)
    const monthlyGrouped = {};
    ytdData.forEach(d => {
      if (!monthlyGrouped[d.month]) {
        monthlyGrouped[d.month] = {
          month: d.month,
          cost_amt: 0,
          sale_amt: d.sale_amt || 0, // sale은 카테고리와 무관하므로 첫 번째 것만
          salary_amt: d.salary_amt || 0, // salary도 첫 번째 것만 (모든 행에 동일한 값)
          headcount: d.headcount || 0,
          store_cnt: d.store_cnt || 0,
        };
      }
      monthlyGrouped[d.month].cost_amt += (d.cost_amt || 0);
    });
    
    const ytdMonthly = Object.values(monthlyGrouped);
    const ytdTotalCost = ytdMonthly.reduce((sum, d) => sum + d.cost_amt, 0);
    const ytdTotalSale = ytdMonthly.reduce((sum, d) => sum + d.sale_amt, 0);
    const avgHeadcount = ytdMonthly.length > 0 ? ytdMonthly.reduce((sum, d) => sum + d.headcount, 0) / ytdMonthly.length : 0;
    const avgStoreCount = ytdMonthly.length > 0 ? ytdMonthly.reduce((sum, d) => sum + d.store_cnt, 0) / ytdMonthly.length : 0;
    
    // 급료와 임금 총액 (각 행에 이미 계산되어 있음, 첫 번째 행만 사용)
    console.log('🔍 ytdData 샘플:', ytdData.slice(0, 5).map(d => ({ 
      month: d.month, 
      category: d.category_l1, 
      salary_amt: d.salary_amt,
      cost_amt: d.cost_amt 
    })));
    console.log('🔍 ytdMonthly 샘플:', ytdMonthly.slice(0, 3).map(d => ({ 
      month: d.month, 
      salary_amt: d.salary_amt,
      headcount: d.headcount
    })));
    
    const ytdSalaryCost = ytdMonthly.reduce((sum, d) => sum + (d.salary_amt || 0), 0);
    console.log('💰 YTD 급료와 임금:', { ytdSalaryCost, avgHeadcount });
    
    // 전년 1월~선택월 누적 (비교용)
    const prevYtdData = dashboardData.monthly_data.filter(d => {
      const dataYear = d.month.substring(0, 4);
      const dataMonth = parseInt(d.month.substring(4, 6));
      return dataYear === prevYear && dataMonth <= currentMonthNum;
    });
    
    // 전년도 월별로 그룹화 (카테고리별 중복 제거)
    const prevMonthlyGrouped = {};
    prevYtdData.forEach(d => {
      if (!prevMonthlyGrouped[d.month]) {
        prevMonthlyGrouped[d.month] = {
          month: d.month,
          cost_amt: 0,
          sale_amt: d.sale_amt || 0,
          salary_amt: d.salary_amt || 0, // salary도 첫 번째 것만 (모든 행에 동일한 값)
          headcount: d.headcount || 0,
          store_cnt: d.store_cnt || 0,
        };
      }
      prevMonthlyGrouped[d.month].cost_amt += (d.cost_amt || 0);
    });
    
    const prevYtdMonthly = Object.values(prevMonthlyGrouped);
    const prevYtdTotalCost = prevYtdMonthly.reduce((sum, d) => sum + d.cost_amt, 0);
    const prevYtdTotalSale = prevYtdMonthly.reduce((sum, d) => sum + d.sale_amt, 0);
    const prevAvgHeadcount = prevYtdMonthly.length > 0 ? prevYtdMonthly.reduce((sum, d) => sum + d.headcount, 0) / prevYtdMonthly.length : 0;
    const prevAvgStoreCount = prevYtdMonthly.length > 0 ? prevYtdMonthly.reduce((sum, d) => sum + d.store_cnt, 0) / prevYtdMonthly.length : 0;
    
    // 전년 급료와 임금 총액 (각 행에 이미 계산되어 있음)
    const prevYtdSalaryCost = prevYtdMonthly.reduce((sum, d) => sum + (d.salary_amt || 0), 0);
    
    console.log('📊 YTD 계산:', {
      year,
      prevYear,
      ytdDataCount: ytdData.length,
      prevYtdDataCount: prevYtdData.length,
      ytdTotalCost,
      prevYtdTotalCost,
      ytdTotalSale,
      prevYtdTotalSale
    });
    
    // 백만원 단위로 변환
    const ytdCostInMillion = Math.round(ytdTotalCost / 1000000);
    const prevYtdCostInMillion = Math.round(prevYtdTotalCost / 1000000);
    const costRatio = ytdTotalSale > 0 ? (ytdTotalCost / ytdTotalSale) * 1.1 * 100 : 0;
    const prevCostRatio = prevYtdTotalSale > 0 ? (prevYtdTotalCost / prevYtdTotalSale) * 1.1 * 100 : 0;
    const costPerPerson = avgHeadcount > 0 ? ytdTotalCost / avgHeadcount / 1000000 : 0;
    const prevCostPerPerson = prevAvgHeadcount > 0 ? prevYtdTotalCost / prevAvgHeadcount / 1000000 : 0;
    const salaryPerPerson = avgHeadcount > 0 ? ytdSalaryCost / avgHeadcount / 1000000 : 0;
    
    console.log('💰 인당 인건비 계산:', {
      ytdSalaryCost,
      prevYtdSalaryCost,
      avgHeadcount,
      prevAvgHeadcount,
      salaryPerPerson: salaryPerPerson.toFixed(1),
      prevSalaryPerPerson: prevAvgHeadcount > 0 ? (prevYtdSalaryCost / prevAvgHeadcount / 1000000).toFixed(1) : 0
    });
    const costPerStore = avgStoreCount > 0 ? ytdTotalCost / avgStoreCount / 1000000 : 0;
    const prevCostPerStore = prevAvgStoreCount > 0 ? prevYtdTotalCost / prevAvgStoreCount / 1000000 : 0;
    const yoyCost = prevYtdTotalCost > 0 ? (ytdTotalCost / prevYtdTotalCost) * 100 : 0;
    const yoyCostPerPerson = prevCostPerPerson > 0 ? (costPerPerson / prevCostPerPerson) * 100 : 0;
    const yoyCostPerStore = prevCostPerStore > 0 ? (costPerStore / prevCostPerStore) * 100 : 0;
    
    console.log('📊 YTD 결과:', {
      ytdCostInMillion,
      prevYtdCostInMillion,
      costRatio,
      prevCostRatio,
      yoyCost
    });
    
    return {
      total_cost: ytdCostInMillion,
      prev_total_cost: prevYtdCostInMillion,
      cost_ratio: parseFloat(costRatio.toFixed(1)),
      prev_cost_ratio: parseFloat(prevCostRatio.toFixed(1)),
      cost_per_person: parseFloat(costPerPerson.toFixed(1)),
      prev_cost_per_person: parseFloat(prevCostPerPerson.toFixed(1)),
      salary_per_person: parseFloat(salaryPerPerson.toFixed(1)),
      headcount: Math.round(avgHeadcount), // 누적 평균 인원수
      prev_headcount: Math.round(prevAvgHeadcount), // 전년 누적 평균 인원수
      cost_per_store: Math.round(costPerStore),
      prev_cost_per_store: Math.round(prevCostPerStore),
      store_count: Math.round(avgStoreCount), // 누적 평균 매장 수
      prev_store_count: Math.round(prevAvgStoreCount), // 전년 누적 평균 매장 수
      yoy: parseFloat(yoyCost.toFixed(1)),
      yoy_cost_per_person: parseFloat(yoyCostPerPerson.toFixed(1)),
      yoy_cost_per_store: parseFloat(yoyCostPerStore.toFixed(1)),
    };
  };
  
  const displayKpi = kpiViewMode === 'ytd' ? calculateYTD() : kpi;
  
  // 월 선택 옵션 (2025년 1~10월)
  const monthOptions = [
    { value: '202501', label: '2025년 1월' },
    { value: '202502', label: '2025년 2월' },
    { value: '202503', label: '2025년 3월' },
    { value: '202504', label: '2025년 4월' },
    { value: '202505', label: '2025년 5월' },
    { value: '202506', label: '2025년 6월' },
    { value: '202507', label: '2025년 7월' },
    { value: '202508', label: '2025년 8월' },
    { value: '202509', label: '2025년 9월' },
    { value: '202510', label: '2025년 10월' },
  ];
  
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
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 월 선택 드롭다운 - 메인 화면과 동일한 스타일 */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] sm:w-[160px] border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 hover:border-blue-300 dark:hover:border-blue-700 transition-colors font-semibold text-sm">
                <Calendar className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 편집 모드 버튼 */}
            {isEditMode ? (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={saveComments}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleEditMode}
                >
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleEditMode}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                편집
              </Button>
            )}
          </div>
        </div>
        
        {/* KPI 뷰 모드 토글 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">주요 지표 (KPI)</h2>
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setKpiViewMode('monthly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                kpiViewMode === 'monthly'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              당월
            </button>
            <button
              onClick={() => setKpiViewMode('ytd')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                kpiViewMode === 'ytd'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              누적 (YTD)
            </button>
          </div>
        </div>
        
        {/* KPI 카드 */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            title="총비용"
            value={displayKpi.total_cost}
            unit="백만원"
            yoy={displayKpi.yoy}
            prevValue={displayKpi.prev_total_cost}
            format="currency"
            description={kpiViewMode === 'monthly' ? "전년 동월 대비" : `1월~${parseInt(selectedMonth.substring(4, 6))}월 누적`}
            isEditable={isEditMode}
            comment={comments.total_cost}
            onCommentChange={(val) => handleCommentChange('total_cost', val)}
            brandColor={brandInfo.color}
          />
          <KpiCard 
            title="매출대비 비용률"
            value={displayKpi.cost_ratio}
            unit="%"
            yoy={displayKpi.yoy}
            prevValue={displayKpi.prev_cost_ratio}
            isRatioCard={true}
            format="decimal"
            description={kpiViewMode === 'monthly' ? "효율성 지표" : "누적 평균 비율"}
            isEditable={isEditMode}
            comment={comments.cost_ratio}
            onCommentChange={(val) => handleCommentChange('cost_ratio', val)}
            brandColor={brandInfo.color}
          />
          <KpiCard 
            title="인당 비용"
            value={displayKpi.cost_per_person}
            unit="백만원"
            yoy={displayKpi.yoy_cost_per_person}
            prevValue={displayKpi.prev_cost_per_person}
            format="decimal"
            description={`직원 1인당 인건비: ${(displayKpi.salary_per_person || 0).toFixed(1)}백만원 (${displayKpi.headcount || 0}명)`}
            isEditable={isEditMode}
            comment={comments.cost_per_person}
            onCommentChange={(val) => handleCommentChange('cost_per_person', val)}
            brandColor={brandInfo.color}
          />
          <KpiCard 
            title="매장당 비용"
            value={displayKpi.cost_per_store}
            unit="백만원"
            yoy={displayKpi.yoy_cost_per_store}
            prevValue={displayKpi.prev_cost_per_store}
            format="decimal"
            description={`매장수: ${displayKpi.store_count || 0}개 (온라인, 샵인샵, 상설, 기타 제외)`}
            isEditable={isEditMode}
            comment={comments.cost_per_store}
            onCommentChange={(val) => handleCommentChange('cost_per_store', val)}
            brandColor={brandInfo.color}
          />
        </div>
        
        {/* 차트 섹션 */}
        <div className="space-y-4 sm:space-y-6">
          {/* 월별 비용 추이 */}
          <div className="space-y-4">
            <YoYTrendChart data={trendData} rawCostsData={rawCostsData} />
            <AiInsightsPanel 
              brand={brandInfo.name}
              brandCode={brandCode}
              month={selectedMonth}
              kpi={kpi}
              trendData={trendData}
              topCategories={categoryMonthly.slice(0, 5).map(cat => ({
                name: cat.category,
                amount: cat.current,
                ratio: ((cat.current / kpi.total_cost) * 100).toFixed(1),
              }))}
            />
          </div>
          
          {/* 카테고리 비용 분석 */}
          <CategoryYoYChart 
            monthlyData={categoryMonthly}
            ytdData={categoryYtd}
            rawData={rawCostsData}
            selectedMonth={selectedMonth}
            onCategorySelect={setSelectedCategory}
          />
          
          {/* AI 인사이트 패널 */}
          <CategoryInsightsPanel 
            brand={brandInfo.name}
            brandCode={brandCode}
            month={selectedMonth}
            rawCostsData={rawCostsData}
            selectedCategory={selectedCategory}
          />
          
          {/* 효율성 차트 */}
          <EfficiencyChart data={efficiencyData} />
        </div>
      </div>
    </div>
  );
}

