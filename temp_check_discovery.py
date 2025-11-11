import csv

total = 0
details = {}

with open('public/data/snowflake_costs.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    for row in reader:
        if len(row) > 11:
            month = row[0]
            brand_cd = row[1]
            cat_l1 = row[6]
            cat_l2 = row[7]
            gl_nm = row[10]
            cost = float(row[11])
            
            # DISCOVERY 10월 지급수수료 또는 제간비
            if month == '202510' and brand_cd == 'X' and cat_l1 in ['지급수수료', '제간비']:
                total += cost
                key = f"{cat_l1} > {cat_l2} > {gl_nm}"
                if key not in details:
                    details[key] = 0
                details[key] += cost

print("\n=== DISCOVERY 2025년 10월 지급수수료 + 제간비 ===")
print(f"총 합계: {total:,.0f}원 ({total/1000000:.1f}백만원)")
print("\n세부 내역:")
for key, value in sorted(details.items(), key=lambda x: -x[1]):
    print(f"  {key}: {value:,.0f}원 ({value/1000000:.1f}백만원)")

