'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb, Edit2, Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Loader } from './Loader';

/**
 * 카테고리별 AI 인사이트 패널 컴포넌트
 * 대분류 비용에 대한 상세 분석 제공
 */
export function CategoryInsightsPanel({ brand, brandCode, month, rawCostsData, selectedCategory }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInsights, setEditedInsights] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastLoadedCategory, setLastLoadedCategory] = useState(null);
  
  const generateInsights = async () => {
    if (!selectedCategory) {
      setError('대분류를 먼저 선택해주세요.');
      return;
    }
    
    if (!rawCostsData || rawCostsData.length === 0) {
      setError('원본 비용 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 선택된 카테고리의 당월 데이터만 필터링
      const categoryData = rawCostsData.filter(row => 
        row.month === month && row.category_l1 === selectedCategory
      );
      
      console.log(`📊 ${selectedCategory} 분석 데이터:`, {
        totalRows: categoryData.length,
        sampleRows: categoryData.slice(0, 3)
      });
      
      // 중분류별 집계
      const l2Aggregation = {};
      categoryData.forEach(row => {
        const l2 = row.category_l2 || '기타';
        if (!l2Aggregation[l2]) {
          l2Aggregation[l2] = 0;
        }
        l2Aggregation[l2] += (row.cost_amt || 0);
      });
      
      // 소분류별 집계 (TOP 5)
      const l3Aggregation = {};
      categoryData.forEach(row => {
        const l3 = row.category_l3 || '기타';
        if (!l3Aggregation[l3]) {
          l3Aggregation[l3] = 0;
        }
        l3Aggregation[l3] += (row.cost_amt || 0);
      });
      
      const topL2 = Object.entries(l2Aggregation)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amt]) => ({
          name,
          amount: Math.round(amt / 1000000), // 백만원
        }));
      
      const topL3 = Object.entries(l3Aggregation)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amt]) => ({
          name,
          amount: Math.round(amt / 1000000), // 백만원
        }));
      
      const totalAmount = Math.round(
        categoryData.reduce((sum, row) => sum + (row.cost_amt || 0), 0) / 1000000
      );
      
      // OpenAI API 호출
      const response = await fetch('/api/insights/category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          brandCode,
          month,
          category: selectedCategory,
          totalAmount,
          topL2,
          topL3,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setInsights(result.insights);
        setEditedInsights(result.insights);
        setLastLoadedCategory(`${selectedCategory}_${month}`);
      } else {
        // API 키가 없는 경우 fallback 인사이트 사용
        if (result.fallback_insights) {
          setInsights(result.fallback_insights);
          setEditedInsights(result.fallback_insights);
          setLastLoadedCategory(`${selectedCategory}_${month}`);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 자동으로 인사이트 생성 (대분류 선택 또는 변경 시)
  useEffect(() => {
    if (selectedCategory && rawCostsData && rawCostsData.length > 0) {
      const currentKey = `${selectedCategory}_${month}`;
      // 이미 로드된 인사이트가 있고 동일한 키인 경우 중복 호출 방지
      if (lastLoadedCategory !== currentKey && !loading) {
        // 인사이트 초기화 후 자동 생성
        setInsights(null);
        setError(null);
        generateInsights();
      }
    } else if (!selectedCategory) {
      // 카테고리가 선택 해제되면 인사이트 초기화
      setInsights(null);
      setError(null);
      setLastLoadedCategory(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, month, rawCostsData]);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditedInsights(insights);
  };
  
  const handleSave = () => {
    setInsights(editedInsights);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditedInsights(insights);
    setIsEditing(false);
  };
  
  const handleFieldChange = (field, value) => {
    setEditedInsights(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleArrayItemChange = (field, index, value) => {
    setEditedInsights(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };
  
  const handleAddItem = (field) => {
    setEditedInsights(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };
  
  const handleRemoveItem = (field, index) => {
    setEditedInsights(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };
  
  const title = selectedCategory ? `${selectedCategory} 비용 분석` : '대분류 비용 분석';
  
  return (
    <Card className="border-2 border-purple-200 dark:border-purple-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>{title}</CardTitle>
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="ghost"
              size="sm"
              className="ml-2"
            >
              {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {insights && !isEditing && (
              <Button 
                onClick={handleEdit}
                size="sm"
                variant="outline"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                편집
              </Button>
            )}
            {isEditing && (
              <>
                <Button 
                  onClick={handleSave}
                  size="sm"
                  variant="default"
                >
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </Button>
                <Button 
                  onClick={handleCancel}
                  size="sm"
                  variant="outline"
                >
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
              </>
            )}
            <Button 
              onClick={generateInsights}
              disabled={loading || !selectedCategory}
              size="sm"
              variant="outline"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  인사이트 생성
                </>
              )}
            </Button>
          </div>
        </div>
        {!isCollapsed && (
          <CardDescription>
            {selectedCategory 
              ? `${selectedCategory} 대분류의 상세 비용 구성을 분석합니다` 
              : '왼쪽 차트에서 대분류를 선택하세요'
            }
          </CardDescription>
        )}
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
        {loading && (
          <Loader message="AI가 데이터를 분석하는 중..." />
        )}
        
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}
        
        {!loading && !insights && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {selectedCategory 
                ? '버튼을 클릭하여 AI 인사이트를 생성하세요'
                : '👈 왼쪽 차트에서 대분류를 선택하면 해당 카테고리의 AI 분석을 볼 수 있습니다'
              }
            </p>
          </div>
        )}
        
        {insights && !loading && (
          <div className="space-y-6">
            {/* 요약 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-lg">전체 요약</h3>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedInsights?.summary || ''}
                  onChange={(e) => handleFieldChange('summary', e.target.value)}
                  className="text-sm leading-relaxed min-h-[80px]"
                  placeholder="전체 요약을 입력하세요..."
                />
              ) : (
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {insights.summary}
                </p>
              )}
            </div>
            
            <Separator />
            
            {/* 주요 발견사항 */}
            {((isEditing && editedInsights?.key_findings) || insights.key_findings) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-lg">주요 발견사항</h3>
                  </div>
                  {isEditing && (
                    <Button
                      onClick={() => handleAddItem('key_findings')}
                      size="sm"
                      variant="ghost"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {(isEditing ? editedInsights?.key_findings : insights.key_findings)?.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {idx + 1}
                      </Badge>
                      {isEditing ? (
                        <div className="flex-1 flex items-start gap-2">
                          <Input
                            value={finding}
                            onChange={(e) => handleArrayItemChange('key_findings', idx, e.target.value)}
                            className="text-sm flex-1"
                            placeholder="주요 발견사항을 입력하세요..."
                          />
                          <Button
                            onClick={() => handleRemoveItem('key_findings', idx)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {finding}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Separator />
            
            {/* 리스크 요인 */}
            {((isEditing && editedInsights?.risks) || insights.risks) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h3 className="font-semibold text-lg">리스크 요인</h3>
                  </div>
                  {isEditing && (
                    <Button
                      onClick={() => handleAddItem('risks')}
                      size="sm"
                      variant="ghost"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {(isEditing ? editedInsights?.risks : insights.risks)?.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                      {isEditing ? (
                        <div className="flex-1 flex items-start gap-2">
                          <Input
                            value={risk}
                            onChange={(e) => handleArrayItemChange('risks', idx, e.target.value)}
                            className="text-sm flex-1"
                            placeholder="리스크 요인을 입력하세요..."
                          />
                          <Button
                            onClick={() => handleRemoveItem('risks', idx)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {risk}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Separator />
            
            {/* 액션 아이템 */}
            {((isEditing && editedInsights?.action_items) || insights.action_items) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-lg">권장 액션</h3>
                  </div>
                  {isEditing && (
                    <Button
                      onClick={() => handleAddItem('action_items')}
                      size="sm"
                      variant="ghost"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {(isEditing ? editedInsights?.action_items : insights.action_items)?.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 bg-green-50 dark:bg-green-950">
                        ✓
                      </Badge>
                      {isEditing ? (
                        <div className="flex-1 flex items-start gap-2">
                          <Input
                            value={action}
                            onChange={(e) => handleArrayItemChange('action_items', idx, e.target.value)}
                            className="text-sm flex-1"
                            placeholder="권장 액션을 입력하세요..."
                          />
                          <Button
                            onClick={() => handleRemoveItem('action_items', idx)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {action}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
}

