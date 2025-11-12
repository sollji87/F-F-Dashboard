"""
원장 데이터 처리 스크립트
- Excel 파일을 CSV로 변환
- 피벗 테이블 생성
- OpenAI 분석용 GL계정별 데이터 생성
"""

import pandas as pd
import os
from pathlib import Path
import numpy as np

# 경로 설정
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'
LEDGER_DIR = DATA_DIR / 'ledger'
GL_ACCOUNT_DIR = DATA_DIR / 'gl_accounts'

# 디렉토리 생성
LEDGER_DIR.mkdir(exist_ok=True)
GL_ACCOUNT_DIR.mkdir(exist_ok=True)

def clean_amount(value):
    """금액 데이터 정제 (쉼표 제거 및 숫자 변환)"""
    if pd.isna(value):
        return 0
    if isinstance(value, (int, float)):
        return float(value)
    # 문자열인 경우 쉼표 제거
    return float(str(value).replace(',', '').replace(' ', ''))

def process_excel_to_csv(excel_file, year_month):
    """
    Excel 파일을 읽어서 기본 CSV로 변환
    
    Args:
        excel_file: Excel 파일 경로
        year_month: 연월 (예: 202410)
    """
    print(f"\n{'='*60}")
    print(f"[FILE] Processing: {excel_file.name} ({year_month})")
    print(f"{'='*60}")
    
    # Excel 파일 읽기
    df = pd.read_excel(excel_file)
    
    print(f"[OK] Loaded data: {len(df)} rows")
    print(f"     Columns: {list(df.columns)}")
    
    # 금액 컬럼 정제
    if '금액(현지 통화)' in df.columns:
        df['금액(현지 통화)'] = df['금액(현지 통화)'].apply(clean_amount)
    
    # 코스트센터 타입 추가 (F: 부서, Z: 매장)
    if '코스트 센터' in df.columns:
        df['코스트센터타입'] = df['코스트 센터'].apply(
            lambda x: '부서' if str(x).startswith('F') else ('매장' if str(x).startswith('Z') else '기타')
        )
    
    # 연월 컬럼 추가
    df['연월'] = year_month
    
    # 기본 CSV 저장
    output_file = LEDGER_DIR / f'ledger_{year_month}.csv'
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"[OK] Saved CSV: {output_file.name}")
    
    return df

def create_pivot_table(df, year_month):
    """
    피벗 테이블 생성
    행: 사업 영역 내역, 코스트센터명, CATEGORY_L1, L2, L3
    값: 금액(현지통화) 합계
    """
    print(f"\n[PIVOT] Creating pivot table...")
    
    # 필요한 컬럼 확인
    required_cols = ['사업 영역 내역', '코스트센터명', 'CATEGORY_L1', 'CATEGORY_L2', 'CATEGORY_L3', '금액(현지 통화)']
    available_cols = [col for col in required_cols if col in df.columns]
    
    if len(available_cols) < len(required_cols):
        missing = set(required_cols) - set(available_cols)
        print(f"[WARN] Missing columns: {missing}")
        return None
    
    # 피벗 테이블 생성
    pivot_df = df.groupby([
        '사업 영역 내역',
        '코스트센터명',
        'CATEGORY_L1',
        'CATEGORY_L2',
        'CATEGORY_L3'
    ]).agg({
        '금액(현지 통화)': 'sum'
    }).reset_index()
    
    pivot_df.columns = ['사업영역', '코스트센터', '대분류', '중분류', '소분류', '금액']
    
    # 연월 추가
    pivot_df['연월'] = year_month
    
    # 저장
    output_file = LEDGER_DIR / f'pivot_{year_month}.csv'
    pivot_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"[OK] Saved pivot table: {output_file.name}")
    print(f"     Total {len(pivot_df)} rows")
    
    return pivot_df

def create_gl_account_data(df, year_month):
    """
    OpenAI 분석용 GL계정별 데이터 생성
    사업부별 폴더 생성 및 GL계정별 CSV 파일 생성
    """
    print(f"\n[GL] Creating GL account data...")
    
    # 필요한 컬럼 확인
    if 'G/L 계정 설명' not in df.columns or '사업 영역 내역' not in df.columns:
        print("[WARN] Missing required columns: GL Account or Business Area")
        return
    
    # 사업부별로 그룹화
    business_areas = df['사업 영역 내역'].dropna().unique()
    
    for business_area in business_areas:
        if pd.isna(business_area) or business_area == '':
            continue
            
        # 사업부명 정제 (폴더명으로 사용 가능하게)
        safe_business_name = str(business_area).replace('/', '_').replace('\\', '_').strip()
        
        # 사업부 폴더 생성
        business_dir = GL_ACCOUNT_DIR / safe_business_name
        business_dir.mkdir(exist_ok=True)
        
        # 해당 사업부 데이터 필터링
        business_df = df[df['사업 영역 내역'] == business_area].copy()
        
        # GL계정별로 그룹화
        gl_accounts = business_df['G/L 계정 설명'].dropna().unique()
        
        print(f"\n  [DIR] {safe_business_name}: {len(gl_accounts)} GL accounts")
        
        for gl_account in gl_accounts:
            if pd.isna(gl_account) or gl_account == '':
                continue
                
            # GL계정명 정제
            safe_gl_name = str(gl_account).replace('/', '_').replace('\\', '_').strip()
            
            # 해당 GL계정 데이터 필터링
            gl_df = business_df[business_df['G/L 계정 설명'] == gl_account].copy()
            
            # 연월 추가
            gl_df['연월'] = year_month
            
            # 파일명: GL계정명_연월.csv
            output_file = business_dir / f'{safe_gl_name}_{year_month}.csv'
            gl_df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"  [OK] Created {len(gl_accounts)} GL account files")

def create_summary_report(all_data):
    """전체 데이터 요약 보고서 생성"""
    print(f"\n{'='*60}")
    print(f"[SUMMARY] Data Summary Report")
    print(f"{'='*60}")
    
    summary_file = LEDGER_DIR / 'summary_report.csv'
    
    summary_data = []
    
    for year_month, df in all_data.items():
        if df is None or len(df) == 0:
            continue
            
        total_amount = df['금액(현지 통화)'].sum() if '금액(현지 통화)' in df.columns else 0
        
        summary_data.append({
            '연월': year_month,
            '총_행수': len(df),
            '총_금액': total_amount,
            '사업부_수': df['사업 영역 내역'].nunique() if '사업 영역 내역' in df.columns else 0,
            'GL계정_수': df['G/L 계정 설명'].nunique() if 'G/L 계정 설명' in df.columns else 0,
            '코스트센터_수': df['코스트센터명'].nunique() if '코스트센터명' in df.columns else 0
        })
    
    summary_df = pd.DataFrame(summary_data)
    summary_df.to_csv(summary_file, index=False, encoding='utf-8-sig')
    
    print(f"\n{summary_df.to_string(index=False)}")
    print(f"\n[OK] Saved summary report: {summary_file.name}")

def main():
    """메인 실행 함수"""
    print(f"\n{'#'*60}")
    print(f"# 원장 데이터 처리 시작")
    print(f"{'#'*60}")
    
    # 처리할 파일 목록
    files_to_process = [
        ('2410원장.xlsx', '202410'),
        ('2510원장.xlsx', '202510')
    ]
    
    all_data = {}
    
    for filename, year_month in files_to_process:
        excel_file = DATA_DIR / filename
        
        if not excel_file.exists():
            print(f"[WARN] File not found: {filename}")
            continue
        
        # 1. Excel → CSV 변환
        df = process_excel_to_csv(excel_file, year_month)
        all_data[year_month] = df
        
        # 2. 피벗 테이블 생성
        create_pivot_table(df, year_month)
        
        # 3. GL계정별 데이터 생성
        create_gl_account_data(df, year_month)
    
    # 4. 요약 보고서 생성
    if all_data:
        create_summary_report(all_data)
    
    print(f"\n{'#'*60}")
    print(f"# [COMPLETE] All processing finished!")
    print(f"{'#'*60}")
    print(f"\n[FOLDERS] Created directories:")
    print(f"  - {LEDGER_DIR.relative_to(BASE_DIR)}: Basic CSV and pivot tables")
    print(f"  - {GL_ACCOUNT_DIR.relative_to(BASE_DIR)}: GL account data by business area")
    print(f"\n[NEXT] Next steps:")
    print(f"  1. Check generated CSV files")
    print(f"  2. Run dashboard server")
    print(f"  3. Run OpenAI analysis script")

if __name__ == '__main__':
    main()

