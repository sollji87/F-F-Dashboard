"""
Excel 파일 구조 확인 스크립트
"""

import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'

# 파일 목록
files = [
    '2410원장.xlsx',
    '2510원장.xlsx'
]

for filename in files:
    file_path = DATA_DIR / filename
    
    if not file_path.exists():
        print(f"[ERROR] File not found: {filename}")
        continue
    
    print(f"\n{'='*60}")
    print(f"File: {filename}")
    print(f"{'='*60}")
    
    # Excel 파일 읽기 (헤더 없이)
    df = pd.read_excel(file_path, header=None)
    
    print(f"Total rows: {len(df)}")
    print(f"Total columns: {len(df.columns)}")
    print(f"\nFirst 30 rows:")
    print("-" * 60)
    
    for idx in range(min(30, len(df))):
        col0 = str(df.iloc[idx, 0]) if pd.notna(df.iloc[idx, 0]) else ''
        col1 = str(df.iloc[idx, 1]) if pd.notna(df.iloc[idx, 1]) else ''
        print(f"{idx:3d} | {col0:40s} | {col1}")
    
    print(f"\n... (showing first 30 of {len(df)} rows)")

