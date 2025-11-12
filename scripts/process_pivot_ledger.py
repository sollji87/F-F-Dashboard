"""
피벗 테이블 형태의 원장 데이터 처리 스크립트
- 계층 구조 파싱 (브랜드 > 대분류 > 중분류 > 소분류)
- 대시보드용 CSV 생성
- OpenAI 분석용 데이터 생성
"""

import pandas as pd
import os
from pathlib import Path
import re

# 경로 설정
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'
LEDGER_DIR = DATA_DIR / 'ledger'
COSTS_DIR = DATA_DIR / 'costs'
GL_ANALYSIS_DIR = DATA_DIR / 'gl_analysis'

# 디렉토리 생성
LEDGER_DIR.mkdir(exist_ok=True)
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
    return float(str(value).replace(',', '').replace(' ', ''))

def parse_hierarchy_structure(df):
    """
    계층 구조 파싱
    브랜드 > 대분류 > 중분류 > 소분류
    """
    print("\n[PARSE] Parsing hierarchy structure...")
    
    rows = []
    current_brand = None
    current_l1 = None
    current_l2 = None
    
    for idx, row in df.iterrows():
        label = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
        amount_str = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else '0'
        
        # 빈 행이나 헤더 행 건너뛰기
        if label in ['', '(비어 있음)', '행 레이블', '총합계']:
            continue
        
        amount = clean_amount(amount_str)
        
        # 브랜드 레벨 판단
        if label in BRANDS:
            current_brand = label
            current_l1 = None
            current_l2 = None
            continue
        
        # 현재 브랜드가 없으면 건너뛰기
        if not current_brand:
            continue
        
        # 들여쓰기 레벨 추정 (금액이 있으면 최하위 레벨)
        # 실제 데이터 구조 분석 필요
        
        # 간단한 규칙: 같은 항목이 연속으로 나오면 하위 항목
        if current_l1 and label == current_l1:
            # 중복 항목은 건너뛰기
            continue
        
        # 새로운 대분류
        if not current_l1 or label != current_l1:
            # 이전 항목과 다르면 새로운 대분류
            if amount > 0:
                # 금액이 있으면 대분류로 설정
                rows.append({
                    'brand': current_brand,
                    'category_l1': label,
                    'category_l2': '',
                    'category_l3': '',
                    'amount': amount
                })
                current_l1 = label
                current_l2 = None
    
    result_df = pd.DataFrame(rows)
    print(f"[OK] Parsed {len(result_df)} rows")
    return result_df

def parse_hierarchy_structure_v2(file_path, year_month):
    """
    개선된 계층 구조 파싱
    실제 Excel 파일의 들여쓰기 정보를 활용
    """
    print(f"\n[PARSE] Parsing {file_path.name}...")
    
    # Excel 파일 직접 읽기
    df = pd.read_excel(file_path, header=None)
    
    rows = []
    current_brand = None
    indent_stack = []  # (indent_level, category_name) 스택
    
    for idx in range(len(df)):
        # 첫 번째 컬럼: 레이블, 두 번째 컬럼: 금액
        label = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ''
        amount_str = str(df.iloc[idx, 1]).strip() if pd.notna(df.iloc[idx, 1]) else '0'
        
        # 헤더나 빈 행 건너뛰기
        if label in ['', '(비어 있음)', '행 레이블', '총합계', 'nan']:
            continue
        
        amount = clean_amount(amount_str)
        
        # 브랜드 레벨
        if label in BRANDS:
            current_brand = label
            indent_stack = []
            continue
        
        if not current_brand:
            continue
        
        # 다음 행과 비교하여 계층 구조 파악
        # 같은 레이블이 다음에 또 나오면 상위 카테고리
        is_parent = False
        if idx + 1 < len(df):
            next_label = str(df.iloc[idx + 1, 0]).strip() if pd.notna(df.iloc[idx + 1, 0]) else ''
            if next_label == label:
                is_parent = True
        
        if is_parent:
            # 상위 카테고리 - 스택에 추가
            indent_stack.append(label)
        else:
            # 실제 데이터 행
            category_l1 = indent_stack[0] if len(indent_stack) > 0 else label
            category_l2 = indent_stack[1] if len(indent_stack) > 1 else ''
            category_l3 = label if len(indent_stack) > 0 else ''
            
            # 중복 제거: 같은 레이블이 스택에 있으면 제거
            if label in indent_stack:
                # 해당 레벨까지 스택 정리
                while indent_stack and indent_stack[-1] != label:
                    indent_stack.pop()
                if indent_stack:
                    indent_stack.pop()
            
            rows.append({
                'brand': current_brand,
                'category_l1': category_l1,
                'category_l2': category_l2,
                'category_l3': category_l3,
                'amount': amount,
                'year_month': year_month
            })
    
    result_df = pd.DataFrame(rows)
    print(f"[OK] Parsed {len(result_df)} rows from {current_brand if current_brand else 'all brands'}")
    return result_df

def process_ledger_file(file_path, year_month):
    """원장 파일 처리"""
    print(f"\n{'='*60}")
    print(f"[FILE] Processing: {file_path.name} ({year_month})")
    print(f"{'='*60}")
    
    # 계층 구조 파싱
    df = parse_hierarchy_structure_v2(file_path, year_month)
    
    if df.empty:
        print("[WARN] No data parsed")
        return None
    
    # 브랜드별 통계
    print(f"\n[STATS] Brand summary:")
    brand_summary = df.groupby('brand')['amount'].sum().sort_values(ascending=False)
    for brand, amount in brand_summary.items():
        print(f"  - {brand}: {amount:,.0f} KRW")
    
    # CSV 저장
    output_file = COSTS_DIR / f'costs_{year_month}.csv'
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"\n[OK] Saved: {output_file.name}")
    
    return df

def create_brand_analysis_data(df, year_month):
    """
    브랜드별 GL계정 분석 데이터 생성
    전년/당년 비교를 위한 구조
    """
    print(f"\n[ANALYSIS] Creating brand analysis data...")
    
    if df is None or df.empty:
        return
    
    for brand in df['brand'].unique():
        brand_df = df[df['brand'] == brand].copy()
        
        # 브랜드 폴더 생성
        brand_dir = GL_ANALYSIS_DIR / brand.replace(' ', '_')
        brand_dir.mkdir(exist_ok=True)
        
        # 대분류별로 파일 생성
        for category_l1 in brand_df['category_l1'].unique():
            if not category_l1:
                continue
            
            cat_df = brand_df[brand_df['category_l1'] == category_l1].copy()
            
            # 파일명 정제
            safe_cat_name = category_l1.replace('/', '_').replace('\\', '_').strip()
            output_file = brand_dir / f'{safe_cat_name}_{year_month}.csv'
            
            cat_df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"  [OK] {brand}: {len(brand_df['category_l1'].unique())} categories")

def create_combined_analysis_file():
    """
    전년/당년 통합 분석 파일 생성
    각 브랜드별, 카테고리별로 202410과 202510 데이터를 합침
    """
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
            print(f"  [OK] Loaded {year_month}: {len(dfs[year_month])} rows")
    
    if len(dfs) < 2:
        print("  [WARN] Need both 202410 and 202510 data for comparison")
        return
    
    # 브랜드별로 통합
    all_brands = set()
    for df in dfs.values():
        all_brands.update(df['brand'].unique())
    
    for brand in all_brands:
        brand_dir = GL_ANALYSIS_DIR / brand.replace(' ', '_')
        brand_dir.mkdir(exist_ok=True)
        
        # 각 카테고리별로 통합
        all_categories = set()
        for df in dfs.values():
            brand_df = df[df['brand'] == brand]
            all_categories.update(brand_df['category_l1'].unique())
        
        for category in all_categories:
            if not category:
                continue
            
            combined_rows = []
            for year_month, df in dfs.items():
                cat_df = df[(df['brand'] == brand) & (df['category_l1'] == category)]
                if not cat_df.empty:
                    combined_rows.append(cat_df)
            
            if combined_rows:
                combined_df = pd.concat(combined_rows, ignore_index=True)
                safe_cat_name = category.replace('/', '_').replace('\\', '_').strip()
                output_file = brand_dir / f'{safe_cat_name}_combined.csv'
                combined_df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"  [OK] {brand}: {len(all_categories)} categories combined")

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
    
    # 브랜드별, 연월별 요약
    summary = combined.groupby(['brand', 'year_month', 'category_l1']).agg({
        'amount': 'sum'
    }).reset_index()
    
    summary_file = COSTS_DIR / 'summary_by_brand_category.csv'
    summary.to_csv(summary_file, index=False, encoding='utf-8-sig')
    print(f"  [OK] Saved: {summary_file.name}")
    
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
        print(f"  Categories: {len(ym_data['category_l1'].unique())}")

def main():
    """메인 실행 함수"""
    print(f"\n{'#'*60}")
    print(f"# Pivot Ledger Data Processing")
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
    print(f"  - {COSTS_DIR.relative_to(BASE_DIR)}: Cost data by month")
    print(f"  - {GL_ANALYSIS_DIR.relative_to(BASE_DIR)}: Analysis data by brand")
    print(f"\n[NEXT] Next steps:")
    print(f"  1. Check generated CSV files")
    print(f"  2. Run dashboard server")
    print(f"  3. Run OpenAI analysis for GL accounts")

if __name__ == '__main__':
    main()

