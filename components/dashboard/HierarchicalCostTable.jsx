'use client';

import { useState, useEffect, Fragment } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Edit2, Save, X } from 'lucide-react';

/**
 * 비용 계정 상세 분석 (계층형 드릴다운)
 * CATEGORY_L1 → L2 → L3 구조
 */
export function HierarchicalCostTable({ brand, month, brandColor }) {
  const [loading, setLoading] = useState(true);
  const [costsData, setCostsData] = useState(null);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'ytd'
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const [insights, setInsights] = useState({});
  const [editingInsightKey, setEditingInsightKey] = useState(null);
  const [editedInsightText, setEditedInsightText] = useState('');

  useEffect(() => {
    fetchCostsData();
    fetchInsights();
  }, [brand, month, viewMode]);

  const fetchCostsData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ledger data:', { brand, month, viewMode });
      
      const response = await fetch(`/api/ledger/${brand}?month=${month}&mode=${viewMode}`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setLoading(false);
        return;
      }
      
      const result = await response.json();
      console.log('📦 Result:', result);
      console.log('📦 Details length:', result.data?.details?.length);
      console.log('📦 Prev details length:', result.data?.prev_year_details?.length);
      
      if (result.success && result.data) {
        setCostsData(result.data);
        console.log('✅ Data loaded successfully');
        console.log('✅ Sample detail:', result.data.details?.[0]);
      } else {
        console.error('❌ API returned error:', result.error);
      }
    } catch (error) {
      console.error('❌ 비용 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      // 브랜드명 매핑 (URL 파라미터 → 파일명)
      const brandNameMap = {
        'MLB': 'MLB',
        'MLB KIDS': 'MLB_KIDS',
        'MLB_KIDS': 'MLB_KIDS',
        'MLBKIDS': 'MLB_KIDS',
        'DUVETICA': 'DUVETICA',
        'DISCOVERY': 'Discovery',
        'Discovery': 'Discovery',
        'SERGIO TACCHINI': 'SERGIO_TACCHINI',
        'SERGIO_TACCHINI': 'SERGIO_TACCHINI',
        'SERGIOTACCHINI': 'SERGIO_TACCHINI',
      };
      
      const brandKey = brand.replace(/\s+/g, '').toUpperCase();
      const brandName = brandNameMap[brand] || brandNameMap[brandKey] || brand.replace(/\s+/g, '_');
      const url = `/data/ledger_insights/${brandName}_${month}_insights.csv`;
      console.log('🔍 인사이트 파일 요청:', url, '(brand:', brand, '→', brandName, ')');
      
      const response = await fetch(url);
      console.log('📡 인사이트 응답:', response.status, response.ok);
      
      if (!response.ok) {
        console.log('⚠️ AI 인사이트 파일 없음:', response.status);
        return;
      }
      
      const text = await response.text();
      const lines = text.trim().split('\n').slice(1); // 헤더 제외
      
      const insightsMap = {};
      lines.forEach(line => {
        const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)",([^,]+),([^,]+),([^,]+),([^,]+),"([^"]+)"/);
        if (match) {
          const [, , level, l1, l2, l3, , , , , insight] = match;
          if (level === 'L3') { // L3만 저장
            const key = `${l1}|${l2}|${l3}`;
            insightsMap[key] = insight;
          }
        }
      });
      
      setInsights(insightsMap);
      console.log('✅ AI 인사이트 로드:', Object.keys(insightsMap).length, '개');
    } catch (error) {
      console.error('❌ AI 인사이트 로딩 실패:', error);
    }
  };

  const getL3Insight = (l1, l2, l3) => {
    const key = `${l1}|${l2}|${l3}`;
    return insights[key] || `전년 대비 변동`;
  };

  const handleEditInsight = (l1, l2, l3) => {
    const key = `${l1}|${l2}|${l3}`;
    setEditingInsightKey(key);
    setEditedInsightText(insights[key] || '');
  };

  const handleSaveInsight = async (l1, l2, l3) => {
    try {
      const key = `${l1}|${l2}|${l3}`;
      
      // 브랜드명 매핑
      const brandNameMap = {
        'MLB': 'MLB',
        'MLB KIDS': 'MLB_KIDS',
        'MLB_KIDS': 'MLB_KIDS',
        'MLBKIDS': 'MLB_KIDS',
        'DUVETICA': 'DUVETICA',
        'DISCOVERY': 'Discovery',
        'Discovery': 'Discovery',
        'SERGIO TACCHINI': 'SERGIO_TACCHINI',
        'SERGIO_TACCHINI': 'SERGIO_TACCHINI',
        'SERGIOTACCHINI': 'SERGIO_TACCHINI',
      };
      
      const brandKey = brand.replace(/\s+/g, '').toUpperCase();
      const brandName = brandNameMap[brand] || brandNameMap[brandKey] || brand.replace(/\s+/g, '_');
      
      // API로 저장
      const response = await fetch('/api/ledger/insights/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName,
          month,
          category_l1: l1,
          category_l2: l2,
          category_l3: l3,
          insight: editedInsightText,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 로컬 상태 업데이트
        setInsights(prev => ({
          ...prev,
          [key]: editedInsightText,
        }));
        setEditingInsightKey(null);
        setEditedInsightText('');
        console.log('✅ L3 인사이트 저장 성공');
      } else {
        console.error('❌ L3 인사이트 저장 실패:', result.error);
        alert('저장에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('❌ L3 인사이트 저장 에러:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEditInsight = () => {
    setEditingInsightKey(null);
    setEditedInsightText('');
  };

  const generateDescription = (diff, yoy, diffAmount, children = null) => {
    const diffPercent = Math.abs(yoy - 100).toFixed(1);
    const diffText = yoy >= 100 ? '증가' : '감소';
    const diffSign = diff >= 0 ? '+' : '';
    
    let description = `전년 대비 ${diffPercent}% ${diffText}, 전년대비 ${diffSign}${formatAmount(diff)}백만원 ${diffText}`;
    
    // 하위 항목이 있으면 주요 변동 추가
    if (children && Object.keys(children).length > 3) {
      const childrenArray = Object.entries(children)
        .map(([name, data]) => ({
          name,
          diff: data.amount - data.prev_amount
        }))
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 4); // 상위 4개
      
      const changes = childrenArray
        .map(c => `${c.name} ${c.diff >= 0 ? '+' : ''}${formatAmount(c.diff)}백`)
        .join(', ');
      
      description += `. 주요 증감: ${changes}`;
    }
    
    return description;
  };

  const toggleItem = (key) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const toggleAllExpand = () => {
    if (allExpanded) {
      setExpandedItems(new Set());
    } else {
      // 모든 항목 펼치기
      const allKeys = new Set(['total']);
      if (costsData && costsData.details) {
        const hierarchy = buildHierarchy(costsData.details, costsData.prev_year_details || []);
        Object.keys(hierarchy.children).forEach(l1 => {
          allKeys.add(`l1_${l1}`);
          Object.keys(hierarchy.children[l1].children || {}).forEach(l2 => {
            allKeys.add(`l2_${l1}_${l2}`);
          });
        });
      }
      setExpandedItems(allKeys);
    }
    setAllExpanded(!allExpanded);
  };

  const formatAmount = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return Math.round(amount / 1000000).toLocaleString();
  };

  const calculateYoY = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? '신규' : 0;
    return parseFloat(((current / previous) * 100).toFixed(1));
  };

  // 계층 구조 생성: L1 → L2 → L3
  const buildHierarchy = (currentData, prevData) => {
    const hierarchy = {
      total: 0,
      prev_total: 0,
      children: {}, // L1
    };

    // 전년 데이터 처리 (먼저!)
    prevData.forEach(row => {
      const l1 = row.category_l1 || '미분류';
      const l2 = row.category_l2 || '미분류';
      const l3 = row.category_l3 || '미분류';
      const amount = row.amount || 0;

      hierarchy.prev_total += amount;

      // L1 생성
      if (!hierarchy.children[l1]) {
        hierarchy.children[l1] = {
          name: l1,
          amount: 0,
          prev_amount: 0,
          children: {}, // L2
        };
      }
      hierarchy.children[l1].prev_amount += amount;

      // L2 생성
      if (!hierarchy.children[l1].children[l2]) {
        hierarchy.children[l1].children[l2] = {
          name: l2,
          amount: 0,
          prev_amount: 0,
          children: {}, // L3
        };
      }
      hierarchy.children[l1].children[l2].prev_amount += amount;

      // L3 생성
      if (!hierarchy.children[l1].children[l2].children[l3]) {
        hierarchy.children[l1].children[l2].children[l3] = {
          name: l3,
          amount: 0,
          prev_amount: 0,
        };
      }
      hierarchy.children[l1].children[l2].children[l3].prev_amount += amount;
    });

    // 당년 데이터 처리
    currentData.forEach(row => {
      const l1 = row.category_l1 || '미분류';
      const l2 = row.category_l2 || '미분류';
      const l3 = row.category_l3 || '미분류';
      const amount = row.amount || 0;

      hierarchy.total += amount;

      // L1 생성
      if (!hierarchy.children[l1]) {
        hierarchy.children[l1] = {
          name: l1,
          amount: 0,
          prev_amount: 0,
          children: {}, // L2
        };
      }
      hierarchy.children[l1].amount += amount;

      // L2 생성
      if (!hierarchy.children[l1].children[l2]) {
        hierarchy.children[l1].children[l2] = {
          name: l2,
          amount: 0,
          prev_amount: 0,
          children: {}, // L3
        };
      }
      hierarchy.children[l1].children[l2].amount += amount;

      // L3 생성
      if (!hierarchy.children[l1].children[l2].children[l3]) {
        hierarchy.children[l1].children[l2].children[l3] = {
          name: l3,
          amount: 0,
          prev_amount: 0,
        };
      }
      hierarchy.children[l1].children[l2].children[l3].amount += amount;
    });

    return hierarchy;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-48">
          <p className="text-zinc-500 dark:text-zinc-400">데이터를 불러오는 중...</p>
        </div>
      </Card>
    );
  }

  if (!costsData || !costsData.details || costsData.details.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-48">
          <p className="text-zinc-500 dark:text-zinc-400">데이터가 없습니다</p>
        </div>
      </Card>
    );
  }

  const hierarchy = buildHierarchy(costsData.details, costsData.prev_year_details || []);
  const totalDiff = hierarchy.total - hierarchy.prev_total;
  const totalYoY = calculateYoY(hierarchy.total, hierarchy.prev_total);

  return (
    <Card className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">비용 계정 상세 분석 (계층형)</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {month.substring(0, 4)}년 {parseInt(month.substring(4, 6))}월 기준
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 당월/누적 토글 */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              당월
            </button>
            <button
              onClick={() => setViewMode('ytd')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'ytd'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              누적
            </button>
          </div>
          
          {/* 모두 펼치기/접기 */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllExpand}
            className="gap-2"
          >
            {allExpanded ? (
              <>
                <ChevronsUp className="h-4 w-4" />
                모두 접기
              </>
            ) : (
              <>
                <ChevronsDown className="h-4 w-4" />
                모두 펼치기
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* 테이블 헤더 */}
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-t-lg border-b-2 border-zinc-200 dark:border-zinc-700">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          <div className="col-span-4 text-center">계정(백만원)</div>
          <div className="col-span-1 text-center">전년</div>
          <div className="col-span-1 text-center">당년</div>
          <div className="col-span-1 text-center">차이</div>
          <div className="col-span-1 text-center">YOY</div>
          <div className="col-span-4 text-left">설명</div>
        </div>
      </div>
      
      {/* 테이블 바디 */}
      <div className="border border-t-0 rounded-b-lg overflow-hidden">
        {/* 사업부 합계 */}
        <div className="bg-purple-50 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800">
          <div className="w-full grid grid-cols-12 gap-4 px-4 py-2.5">
            <div className="col-span-4 flex items-center gap-2 font-semibold text-base">
              <span style={{ color: brandColor }}>사업부 합계</span>
            </div>
            <div className="col-span-1 text-right font-semibold text-sm">
              {formatAmount(hierarchy.prev_total)}
            </div>
            <div className="col-span-1 text-right font-semibold text-sm">
              {formatAmount(hierarchy.total)}
            </div>
            <div className={`col-span-1 text-right font-semibold text-sm ${totalDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalDiff >= 0 ? '+' : ''}{formatAmount(totalDiff)}
            </div>
            <div className={`col-span-1 text-center font-semibold text-sm ${typeof totalYoY === 'string' ? 'text-blue-600' : totalYoY >= 100 ? 'text-red-600' : 'text-green-600'}`}>
              {typeof totalYoY === 'string' ? totalYoY : `${totalYoY}%`}
            </div>
            <div className="col-span-4 text-xs text-zinc-600 dark:text-zinc-400 text-left">
              {generateDescription(totalDiff, totalYoY, totalDiff, hierarchy.children)}
            </div>
          </div>
        </div>
        {/* CATEGORY_L1 (대분류) - 항상 표시 */}
        {Object.values(hierarchy.children)
          .sort((a, b) => b.amount - a.amount)
          .map((l1) => {
            const l1Key = `l1_${l1.name}`;
            const l1Expanded = expandedItems.has(l1Key);
            const l1Diff = l1.amount - l1.prev_amount;
            const l1YoY = calculateYoY(l1.amount, l1.prev_amount);
            
            return (
              <Fragment key={l1.name}>
                {/* L1 행 */}
                <button
                  onClick={() => toggleItem(l1Key)}
                  className="w-full grid grid-cols-12 gap-4 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b"
                >
                  <div className="col-span-4 flex items-center gap-2 font-medium text-sm pl-6">
                    {Object.keys(l1.children).length > 0 && (
                      l1Expanded ? (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      )
                    )}
                    <span>{l1.name}</span>
                  </div>
                  <div className="col-span-1 text-right text-sm">{formatAmount(l1.prev_amount)}</div>
                  <div className="col-span-1 text-right text-sm">{formatAmount(l1.amount)}</div>
                  <div className={`col-span-1 text-right text-sm ${l1Diff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {l1Diff >= 0 ? '+' : ''}{formatAmount(l1Diff)}
                  </div>
                  <div className={`col-span-1 text-center text-sm ${typeof l1YoY === 'string' ? 'text-blue-600' : l1YoY >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                    {typeof l1YoY === 'string' ? l1YoY : `${l1YoY}%`}
                  </div>
                  <div className="col-span-4 text-xs text-zinc-500 dark:text-zinc-400 text-left">
                    {generateDescription(l1Diff, l1YoY, l1Diff, l1.children)}
                  </div>
                </button>
                
                {/* CATEGORY_L2 (중분류) */}
                {l1Expanded && Object.values(l1.children)
                  .sort((a, b) => b.amount - a.amount)
                  .map((l2) => {
                    const l2Key = `l2_${l1.name}_${l2.name}`;
                    const l2Expanded = expandedItems.has(l2Key);
                    const l2Diff = l2.amount - l2.prev_amount;
                    const l2YoY = calculateYoY(l2.amount, l2.prev_amount);
                    
                    return (
                      <div key={l2.name}>
                        {/* L2 행 */}
                        <button
                          onClick={() => toggleItem(l2Key)}
                          className="w-full grid grid-cols-12 gap-4 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b"
                        >
                          <div className="col-span-4 flex items-center gap-2 text-sm pl-12">
                            {Object.keys(l2.children).length > 0 && (
                              l2Expanded ? (
                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-zinc-400" />
                              )
                            )}
                            <span>{l2.name}</span>
                          </div>
                          <div className="col-span-1 text-right text-sm">{formatAmount(l2.prev_amount)}</div>
                          <div className="col-span-1 text-right text-sm">{formatAmount(l2.amount)}</div>
                          <div className={`col-span-1 text-right text-sm ${l2Diff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {l2Diff >= 0 ? '+' : ''}{formatAmount(l2Diff)}
                          </div>
                          <div className={`col-span-1 text-center text-sm ${typeof l2YoY === 'string' ? 'text-blue-600' : l2YoY >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                            {typeof l2YoY === 'string' ? l2YoY : `${l2YoY}%`}
                          </div>
                          <div className="col-span-4 text-xs text-zinc-500 dark:text-zinc-400 text-left">
                            {generateDescription(l2Diff, l2YoY, l2Diff, l2.children)}
                          </div>
                        </button>
                        
                        {/* CATEGORY_L3 (소분류) */}
                        {l2Expanded && Object.values(l2.children)
                          .sort((a, b) => b.amount - a.amount)
                          .map((l3) => {
                            const l3Diff = l3.amount - l3.prev_amount;
                            const l3YoY = calculateYoY(l3.amount, l3.prev_amount);
                            
                            return (
                              <div
                                key={l3.name}
                                className="group grid grid-cols-12 gap-4 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b"
                              >
                                <div className="col-span-4 flex items-center gap-2 text-sm pl-20">
                                  <span className="text-zinc-600 dark:text-zinc-400">• {l3.name}</span>
                                </div>
                                <div className="col-span-1 text-right text-sm">{formatAmount(l3.prev_amount)}</div>
                                <div className="col-span-1 text-right text-sm">{formatAmount(l3.amount)}</div>
                                <div className={`col-span-1 text-right text-sm ${l3Diff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {l3Diff >= 0 ? '+' : ''}{formatAmount(l3Diff)}
                                </div>
                                <div className={`col-span-1 text-center text-sm ${typeof l3YoY === 'string' ? 'text-blue-600' : l3YoY >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                                  {typeof l3YoY === 'string' ? l3YoY : `${l3YoY}%`}
                                </div>
                                <div className="col-span-4 text-xs text-zinc-500 dark:text-zinc-400 text-left flex items-center gap-2">
                                  {editingInsightKey === `${l1.name}|${l2.name}|${l3.name}` ? (
                                    <div className="flex items-center gap-1 w-full">
                                      <Input
                                        value={editedInsightText}
                                        onChange={(e) => setEditedInsightText(e.target.value)}
                                        className="text-xs h-7 flex-1"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleSaveInsight(l1.name, l2.name, l3.name)}
                                      >
                                        <Save className="h-3 w-3 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={handleCancelEditInsight}
                                      >
                                        <X className="h-3 w-3 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="flex-1">{getL3Insight(l1.name, l2.name, l3.name)}</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleEditInsight(l1.name, l2.name, l3.name)}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
              </Fragment>
            );
          })}
      </div>
    </Card>
  );
}
