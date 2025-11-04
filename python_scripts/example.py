"""
간단한 Python 스크립트 예제
pandas, openai, snowflake 사용 예제
"""

import pandas as pd
import json
import sys

def main():
    # pandas 예제: 간단한 데이터프레임 생성
    data = {
        '이름': ['홍길동', '김철수', '이영희'],
        '나이': [25, 30, 28],
        '직업': ['개발자', '디자이너', '기획자']
    }
    
    df = pd.DataFrame(data)
    
    # 데이터프레임을 JSON으로 변환
    result = {
        'success': True,
        'data': df.to_dict(orient='records'),
        'summary': {
            'total_rows': len(df),
            'columns': list(df.columns),
            'average_age': df['나이'].mean()
        }
    }
    
    # JSON 형태로 출력 (Next.js API에서 읽을 수 있도록)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()

