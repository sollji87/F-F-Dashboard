import csv

details = {}
total = 0

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
            
            # DISCOVERY 10월 지급수수료
            if month == '202510' and brand_cd == 'X' and cat_l1 == '지급수수료':
                key = cat_l3 if cat_l3 else gl_nm
                if key not in details:
                    details[key] = 0
                details[key] += cost
                total += cost

print("\n=== DISCOVERY 2025년 10월 지급수수료 전체 ===")
print(f"총 합계: {total:,.0f}원 ({total/1000000:.1f}백만원)\n")

sorted_details = sorted(details.items(), key=lambda x: -x[1])
print(f"총 {len(sorted_details)}개 계정\n")

for i, (key, value) in enumerate(sorted_details, 1):
    marker = "[TOP10]" if i <= 10 else "       "
    print(f"{marker} {i:2d}. {key}: {value:,.0f}원 ({value/1000000:.1f}백만원)")

print("\n" + "="*60)
top10_sum = sum([v for _, v in sorted_details[:10]])
print(f"상위 10개 합계: {top10_sum:,.0f}원 ({top10_sum/1000000:.1f}백만원)")
print(f"전체 합계:     {total:,.0f}원 ({total/1000000:.1f}백만원)")
print(f"차이:          {total - top10_sum:,.0f}원 ({(total - top10_sum)/1000000:.1f}백만원)")

