"""
OpenAI API 사용 예제
환경변수에서 OPENAI_API_KEY를 읽어옵니다
"""

import os
import json
import sys
from openai import OpenAI

def main():
    try:
        # 환경변수에서 API 키 읽기
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            result = {
                'success': False,
                'error': 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.'
            }
            print(json.dumps(result, ensure_ascii=False))
            return
        
        # OpenAI 클라이언트 초기화
        client = OpenAI(api_key=api_key)
        
        # 간단한 채팅 완성 예제
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 친절한 AI 어시스턴트입니다."},
                {"role": "user", "content": "안녕하세요!"}
            ],
            max_tokens=100
        )
        
        result = {
            'success': True,
            'response': response.choices[0].message.content,
            'model': response.model,
            'usage': {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }
        
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()

