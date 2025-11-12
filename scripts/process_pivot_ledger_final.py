"""
피벗 테이블 형태의 원장 데이터 처리 스크립트 (Final)
- 정확한 계층 구조 파싱
"""

import pandas as pd
from pathlib import Path

# 경로 설정
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'
LEDGER_DIR = DATA_DIR / 'ledger'
COSTS_DIR = DATA_DIR / 'costs'
GL_ANALYSIS_DIR = DATA_DIR / 'gl_analysis'

# 디렉토리 생성
COSTS_DIR.mkdir(exist_ok=True)
GL_ANALYSIS_DIR.mkdir(exist_ok=True)

# 브랜드 목록
BRANDS = ['Discovery', 'Duvetica', 'MLB', 'MLB KIDS', 'SERGIO TACCHINI']

def clean_amount(value):
    """금액 데이터 정제"""
    if pd.isna(value) or value == '':
        return 0
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(',', '').replace(' ', ''))
    except:
        return 0

def parse_csv_hierarchy_final(csv_file, year_month):
    """
    CSV 파일에서 계층 구조 파싱 (Final)
    
    규칙:
    1. 브랜드 행 다음부터 해당 브랜드 데이터
    2. 같은 레이블이 연속 2번 나오면:
       - 첫 번째 = 대분류 합계 (건너뛰기)
       - 두 번째 = 대분류 실제 금액 (저장)
    3. 같은 레이블이 1번만 나오면:
       - 현재 대분류의 소분류
    """
    print(f"\n[PARSE] Parsing {csv_file.name}...")
    
    df = pd.read_csv(csv_file, encoding='utf-8-sig')
    
    rows = []
    current_brand = None
    current_category_l1 = None
    prev_label = None
    skip_next = False
    
    for idx in range(len(df)):
        if skip_next:
            skip_next = False
            continue
        
        label = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ''
        amount_str = str(df.iloc[idx, 1]).strip() if pd.notna(df.iloc[idx, 1]) else '0'
        
        # 건너뛸 행
        if label in ['', '(비어 있음)', '행 레이블', '총합계', 'nan']:
            continue
        
        amount = clean_amount(amount_str)
        
        # 브랜드 레벨
        if label in BRANDS:
            current_brand = label
            current_category_l1 = None
            prev_label = None
            continue
        
        if not current_brand:
            continue
        
        # 다음 행 확인
        next_label = ''
        if idx + 1 < len(df):
            next_label = str(df.iloc[idx + 1, 0]).strip() if pd.notna(df.iloc[idx + 1, 0]) else ''
        
        # 다음 행이 같은 레이블이면 현재는 합계 행
        if label == next_label:
            # 합계 행 - 대분류로 설정하고 다음 행 건너뛰기
            current_category_l1 = label
            skip_next = True
            
            # 다음 행 데이터 가져오기
            next_amount_str = str(df.iloc[idx + 1, 1]).strip() if pd.notna(df.iloc[idx + 1, 1]) else '0'
            next_amount = clean_amount(next_amount_str)
            
            # 대분류 실제 금액 저장
            rows.append({
                'brand': current_brand,
                'category_l1': label,
                'category_l2': '',
                'category_l3': '',
                'amount': next_amount,
                'year_month': year_month
            })
            
            prev_label = label
            continue
        
        # 단일 레이블 - 소분류
        if current_category_l1:
            # 현재 대분류의 소분류
            rows.append({
                'brand': current_brand,
                'category_l1': current_category_l1,
                'category_l2': '',
                'category_l3': label,
                'amount': amount,
                'year_month': year_month
            })
        else:
            # 대분류 없이 바로 나온 항목 - 대분류로 처리
            rows.append({
                'brand': current_brand,
                'category_l1': label,
                'category_l2': '',
                'category_l3': '',
                'amount': amount,
                'year_month': year_month
            })
        
        prev_label = label
    
    result_df = pd.DataFrame(rows)
    print(f"[OK] Parsed {len(result_df)} data rows")
    
    # 통계 출력
    if not result_df.empty:
        print(f"     Brands: {result_df['brand'].nunique()}")
        print(f"     L1 Categories: {result_df['category_l1'].nunique()}")
        print(f"     Total Amount: {result_df['amount'].sum():,.0f} KRW")
    
    return result_df

def process_ledger_csv(csv_file, year_month):
    """CSV 원장 파일 처리"""
    print(f"\n{'='*60}")
    print(f"[FILE] Processing: {csv_file.name}")
    print(f"{'='*60}")
    
    df = parse_csv_hierarchy_final(csv_file, year_month)
    
    if df.empty:
        print("[WARN] No data parsed")
        return None
    
    # 브랜드별 통계
    print(f"\n[STATS] Brand summary:")
    brand_summary = df.groupby('brand')['amount'].sum().sort_values(ascending=False)
    for brand, amount in brand_summary.items():
        print(f"  - {brand}: {amount:,.0f} KRW")
    
    # 대분류별 통계
    print(f"\n[STATS] Category L1 summary (top 10):")
    cat_summary = df.groupby('category_l1')['amount'].sum().sort_values(ascending=False).head(10)
    for cat, amount in cat_summary.items():
        print(f"  - {cat}: {amount:,.0f} KRW")
    
    # CSV 저장
    output_file = COSTS_DIR / f'costs_{year_month}.csv'
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"\n[OK] Saved: {output_file.name}")
    
    return df

def create_brand_analysis_data(df, year_month):
    """브랜드별 GL계정 분석 데이터 생성"""
    print(f"\n[ANALYSIS] Creating brand analysis data for {year_month}...")
    
    if df is None or df.empty:
        return
    
    for brand in df['brand'].unique():
        brand_df = df[df['brand'] == brand].copy()
        
        # 브랜드 폴더 생성
        brand_dir = GL_ANALYSIS_DIR / brand.replace(' ', '_')
        brand_dir.mkdir(exist_ok=True)
        
        # 대분류별로 파일 생성
        categories = brand_df['category_l1'].unique()
        for category_l1 in categories:
            if not category_l1:
                continue
            
            cat_df = brand_df[brand_df['category_l1'] == category_l1].copy()
            
            # 파일명 정제
            safe_cat_name = category_l1.replace('/', '_').replace('\\', '_').replace(':', '').replace('(', '').replace(')', '').strip()
            output_file = brand_dir / f'{safe_cat_name}_{year_month}.csv'
            
            cat_df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"  [OK] {brand}: {len(categories)} categories")

def create_combined_analysis_file():
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
            print(f"  [LOAD] {year_month}: {len(dfs[year_month])} rows")
    
    if len(dfs) < 2:
        print("  [WARN] Need both 202410 and 202510 data for comparison")
        return
    
    # 브랜드별로 통합
    all_brands = set()
    for df in dfs.values():
        all_brands.update(df['brand'].unique())
    
    for brand in sorted(all_brands):
        brand_dir = GL_ANALYSIS_DIR / brand.replace(' ', '_')
        brand_dir.mkdir(exist_ok=True)
        
        # 각 카테고리별로 통합
        all_categories = set()
        for df in dfs.values():
            brand_df = df[df['brand'] == brand]
            all_categories.update(brand_df['category_l1'].unique())
        
        combined_count = 0
        for category in sorted(all_categories):
            if not category:
                continue
            
            combined_rows = []
            for year_month, df in dfs.items():
                cat_df = df[(df['brand'] == brand) & (df['category_l1'] == category)]
                if not cat_df.empty:
                    combined_rows.append(cat_df)
            
            if combined_rows:
                combined_df = pd.concat(combined_rows, ignore_index=True)
                safe_cat_name = category.replace('/', '_').replace('\\', '_').replace(':', '').replace('(', '').replace(')', '').strip()
                output_file = brand_dir / f'{safe_cat_name}_combined.csv'
                combined_df.to_csv(output_file, index=False, encoding='utf-8-sig')
                combined_count += 1
        
        print(f"  [OK] {brand}: {combined_count} categories combined")

def create_dashboard_summary():
    """대시보드용 요약 데이터 생성"""
    print(f"\n[SUMMARY] Creating dashboard summary...")
    
    # 모든 비용 데이터 로드
    all_data = []
    for file in COSTS_DIR.glob('costs_*.csv'):
        df = pd.read_csv(file, encoding='utf-8-sig')
        all_data.append(df)
    
    if not all_data:
        print("  [WARN] No cost data found")
        return
    
    combined = pd.concat(all_data, ignore_index=True)
    
    # 브랜드별, 연월별, 카테고리별 요약
    summary = combined.groupby(['brand', 'year_month', 'category_l1']).agg({
        'amount': 'sum'
    }).reset_index()
    
    summary_file = COSTS_DIR / 'summary_by_brand_category.csv'
    summary.to_csv(summary_file, index=False, encoding='utf-8-sig')
    print(f"  [OK] Saved: {summary_file.name}")
    
    # 브랜드별 월별 합계
    brand_monthly = combined.groupby(['brand', 'year_month']).agg({
        'amount': 'sum'
    }).reset_index()
    
    brand_monthly_file = COSTS_DIR / 'summary_by_brand_month.csv'
    brand_monthly.to_csv(brand_monthly_file, index=False, encoding='utf-8-sig')
    print(f"  [OK] Saved: {brand_monthly_file.name}")
    
    # 전체 요약 출력
    print(f"\n{'='*60}")
    print("[SUMMARY] Overall Statistics")
    print(f"{'='*60}")
    
    for year_month in sorted(combined['year_month'].unique()):
        ym_data = combined[combined['year_month'] == year_month]
        total = ym_data['amount'].sum()
        print(f"\n{year_month}:")
        print(f"  Total Amount: {total:,.0f} KRW")
        print(f"  Brands: {len(ym_data['brand'].unique())}")
        print(f"  L1 Categories: {len(ym_data['category_l1'].unique())}")
        print(f"  Data Rows: {len(ym_data)}")

def main():
    """메인 실행 함수"""
    print(f"\n{'#'*60}")
    print(f"# Pivot Ledger Data Processing (Final)")
    print(f"{'#'*60}")
    
    # 처리할 CSV 파일 목록
    files_to_process = [
        ('ledger_202410.csv', '202410'),
        ('ledger_202510.csv', '202510')
    ]
    
    all_data = {}
    
    for filename, year_month in files_to_process:
        csv_file = LEDGER_DIR / filename
        
        if not csv_file.exists():
            print(f"[WARN] File not found: {filename}")
            continue
        
        # 1. CSV 파일 처리
        df = process_ledger_csv(csv_file, year_month)
        all_data[year_month] = df
        
        # 2. 브랜드별 분석 데이터 생성
        if df is not None:
            create_brand_analysis_data(df, year_month)
    
    # 3. 통합 분석 파일 생성 (전년/당년 비교)
    create_combined_analysis_file()
    
    # 4. 대시보드 요약 데이터 생성
    create_dashboard_summary()
    
    print(f"\n{'#'*60}")
    print(f"# [COMPLETE] All processing finished!")
    print(f"{'#'*60}")
    print(f"\n[FOLDERS] Created directories:")
    print(f"  - {COSTS_DIR.relative_to(BASE_DIR)}")
    print(f"    * costs_YYYYMM.csv: Monthly cost data")
    print(f"    * summary_*.csv: Summary files")
    print(f"  - {GL_ANALYSIS_DIR.relative_to(BASE_DIR)}")
    print(f"    * [Brand]/[Category]_YYYYMM.csv: Monthly data by category")
    print(f"    * [Brand]/[Category]_combined.csv: YoY comparison data")
    print(f"\n[NEXT] Next steps:")
    print(f"  1. Review generated CSV files")
    print(f"  2. Start dashboard server: npm run dev")
    print(f"  3. Integrate data into dashboard")
    print(f"  4. Run OpenAI analysis for insights")

if __name__ == '__main__':
    main()

