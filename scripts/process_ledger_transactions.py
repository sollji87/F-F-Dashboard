"""
원장 거래 데이터 처리 스크립트
- 25,000+ 행의 거래 데이터를 브랜드별, 계정별로 집계
- OpenAI 분석용 데이터 생성
"""

import pandas as pd
from pathlib import Path
import numpy as np

# 경로 설정
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'
LEDGER_RAW_DIR = DATA_DIR / 'ledger_raw'
COSTS_DIR = DATA_DIR / 'costs'
GL_ANALYSIS_DIR = DATA_DIR / 'gl_analysis'

# 디렉토리 생성
LEDGER_RAW_DIR.mkdir(exist_ok=True)
COSTS_DIR.mkdir(exist_ok=True)
GL_ANALYSIS_DIR.mkdir(exist_ok=True)

def process_ledger_file(file_path, year_month):
    """원장 파일 처리"""
    print(f"\n{'='*60}")
    print(f"[FILE] Processing: {file_path.name}")
    print(f"{'='*60}")
    
    # Excel 파일 읽기
    df = pd.read_excel(file_path)
    
    print(f"[OK] Loaded {len(df):,} transactions")
    print(f"     Columns: {len(df.columns)}")
    
    # 컬럼명 정리 (공백 제거)
    df.columns = df.columns.str.strip()
    
    # 필수 컬럼 확인
    required_cols = ['사업 영역 내역', '코스트센터명', 'G/L 계정 설명', 
                     '금액(현지 통화)', 'CATEGORY_L1', 'CATEGORY_L2', 'CATEGORY_L3']
    
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"[ERROR] Missing columns: {missing_cols}")
        return None
    
    # 연월 추가
    df['연월'] = year_month
    
    # 코스트센터 타입 추가 (F: 부서, Z: 매장)
    if '코스트 센터' in df.columns:
        df['코스트센터타입'] = df['코스트 센터'].apply(
            lambda x: '부서' if str(x).startswith('F') else ('매장' if str(x).startswith('Z') else '기타')
        )
    
    # Raw CSV 저장
    output_file = LEDGER_RAW_DIR / f'transactions_{year_month}.csv'
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"[OK] Saved raw data: {output_file.name}")
    
    # 통계 출력
    print(f"\n[STATS] Data summary:")
    print(f"  - Business Areas: {df['사업 영역 내역'].nunique()}")
    print(f"  - GL Accounts: {df['G/L 계정 설명'].nunique()}")
    print(f"  - Cost Centers: {df['코스트센터명'].nunique()}")
    print(f"  - Total Amount: {df['금액(현지 통화)'].sum():,.0f} KRW")
    
    # 사업 영역별 통계
    print(f"\n[STATS] By Business Area:")
    business_summary = df.groupby('사업 영역 내역')['금액(현지 통화)'].agg(['sum', 'count'])
    business_summary = business_summary.sort_values('sum', ascending=False)
    for idx, row in business_summary.head(10).iterrows():
        print(f"  - {idx}: {row['sum']:,.0f} KRW ({row['count']:,} txns)")
    
    return df

def create_aggregated_costs(df, year_month):
    """집계된 비용 데이터 생성"""
    print(f"\n[AGGREGATE] Creating aggregated cost data...")
    
    if df is None or df.empty:
        return None
    
    # 브랜드별, 카테고리별 집계
    agg_df = df.groupby([
        '사업 영역 내역',
        'CATEGORY_L1',
        'CATEGORY_L2',
        'CATEGORY_L3',
        'G/L 계정 설명'
    ]).agg({
        '금액(현지 통화)': 'sum'
    }).reset_index()
    
    agg_df.columns = ['brand', 'category_l1', 'category_l2', 'category_l3', 
                      'gl_account', 'amount']
    agg_df['year_month'] = year_month
    
    # 빈 값 처리
    agg_df = agg_df.fillna('')
    
    # 저장
    output_file = COSTS_DIR / f'costs_{year_month}.csv'
    agg_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"[OK] Saved aggregated data: {output_file.name}")
    print(f"     Total rows: {len(agg_df):,}")
    
    return agg_df

def create_brand_gl_analysis(df, year_month):
    """브랜드별 GL계정 분석 데이터 생성"""
    print(f"\n[ANALYSIS] Creating brand GL analysis data...")
    
    if df is None or df.empty:
        return
    
    brands = df['사업 영역 내역'].dropna().unique()
    
    for brand in brands:
        if not brand or brand == '':
            continue
        
        # 브랜드 폴더 생성
        safe_brand_name = str(brand).replace('/', '_').replace('\\', '_').strip()
        brand_dir = GL_ANALYSIS_DIR / safe_brand_name
        brand_dir.mkdir(exist_ok=True)
        
        # 해당 브랜드 데이터
        brand_df = df[df['사업 영역 내역'] == brand].copy()
        
        # GL계정별로 파일 생성
        gl_accounts = brand_df['G/L 계정 설명'].dropna().unique()
        
        for gl_account in gl_accounts:
            if not gl_account or gl_account == '':
                continue
            
            gl_df = brand_df[brand_df['G/L 계정 설명'] == gl_account].copy()
            
            # 파일명 정제
            safe_gl_name = str(gl_account).replace('/', '_').replace('\\', '_').replace(':', '').replace('(', '').replace(')', '').strip()
            safe_gl_name = safe_gl_name[:100]  # 파일명 길이 제한
            
            output_file = brand_dir / f'{safe_gl_name}_{year_month}.csv'
            gl_df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"  [OK] {safe_brand_name}: {len(gl_accounts)} GL accounts")

def create_combined_analysis():
    """전년/당년 통합 분석 파일 생성"""
    print(f"\n[COMBINE] Creating combined analysis files...")
    
    # 두 연월의 데이터 로드
    files = {
        '202410': COSTS_DIR / 'costs_202410.csv',
        '202510': COSTS_DIR / 'costs_202510.csv'
    }
    
    dfs = {}
    for year_month, file_path in files.items():
        if file_path.exists():
            dfs[year_month] = pd.read_csv(file_path, encoding='utf-8-sig')
            print(f"  [LOAD] {year_month}: {len(dfs[year_month]):,} rows")
    
    if len(dfs) < 2:
        print("  [WARN] Need both 202410 and 202510 data for comparison")
        return
    
    # 브랜드별로 통합
    all_brands = set()
    for df in dfs.values():
        all_brands.update(df['brand'].unique())
    
    for brand in sorted(all_brands):
        if not brand:
            continue
        
        safe_brand_name = str(brand).replace('/', '_').replace('\\', '_').strip()
        brand_dir = GL_ANALYSIS_DIR / safe_brand_name
        brand_dir.mkdir(exist_ok=True)
        
        # 각 GL계정별로 통합
        all_gl_accounts = set()
        for df in dfs.values():
            brand_df = df[df['brand'] == brand]
            all_gl_accounts.update(brand_df['gl_account'].unique())
        
        combined_count = 0
        for gl_account in sorted(all_gl_accounts):
            if not gl_account:
                continue
            
            combined_rows = []
            for year_month, df in dfs.items():
                gl_df = df[(df['brand'] == brand) & (df['gl_account'] == gl_account)]
                if not gl_df.empty:
                    combined_rows.append(gl_df)
            
            if combined_rows:
                combined_df = pd.concat(combined_rows, ignore_index=True)
                safe_gl_name = str(gl_account).replace('/', '_').replace('\\', '_').replace(':', '').replace('(', '').replace(')', '').strip()
                safe_gl_name = safe_gl_name[:100]
                
                output_file = brand_dir / f'{safe_gl_name}_combined.csv'
                combined_df.to_csv(output_file, index=False, encoding='utf-8-sig')
                combined_count += 1
        
        print(f"  [OK] {safe_brand_name}: {combined_count} GL accounts combined")

def create_summary_reports():
    """요약 보고서 생성"""
    print(f"\n[SUMMARY] Creating summary reports...")
    
    # 모든 비용 데이터 로드
    all_data = []
    for file in COSTS_DIR.glob('costs_*.csv'):
        df = pd.read_csv(file, encoding='utf-8-sig')
        all_data.append(df)
    
    if not all_data:
        print("  [WARN] No cost data found")
        return
    
    combined = pd.concat(all_data, ignore_index=True)
    
    # 1. 브랜드별 월별 합계
    brand_monthly = combined.groupby(['brand', 'year_month']).agg({
        'amount': 'sum'
    }).reset_index()
    
    brand_monthly_file = COSTS_DIR / 'summary_by_brand_month.csv'
    brand_monthly.to_csv(brand_monthly_file, index=False, encoding='utf-8-sig')
    print(f"  [OK] Saved: {brand_monthly_file.name}")
    
    # 2. 브랜드별, 카테고리별 합계
    brand_category = combined.groupby(['brand', 'year_month', 'category_l1']).agg({
        'amount': 'sum'
    }).reset_index()
    
    brand_category_file = COSTS_DIR / 'summary_by_brand_category.csv'
    brand_category.to_csv(brand_category_file, index=False, encoding='utf-8-sig')
    print(f"  [OK] Saved: {brand_category_file.name}")
    
    # 3. GL계정별 합계
    gl_summary = combined.groupby(['brand', 'year_month', 'gl_account']).agg({
        'amount': 'sum'
    }).reset_index()
    
    gl_summary_file = COSTS_DIR / 'summary_by_gl_account.csv'
    gl_summary.to_csv(gl_summary_file, index=False, encoding='utf-8-sig')
    print(f"  [OK] Saved: {gl_summary_file.name}")
    
    # 전체 통계
    print(f"\n{'='*60}")
    print("[SUMMARY] Overall Statistics")
    print(f"{'='*60}")
    
    for year_month in sorted(combined['year_month'].unique()):
        ym_data = combined[combined['year_month'] == year_month]
        total = ym_data['amount'].sum()
        print(f"\n{year_month}:")
        print(f"  Total Amount: {total:,.0f} KRW")
        print(f"  Brands: {len(ym_data['brand'].unique())}")
        print(f"  GL Accounts: {len(ym_data['gl_account'].unique())}")
        print(f"  L1 Categories: {len(ym_data['category_l1'].unique())}")
        print(f"  Data Rows: {len(ym_data):,}")

def main():
    """메인 실행 함수"""
    print(f"\n{'#'*60}")
    print(f"# Ledger Transaction Data Processing")
    print(f"{'#'*60}")
    
    # 처리할 파일 목록
    files_to_process = [
        ('2410원장.xlsx', '202410'),
        ('2510원장.xlsx', '202510')
    ]
    
    all_data = {}
    
    for filename, year_month in files_to_process:
        file_path = DATA_DIR / filename
        
        if not file_path.exists():
            print(f"[WARN] File not found: {filename}")
            continue
        
        # 1. 원장 파일 처리
        df = process_ledger_file(file_path, year_month)
        all_data[year_month] = df
        
        # 2. 집계 데이터 생성
        if df is not None:
            agg_df = create_aggregated_costs(df, year_month)
            
            # 3. 브랜드별 GL계정 분석 데이터 생성
            create_brand_gl_analysis(df, year_month)
    
    # 4. 통합 분석 파일 생성
    create_combined_analysis()
    
    # 5. 요약 보고서 생성
    create_summary_reports()
    
    print(f"\n{'#'*60}")
    print(f"# [COMPLETE] All processing finished!")
    print(f"{'#'*60}")
    print(f"\n[FOLDERS] Created directories:")
    print(f"  - {LEDGER_RAW_DIR.relative_to(BASE_DIR)}")
    print(f"    * transactions_YYYYMM.csv: Raw transaction data")
    print(f"  - {COSTS_DIR.relative_to(BASE_DIR)}")
    print(f"    * costs_YYYYMM.csv: Aggregated cost data")
    print(f"    * summary_*.csv: Summary reports")
    print(f"  - {GL_ANALYSIS_DIR.relative_to(BASE_DIR)}")
    print(f"    * [Brand]/[GL_Account]_YYYYMM.csv: Monthly data by GL account")
    print(f"    * [Brand]/[GL_Account]_combined.csv: YoY comparison data")
    print(f"\n[NEXT] Next steps:")
    print(f"  1. Review generated CSV files")
    print(f"  2. Dashboard is running at http://localhost:3000")
    print(f"  3. Integrate data into dashboard")
    print(f"  4. Run OpenAI analysis for GL account insights")

if __name__ == '__main__':
    main()

