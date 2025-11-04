# F&F 비용 분석 대시보드

Next.js + Tailwind CSS + Shadcn UI + Python 기반의 비용 분석 대시보드

## 🎯 주요 기능

### 1. 브랜드별 비용 분석
- **대상 브랜드**: MLB, MLB KIDS, DISCOVERY, DUVETICA, SERGIO TACCHINI
- 월별 비용 추이 및 전년 대비(YOY) 분석
- 비용 카테고리별 Drill-down 분석
- 코스트센터(부서/매장) 관점 분석

### 2. KPI 지표
- 총비용
- 매출대비 비용률 (%)
- 인당 비용 (백만원)
- 매장당 비용 (백만원)
- 전년 대비 증감률 (YOY %)

### 3. 시각화 차트
- 월별 YOY 트렌드 차트 (Bar + Line)
- 비용 카테고리별 YOY 비교 (당월/누적 토글)
- 효율성 지표 트렌드 (비용률/인당/매장당)

### 4. AI 인사이트
- OpenAI API 연동
- 자동 비용 분석 및 인사이트 생성
- 리스크 요인 및 액션 아이템 제안

## 📁 프로젝트 구조

```
.
├── app/
│   ├── page.js                    # 브랜드 선택 랜딩 페이지
│   ├── dashboard/[code]/page.js   # 브랜드별 상세 대시보드
│   └── api/
│       ├── data/
│       │   ├── brands/route.js    # 전체 브랜드 요약 API
│       │   └── brand/[code]/route.js  # 브랜드별 상세 데이터 API
│       └── insights/route.js      # AI 인사이트 생성 API
├── components/
│   └── dashboard/
│       ├── KpiCard.jsx            # KPI 카드 컴포넌트
│       ├── BrandSelector.jsx      # 브랜드 선택 컴포넌트
│       ├── FilterBar.jsx          # 필터 바
│       ├── AiInsightsPanel.jsx    # AI 인사이트 패널
│       ├── Loader.jsx             # 로딩 컴포넌트
│       ├── ErrorState.jsx         # 에러 상태 컴포넌트
│       └── charts/
│           ├── YoYTrendChart.jsx  # YOY 트렌드 차트
│           ├── CategoryBarChart.jsx  # 카테고리 비교 차트
│           └── EfficiencyChart.jsx   # 효율성 지표 차트
├── lib/
│   ├── types.js                   # 데이터 타입 정의
│   └── mockData.js                # Mock 데이터 생성
└── python_scripts/
    ├── snowflake_to_dashboard.py  # Snowflake → JSON 변환
    └── csv_to_dashboard.py        # CSV → JSON 변환
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
# Node.js 패키지
npm install

# Python 패키지 (가상환경 활성화 후)
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# OpenAI API Key (AI 인사이트 기능 사용 시)
OPENAI_API_KEY=your_openai_api_key

# Snowflake 연결 정보 (Python 스크립트 사용 시)
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_user
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 📊 데이터 파이프라인

### 방법 1: Snowflake 직접 연결

```bash
# Python 가상환경 활성화
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# 데이터 추출 및 JSON 생성
python python_scripts/snowflake_to_dashboard.py --month 202412 --output ./public/data
```

### 방법 2: CSV 파일 변환

```bash
# CSV 파일을 JSON으로 변환
python python_scripts/csv_to_dashboard.py \
  --cost cost_data.csv \
  --sales sales_data.csv \
  --headcount headcount_data.csv \
  --stores store_data.csv \
  --output ./public/data \
  --month 202412
```

### CSV 파일 형식

**cost_data.csv** (필수):
```csv
month,brand_code,gl_account,gl_name,cctr_code,cctr_name,cctr_type,cost_amt
202412,MLB,5101,급여,DEPT001,영업부,부서,50000000
```

**sales_data.csv** (선택):
```csv
month,brand_code,sale_amt
202412,MLB,150000000
```

**headcount_data.csv** (선택):
```csv
month,brand_code,headcount
202412,MLB,150
```

**store_data.csv** (선택):
```csv
month,brand_code,store_cnt
202412,MLB,80
```

## 🎨 주요 컴포넌트 사용법

### KpiCard

```jsx
import { KpiCard } from '@/components/dashboard/KpiCard';

<KpiCard 
  title="총비용"
  value={5000}
  unit="백만원"
  yoy={5.2}
  format="currency"
  description="전년 동월 대비"
/>
```

### YoYTrendChart

```jsx
import { YoYTrendChart } from '@/components/dashboard/charts/YoYTrendChart';

const data = [
  { month: '202401', cost: 5000, yoy: 5.2 },
  { month: '202402', cost: 5200, yoy: 4.8 },
];

<YoYTrendChart data={data} title="월별 비용 추이" />
```

### AiInsightsPanel

```jsx
import { AiInsightsPanel } from '@/components/dashboard/AiInsightsPanel';

<AiInsightsPanel 
  brand="MLB"
  month="202412"
  kpi={kpiData}
  topCategories={categoryData}
/>
```

## 🔧 커스터마이징

### 브랜드 추가

`lib/types.js` 파일에서 브랜드 정보 추가:

```javascript
export const BRAND_INFO = {
  // ... 기존 브랜드
  NEW_BRAND: { 
    code: 'NEW_BRAND', 
    name: '새 브랜드', 
    color: '#FF5733' 
  },
};
```

### 비용 카테고리 수정

`lib/types.js` 파일에서 카테고리 수정:

```javascript
export const COST_CATEGORIES = {
  PERSONNEL: '인건비',
  MARKETING: '마케팅비',
  // ... 추가 카테고리
};
```

### 차트 색상 변경

각 차트 컴포넌트 파일에서 `COLORS` 배열 수정

## 📝 API 엔드포인트

### GET /api/data/brands
전체 브랜드 요약 정보 조회

**Query Parameters:**
- `month`: 기준월 (YYYYMM, 기본값: 202412)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "brand_code": "MLB",
      "brand_name": "MLB",
      "color": "#002D72",
      "kpi": { ... }
    }
  ]
}
```

### GET /api/data/brand/[code]
특정 브랜드 상세 데이터 조회

**Path Parameters:**
- `code`: 브랜드 코드 (MLB, MLB_KIDS, etc.)

**Query Parameters:**
- `month`: 기준월 (YYYYMM)

**Response:**
```json
{
  "success": true,
  "data": {
    "brand_code": "MLB",
    "kpi": { ... },
    "monthly_data": [ ... ]
  }
}
```

### POST /api/insights
AI 인사이트 생성

**Request Body:**
```json
{
  "brand": "MLB",
  "month": "202412",
  "kpi": { ... },
  "topCategories": [ ... ]
}
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "summary": "...",
    "key_findings": [ ... ],
    "risks": [ ... ],
    "action_items": [ ... ]
  }
}
```

## 🌐 배포

### Vercel 배포

1. GitHub 저장소 푸시
2. Vercel에서 프로젝트 Import
3. 환경 변수 설정 (OPENAI_API_KEY)
4. 자동 배포 완료

### 환경 변수 설정 (Vercel)

Vercel 대시보드 → Settings → Environment Variables:
- `OPENAI_API_KEY`: OpenAI API 키

## 🐛 트러블슈팅

### Mock 데이터 vs 실제 데이터

현재는 `lib/mockData.js`에서 생성한 샘플 데이터를 사용합니다.
실제 Snowflake 데이터를 사용하려면:

1. Python 스크립트로 JSON 생성
2. `app/api/data/brand/[code]/route.js`에서 JSON 파일 읽기로 변경

```javascript
// 예시
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'public', 'data', `${code}_${month}.json`);
const dashboardData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
```

### OpenAI API 키 없이 사용

AI 인사이트 기능은 OpenAI API 키가 없어도 나머지 기능은 정상 작동합니다.
API 키가 없으면 fallback 메시지가 표시됩니다.

## 📚 참고 문서

- [Next.js Documentation](https://nextjs.org/docs)
- [Recharts Documentation](https://recharts.org/en-US/)
- [Shadcn UI](https://ui.shadcn.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Snowflake Python Connector](https://docs.snowflake.com/en/developer-guide/python-connector/python-connector)

## 📄 라이선스

이 프로젝트는 F&F 내부용입니다.

