'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  ChevronDown, 
  TrendingUp, 
  TrendingDown,
  FileText,
  DollarSign 
} from 'lucide-react';

/**
 * 원장 데이터 드릴다운 컴포넌트
 * 대분류 → 중분류 → 소분류 → GL계정 상세
 */
export function LedgerDrilldown({ brand, month }) {
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [selectedGlAccount, setSelectedGlAccount] = useState(null);
  const [glAccountDetail, setGlAccountDetail] = useState(null);
  
  useEffect(() => {
    fetchLedgerData();
  }, [brand, month]);
  
  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ledger/${brand}?month=${month}`);
      const result = await response.json();
      
      if (result.success) {
        setLedgerData(result.data);
      }
    } catch (error) {
      console.error('원장 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const handleGlAccountClick = async (glAccount) => {
    setSelectedGlAccount(glAccount);
    
    try {
      const response = await fetch(
        `/api/ledger/gl-account?brand=${brand}&gl_account=${encodeURIComponent(glAccount)}&type=combined`
      );
      const result = await response.json();
      
      if (result.success) {
        setGlAccountDetail(result.data);
      }
    } catch (error) {
      console.error('GL계정 상세 데이터 로딩 실패:', error);
    }
  };
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }
  
  if (!ledgerData) {
    return (
      <Card className="p-6">
        <p className="text-center text-zinc-500">데이터를 불러올 수 없습니다</p>
      </Card>
    );
  }
  
  // 카테고리별로 GL계정 그룹화
  const groupedByCategory = {};
  ledgerData.details.forEach(row => {
    const cat = row.category_l1 || '기타';
    if (!groupedByCategory[cat]) {
      groupedByCategory[cat] = {
        category: cat,
        total: 0,
        gl_accounts: {},
      };
    }
    groupedByCategory[cat].total += row.amount;
    
    const glKey = row.gl_account || '미분류';
    if (!groupedByCategory[cat].gl_accounts[glKey]) {
      groupedByCategory[cat].gl_accounts[glKey] = {
        gl_account: glKey,
        amount: 0,
        items: [],
      };
    }
    groupedByCategory[cat].gl_accounts[glKey].amount += row.amount;
    groupedByCategory[cat].gl_accounts[glKey].items.push(row);
  });
  
  const categories = Object.values(groupedByCategory).sort((a, b) => b.total - a.total);
  
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">세부 계정별 비용 분석</h3>
            <p className="text-sm text-zinc-500 mt-1">
              총 {ledgerData.total_transactions}개 항목 · {(ledgerData.total_amount / 1000000).toFixed(0)}백만원
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <FileText className="h-4 w-4" />
            <span>{month.substring(0, 4)}년 {parseInt(month.substring(4, 6))}월</span>
          </div>
        </div>
        
        {/* 카테고리 목록 */}
        <div className="space-y-2">
          {categories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.category);
            const glAccounts = Object.values(cat.gl_accounts).sort((a, b) => b.amount - a.amount);
            const percentage = (cat.total / ledgerData.total_amount) * 100;
            
            return (
              <div key={cat.category} className="border rounded-lg overflow-hidden">
                {/* 대분류 헤더 */}
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-zinc-400" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold">{cat.category}</div>
                      <div className="text-sm text-zinc-500">
                        {glAccounts.length}개 GL계정
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {(cat.total / 1000000).toFixed(0)}
                      <span className="text-sm font-normal text-zinc-500 ml-1">백만원</span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </button>
                
                {/* GL계정 목록 (확장 시) */}
                {isExpanded && (
                  <div className="border-t bg-zinc-50 dark:bg-zinc-900">
                    {glAccounts.map((gl) => {
                      const glPercentage = (gl.amount / cat.total) * 100;
                      
                      return (
                        <button
                          key={gl.gl_account}
                          onClick={() => handleGlAccountClick(gl.gl_account)}
                          className="w-full px-8 py-2.5 flex items-center justify-between hover:bg-white dark:hover:bg-zinc-800 transition-colors border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-zinc-400" />
                            <span className="text-sm">{gl.gl_account}</span>
                            <span className="text-xs text-zinc-400">
                              ({gl.items.length}건)
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {(gl.amount / 1000000).toFixed(1)}
                              <span className="text-xs font-normal text-zinc-500 ml-1">백만원</span>
                            </div>
                            <div className="text-xs text-zinc-500">
                              {glPercentage.toFixed(1)}%
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      
      {/* GL계정 상세 정보 (선택 시) */}
      {selectedGlAccount && glAccountDetail && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold">{selectedGlAccount}</h4>
                <p className="text-sm text-zinc-500 mt-1">
                  GL계정 상세 분석
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedGlAccount(null)}
              >
                닫기
              </Button>
            </div>
            
            {/* YoY 비교 */}
            {glAccountDetail.yoy_analysis && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div className="text-sm text-zinc-500 mb-1">
                    {glAccountDetail.yoy_analysis.prev_year.month.substring(0, 4)}년 {parseInt(glAccountDetail.yoy_analysis.prev_year.month.substring(4, 6))}월
                  </div>
                  <div className="text-2xl font-bold">
                    {(glAccountDetail.yoy_analysis.prev_year.amount / 1000000).toFixed(1)}
                    <span className="text-sm font-normal text-zinc-500 ml-1">백만원</span>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-sm text-zinc-500 mb-1">
                    {glAccountDetail.yoy_analysis.curr_year.month.substring(0, 4)}년 {parseInt(glAccountDetail.yoy_analysis.curr_year.month.substring(4, 6))}월
                  </div>
                  <div className="text-2xl font-bold">
                    {(glAccountDetail.yoy_analysis.curr_year.amount / 1000000).toFixed(1)}
                    <span className="text-sm font-normal text-zinc-500 ml-1">백만원</span>
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${
                    glAccountDetail.yoy_analysis.change_percent >= 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {glAccountDetail.yoy_analysis.change_percent >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {glAccountDetail.yoy_analysis.change_percent >= 0 ? '+' : ''}
                      {glAccountDetail.yoy_analysis.change_percent}%
                    </span>
                    <span className="text-zinc-500 font-normal">
                      ({(glAccountDetail.yoy_analysis.change / 1000000).toFixed(1)}백만원)
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 세부 내역 */}
            <div>
              <h5 className="font-semibold mb-2">세부 내역</h5>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {glAccountDetail.details.slice(0, 20).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-900 rounded text-sm">
                    <div>
                      <span className="font-medium">{item.category_l1}</span>
                      {item.category_l2 && (
                        <span className="text-zinc-500"> → {item.category_l2}</span>
                      )}
                      {item.category_l3 && (
                        <span className="text-zinc-500"> → {item.category_l3}</span>
                      )}
                    </div>
                    <span className="font-semibold">
                      {(item.amount / 1000000).toFixed(2)}백만원
                    </span>
                  </div>
                ))}
                {glAccountDetail.details.length > 20 && (
                  <p className="text-center text-sm text-zinc-500 py-2">
                    외 {glAccountDetail.details.length - 20}건
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

