"""
Snowflake 데이터 추출 및 대시보드용 JSON 생성 스크립트

사용법:
    python snowflake_to_dashboard.py --month 202412 --output ./public/data

환경변수 필요:
    SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD,
    SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE, SNOWFLAKE_SCHEMA
"""

import os
import sys
import json
import argparse
from datetime import datetime
import pandas as pd
import snowflake.connector

# 브랜드 코드 매핑
BRAND_CODES = {
    'MLB': 'MLB',
    'MLB KIDS': 'MLB_KIDS',
    'DISCOVERY': 'DISCOVERY',
    'DUVETICA': 'DUVETICA',
    'SERGIO TACCHINI': 'SERGIO_TACCHINI',
}

# 비용 대분류 매핑 (실제 계정과목 → 대시보드 카테고리)
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


def connect_snowflake():
    """Snowflake 연결"""
    try:
        conn = snowflake.connector.connect(
            account=os.getenv('SNOWFLAKE_ACCOUNT'),
            user=os.getenv('SNOWFLAKE_USER'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
            database=os.getenv('SNOWFLAKE_DATABASE'),
            schema=os.getenv('SNOWFLAKE_SCHEMA'),
        )
        print("✓ Snowflake 연결 성공")
        return conn
    except Exception as e:
        print(f"✗ Snowflake 연결 실패: {e}")
        sys.exit(1)


def extract_cost_data(conn, start_month, end_month):
    """
    비용 데이터 추출
    
    실제 쿼리는 테이블 구조에 맞게 수정 필요
    """
    query = f"""
    SELECT 
        YYYYMM as month,
        BRAND_CODE as brand_code,
        BRAND_NAME as brand_name,
        GL_ACCOUNT as gl_account,
        GL_NAME as gl_name,
        CCTR_CODE as cctr_code,
        CCTR_NAME as cctr_name,
        CCTR_TYPE as cctr_type,
        SUM(COST_AMT) as cost_amt
    FROM COST_TABLE
    WHERE YYYYMM BETWEEN '{start_month}' AND '{end_month}'
    GROUP BY 1,2,3,4,5,6,7,8
    ORDER BY 1,2
    """
    
    print(f"데이터 추출 중: {start_month} ~ {end_month}")
    df = pd.read_sql(query, conn)
    print(f"✓ {len(df):,}건 추출 완료")
    return df


def extract_sales_data(conn, start_month, end_month):
    """매출 데이터 추출"""
    query = f"""
    SELECT 
        YYYYMM as month,
        BRAND_CODE as brand_code,
        SUM(SALE_AMT) as sale_amt
    FROM SALES_TABLE
    WHERE YYYYMM BETWEEN '{start_month}' AND '{end_month}'
    GROUP BY 1,2
    """
    
    df = pd.read_sql(query, conn)
    print(f"✓ 매출 데이터 {len(df):,}건 추출")
    return df


def extract_headcount_data(conn, start_month, end_month):
    """인원수 데이터 추출"""
    query = f"""
    SELECT 
        YYYYMM as month,
        BRAND_CODE as brand_code,
        COUNT(DISTINCT EMP_ID) as headcount
    FROM EMPLOYEE_TABLE
    WHERE YYYYMM BETWEEN '{start_month}' AND '{end_month}'
    GROUP BY 1,2
    """
    
    df = pd.read_sql(query, conn)
    print(f"✓ 인원수 데이터 {len(df):,}건 추출")
    return df


def extract_store_data(conn, start_month, end_month):
    """매장수 데이터 추출"""
    query = f"""
    SELECT 
        YYYYMM as month,
        BRAND_CODE as brand_code,
        COUNT(DISTINCT STORE_CODE) as store_cnt
    FROM STORE_TABLE
    WHERE YYYYMM BETWEEN '{start_month}' AND '{end_month}'
        AND STATUS = 'ACTIVE'
    GROUP BY 1,2
    """
    
    df = pd.read_sql(query, conn)
    print(f"✓ 매장수 데이터 {len(df):,}건 추출")
    return df


def process_data(cost_df, sales_df, headcount_df, store_df):
    """데이터 전처리 및 통합"""
    print("\n데이터 전처리 중...")
    
    # 브랜드 코드 매핑
    cost_df['brand_code'] = cost_df['brand_code'].map(BRAND_CODES)
    sales_df['brand_code'] = sales_df['brand_code'].map(BRAND_CODES)
    headcount_df['brand_code'] = headcount_df['brand_code'].map(BRAND_CODES)
    store_df['brand_code'] = store_df['brand_code'].map(BRAND_CODES)
    
    # 비용 카테고리 매핑
    cost_df['category_l1'] = cost_df['gl_name'].map(CATEGORY_MAPPING).fillna('기타')
    cost_df['category_l2'] = cost_df['gl_name']  # 중분류는 원본 계정명
    cost_df['category_l3'] = cost_df['gl_name']  # 소분류는 원본 계정명
    
    # 데이터 병합
    merged = cost_df.copy()
    merged = merged.merge(sales_df, on=['month', 'brand_code'], how='left')
    merged = merged.merge(headcount_df, on=['month', 'brand_code'], how='left')
    merged = merged.merge(store_df, on=['month', 'brand_code'], how='left')
    
    # 결측치 처리
    merged['sale_amt'] = merged['sale_amt'].fillna(0)
    merged['headcount'] = merged['headcount'].fillna(1)
    merged['store_cnt'] = merged['store_cnt'].fillna(1)
    
    print(f"✓ 전처리 완료: {len(merged):,}건")
    return merged


def calculate_kpi(df, current_month):
    """KPI 계산"""
    current_data = df[df['month'] == current_month]
    prev_year_month = str(int(current_month) - 10000)  # 전년 동월
    prev_data = df[df['month'] == prev_year_month]
    
    total_cost = current_data['cost_amt'].sum()
    total_sale = current_data['sale_amt'].sum()
    avg_headcount = current_data['headcount'].mean()
    avg_stores = current_data['store_cnt'].mean()
    
    prev_total_cost = prev_data['cost_amt'].sum() if len(prev_data) > 0 else total_cost
    
    kpi = {
        'total_cost': round(total_cost),
        'cost_ratio': round((total_cost / total_sale * 100), 1) if total_sale > 0 else 0,
        'cost_per_person': round((total_cost / avg_headcount / 1_000_000), 1) if avg_headcount > 0 else 0,
        'cost_per_store': round((total_cost / avg_stores / 1_000_000), 1) if avg_stores > 0 else 0,
        'yoy': round(((total_cost - prev_total_cost) / prev_total_cost * 100), 1) if prev_total_cost > 0 else 0,
    }
    
    return kpi


def save_json(data, output_path, brand_code, month):
    """JSON 파일 저장"""
    os.makedirs(output_path, exist_ok=True)
    
    filename = f"{output_path}/{brand_code}_{month}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ 저장 완료: {filename}")


def main():
    parser = argparse.ArgumentParser(description='Snowflake 데이터 추출 및 대시보드 JSON 생성')
    parser.add_argument('--month', required=True, help='기준월 (YYYYMM)')
    parser.add_argument('--output', default='./public/data', help='출력 디렉토리')
    parser.add_argument('--months-back', type=int, default=24, help='과거 몇 개월 데이터 추출 (기본 24개월)')
    
    args = parser.parse_args()
    
    current_month = args.month
    start_month = str(int(current_month) - (args.months_back * 100))  # 간단한 계산 (실제는 날짜 계산 필요)
    
    print(f"\n{'='*60}")
    print(f"F&F 비용 대시보드 데이터 추출")
    print(f"기준월: {current_month}")
    print(f"추출 기간: {start_month} ~ {current_month}")
    print(f"{'='*60}\n")
    
    # Snowflake 연결
    conn = connect_snowflake()
    
    try:
        # 데이터 추출
        cost_df = extract_cost_data(conn, start_month, current_month)
        sales_df = extract_sales_data(conn, start_month, current_month)
        headcount_df = extract_headcount_data(conn, start_month, current_month)
        store_df = extract_store_data(conn, start_month, current_month)
        
        # 데이터 전처리
        merged_df = process_data(cost_df, sales_df, headcount_df, store_df)
        
        # 브랜드별로 JSON 생성
        print("\nJSON 파일 생성 중...")
        for brand_code in BRAND_CODES.values():
            brand_data = merged_df[merged_df['brand_code'] == brand_code]
            
            if len(brand_data) == 0:
                print(f"⚠ {brand_code}: 데이터 없음")
                continue
            
            kpi = calculate_kpi(brand_data, current_month)
            
            dashboard_data = {
                'brand_code': brand_code,
                'brand_name': brand_data['brand_name'].iloc[0] if 'brand_name' in brand_data.columns else brand_code,
                'current_month': current_month,
                'kpi': kpi,
                'monthly_data': brand_data.to_dict(orient='records'),
                'generated_at': datetime.now().isoformat(),
            }
            
            save_json(dashboard_data, args.output, brand_code, current_month)
        
        print(f"\n{'='*60}")
        print("✓ 모든 작업 완료!")
        print(f"{'='*60}\n")
        
    finally:
        conn.close()
        print("Snowflake 연결 종료")


if __name__ == '__main__':
    main()

