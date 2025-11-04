"""
CSV 파일을 대시보드용 JSON으로 변환하는 스크립트
(Snowflake 직접 연결이 어려운 경우 CSV Export 후 사용)

사용법:
    python csv_to_dashboard.py --cost cost_data.csv --sales sales_data.csv --output ./public/data
"""

import os
import sys
import json
import argparse
from datetime import datetime
import pandas as pd

# 브랜드 코드 매핑
BRAND_CODES = {
    'MLB': 'MLB',
    'MLB KIDS': 'MLB_KIDS',
    'DISCOVERY': 'DISCOVERY',
    'DUVETICA': 'DUVETICA',
    'SERGIO TACCHINI': 'SERGIO_TACCHINI',
}

# 비용 카테고리 매핑
CATEGORY_MAPPING = {
    '급여': '인건비',
    '상여': '인건비',
    '퇴직급여': '인건비',
    '복리후생비': '인건비',
    '광고선전비': '마케팅비',
    '판촉비': '마케팅비',
    '임차료': '임차료',
    '관리비': '임차료',
    '운반비': '물류비',
    '보관비': '물류비',
    '전산비': 'IT비용',
    '통신비': 'IT비용',
    '소모품비': '관리비',
    '수선비': '관리비',
    '기타': '기타',
}


def load_csv(file_path, name):
    """CSV 파일 로드"""
    try:
        df = pd.read_csv(file_path, encoding='utf-8-sig')
        print(f"✓ {name} 로드 완료: {len(df):,}건")
        return df
    except Exception as e:
        print(f"✗ {name} 로드 실패: {e}")
        return None


def process_cost_data(df):
    """비용 데이터 전처리"""
    # 필수 컬럼 확인
    required_cols = ['month', 'brand_code', 'gl_account', 'gl_name', 'cctr_code', 'cctr_name', 'cctr_type', 'cost_amt']
    missing = [col for col in required_cols if col not in df.columns]
    
    if missing:
        print(f"⚠ 누락된 컬럼: {missing}")
        print(f"현재 컬럼: {list(df.columns)}")
        return None
    
    # 브랜드 코드 매핑
    df['brand_code'] = df['brand_code'].map(BRAND_CODES).fillna(df['brand_code'])
    
    # 카테고리 매핑
    df['category_l1'] = df['gl_name'].map(CATEGORY_MAPPING).fillna('기타')
    df['category_l2'] = df['gl_name']
    df['category_l3'] = df['gl_name']
    
    return df


def merge_data(cost_df, sales_df=None, headcount_df=None, store_df=None):
    """데이터 병합"""
    merged = cost_df.copy()
    
    if sales_df is not None:
        sales_df['brand_code'] = sales_df['brand_code'].map(BRAND_CODES).fillna(sales_df['brand_code'])
        merged = merged.merge(sales_df[['month', 'brand_code', 'sale_amt']], 
                             on=['month', 'brand_code'], how='left')
    else:
        merged['sale_amt'] = 0
    
    if headcount_df is not None:
        headcount_df['brand_code'] = headcount_df['brand_code'].map(BRAND_CODES).fillna(headcount_df['brand_code'])
        merged = merged.merge(headcount_df[['month', 'brand_code', 'headcount']], 
                             on=['month', 'brand_code'], how='left')
    else:
        merged['headcount'] = 100  # 기본값
    
    if store_df is not None:
        store_df['brand_code'] = store_df['brand_code'].map(BRAND_CODES).fillna(store_df['brand_code'])
        merged = merged.merge(store_df[['month', 'brand_code', 'store_cnt']], 
                             on=['month', 'brand_code'], how='left')
    else:
        merged['store_cnt'] = 50  # 기본값
    
    # 결측치 처리
    merged['sale_amt'] = merged['sale_amt'].fillna(0)
    merged['headcount'] = merged['headcount'].fillna(100)
    merged['store_cnt'] = merged['store_cnt'].fillna(50)
    
    return merged


def calculate_kpi(df, current_month):
    """KPI 계산"""
    current_data = df[df['month'] == current_month]
    
    if len(current_data) == 0:
        return {
            'total_cost': 0,
            'cost_ratio': 0,
            'cost_per_person': 0,
            'cost_per_store': 0,
            'yoy': 0,
        }
    
    prev_year_month = str(int(current_month) - 10000)
    prev_data = df[df['month'] == prev_year_month]
    
    total_cost = current_data['cost_amt'].sum()
    total_sale = current_data['sale_amt'].sum()
    avg_headcount = current_data['headcount'].mean()
    avg_stores = current_data['store_cnt'].mean()
    
    prev_total_cost = prev_data['cost_amt'].sum() if len(prev_data) > 0 else total_cost
    
    return {
        'total_cost': round(total_cost),
        'cost_ratio': round((total_cost / total_sale * 100), 1) if total_sale > 0 else 0,
        'cost_per_person': round((total_cost / avg_headcount / 1_000_000), 1) if avg_headcount > 0 else 0,
        'cost_per_store': round((total_cost / avg_stores / 1_000_000), 1) if avg_stores > 0 else 0,
        'yoy': round(((total_cost - prev_total_cost) / prev_total_cost * 100), 1) if prev_total_cost > 0 else 0,
    }


def main():
    parser = argparse.ArgumentParser(description='CSV를 대시보드 JSON으로 변환')
    parser.add_argument('--cost', required=True, help='비용 데이터 CSV 파일')
    parser.add_argument('--sales', help='매출 데이터 CSV 파일 (선택)')
    parser.add_argument('--headcount', help='인원수 데이터 CSV 파일 (선택)')
    parser.add_argument('--stores', help='매장수 데이터 CSV 파일 (선택)')
    parser.add_argument('--output', default='./public/data', help='출력 디렉토리')
    parser.add_argument('--month', help='기준월 (YYYYMM, 지정하지 않으면 최신월)')
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"CSV → Dashboard JSON 변환")
    print(f"{'='*60}\n")
    
    # CSV 로드
    cost_df = load_csv(args.cost, '비용 데이터')
    if cost_df is None:
        sys.exit(1)
    
    sales_df = load_csv(args.sales, '매출 데이터') if args.sales else None
    headcount_df = load_csv(args.headcount, '인원수 데이터') if args.headcount else None
    store_df = load_csv(args.stores, '매장수 데이터') if args.stores else None
    
    # 데이터 전처리
    print("\n데이터 전처리 중...")
    cost_df = process_cost_data(cost_df)
    if cost_df is None:
        sys.exit(1)
    
    merged_df = merge_data(cost_df, sales_df, headcount_df, store_df)
    print(f"✓ 전처리 완료: {len(merged_df):,}건")
    
    # 기준월 결정
    if args.month:
        current_month = args.month
    else:
        current_month = merged_df['month'].max()
    
    print(f"\n기준월: {current_month}")
    
    # 출력 디렉토리 생성
    os.makedirs(args.output, exist_ok=True)
    
    # 브랜드별 JSON 생성
    print("\nJSON 파일 생성 중...")
    for brand_code in merged_df['brand_code'].unique():
        brand_data = merged_df[merged_df['brand_code'] == brand_code]
        
        kpi = calculate_kpi(brand_data, current_month)
        
        dashboard_data = {
            'brand_code': brand_code,
            'brand_name': brand_code,
            'current_month': current_month,
            'kpi': kpi,
            'monthly_data': brand_data.to_dict(orient='records'),
            'generated_at': datetime.now().isoformat(),
        }
        
        filename = f"{args.output}/{brand_code}_{current_month}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
        
        print(f"✓ {brand_code}: {filename}")
    
    print(f"\n{'='*60}")
    print("✓ 모든 작업 완료!")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

