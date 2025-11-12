#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 파일의 따옴표 문제 수정
"""
import re

def fix_csv_quotes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    header = lines[0]
    cleaned_lines = [header]
    
    for i, line in enumerate(lines[1:], start=2):
        # insight 부분의 따옴표 문제 수정
        # '- "' 패턴 제거
        line = re.sub(r',"- "', ',"', line)
        # '""text""' 패턴을 '"text"'로 변경
        line = re.sub(r'""([^"]+)""', r'"\1"', line)
        
        # 빈 카테고리 확인
        if ',"",' in line:
            parts = line.split(',')
            if len(parts) >= 5 and parts[2] == '""' and parts[3] == '""':
                print(f'Warning Line {i}: Empty category found')
                print(f'   {line[:150]}...')
        
        cleaned_lines.append(line)
    
    # 저장
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        f.writelines(cleaned_lines)
    
    print(f'CSV file cleaned!')
    print(f'Total {len(cleaned_lines)-1} rows processed')

if __name__ == '__main__':
    brands = ['MLB_KIDS', 'DUVETICA', 'Discovery', 'SERGIO_TACCHINI']
    
    for brand in brands:
        filepath = f'public/data/ledger_insights/{brand}_202510_insights.csv'
        print(f'\nProcessing {brand}...')
        try:
            fix_csv_quotes(filepath)
        except Exception as e:
            print(f'Error processing {brand}: {e}')

