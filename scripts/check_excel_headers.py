"""
Excel 파일 헤더 확인
"""

import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'

file_path = DATA_DIR / '2410원장.xlsx'

print("Reading Excel file with header...")
df = pd.read_excel(file_path)

print(f"\nTotal rows: {len(df)}")
print(f"Total columns: {len(df.columns)}")

print(f"\nColumn names:")
for idx, col in enumerate(df.columns):
    print(f"{idx:2d}. {col}")

print(f"\nFirst 5 rows of data:")
print(df.head(5).to_string())

print(f"\nColumn types:")
print(df.dtypes)

