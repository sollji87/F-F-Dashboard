"""
Snowflake 연결 예제
환경변수에서 Snowflake 연결 정보를 읽어옵니다
"""

import os
import json
import sys
import pandas as pd
import snowflake.connector

def main():
    try:
        # 환경변수에서 Snowflake 연결 정보 읽기
        account = os.getenv('SNOWFLAKE_ACCOUNT')
        user = os.getenv('SNOWFLAKE_USER')
        password = os.getenv('SNOWFLAKE_PASSWORD')
        warehouse = os.getenv('SNOWFLAKE_WAREHOUSE')
        database = os.getenv('SNOWFLAKE_DATABASE')
        schema = os.getenv('SNOWFLAKE_SCHEMA')
        
        if not all([account, user, password]):
            result = {
                'success': False,
                'error': 'Snowflake 연결 정보가 환경변수에 설정되지 않았습니다.'
            }
            print(json.dumps(result, ensure_ascii=False))
            return
        
        # Snowflake 연결
        conn = snowflake.connector.connect(
            account=account,
            user=user,
            password=password,
            warehouse=warehouse,
            database=database,
            schema=schema
        )
        
        # 쿼리 실행 예제
        cursor = conn.cursor()
        cursor.execute("SELECT CURRENT_VERSION()")
        version = cursor.fetchone()[0]
        
        result = {
            'success': True,
            'message': 'Snowflake 연결 성공',
            'version': version
        }
        
        cursor.close()
        conn.close()
        
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()

