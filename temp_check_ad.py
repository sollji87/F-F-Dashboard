import csv

# 2025년 10월 DISCOVERY 광고선전비 확인
monthly_totals = {}
subcategory_details = {}

with open('public/data/snowflake_costs.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    for row in reader:
        if len(row) > 11:
            month = row[0]
            brand_cd = row[1]
            cat_l1 = row[6]
            cat_l3 = row[8]
            gl_nm = row[10]
            cost = float(row[11])
            
            # DISCOVERY 2025년 광고선전비
            if brand_cd == 'X' and month.startswith('2025') and cat_l1 == '광고선전비':
                if month not in monthly_totals:
                    monthly_totals[month] = 0
                    subcategory_details[month] = {}
                
                monthly_totals[month] += cost
                
                # 소분류 또는 계정명으로 집계
                key = cat_l3 if cat_l3 else gl_nm
                if key not in subcategory_details[month]:
                    subcategory_details[month][key] = 0
                subcategory_details[month][key] += cost

print("\n=== DISCOVERY 2025년 광고선전비 월별 합계 ===")
for month in sorted(monthly_totals.keys()):
    print(f"\n{month}: {monthly_totals[month]:,.0f}원 ({monthly_totals[month]/1000000:.1f}백만원)")
    print("  세부 내역:")
    for key, value in sorted(subcategory_details[month].items(), key=lambda x: -x[1])[:10]:
        print(f"    {key}: {value:,.0f}원 ({value/1000000:.1f}백만원)")

