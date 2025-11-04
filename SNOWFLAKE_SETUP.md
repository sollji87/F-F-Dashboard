# Snowflake 연동 가이드

## 📋 필요한 정보

Snowflake 연결을 위해 다음 정보가 필요합니다:

### 1. 계정 정보
- **SNOWFLAKE_ACCOUNT**: Snowflake 계정 식별자 (예: `xy12345.us-east-1`)
- **SNOWFLAKE_USER**: 사용자 이름
- **SNOWFLAKE_PASSWORD**: 비밀번호

### 2. 데이터베이스 정보
- **SNOWFLAKE_WAREHOUSE**: 웨어하우스 이름 (예: `COMPUTE_WH`)
- **SNOWFLAKE_DATABASE**: 데이터베이스 이름 (예: `FF_DATABASE`)
- **SNOWFLAKE_SCHEMA**: 스키마 이름 (예: `PUBLIC`)

## 🔧 설정 방법

### 로컬 개발 환경

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Snowflake 연결 정보
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USER=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=FF_DATABASE
SNOWFLAKE_SCHEMA=PUBLIC
```

### Vercel 배포 환경

1. Vercel 대시보드 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 위의 6개 변수를 모두 추가
4. 저장 후 자동 재배포

## 📊 데이터 테이블 구조

Snowflake 테이블이 다음 구조를 가져야 합니다:

```sql
CREATE TABLE COST_SALES_DATA (
    YYYYMM VARCHAR(6),           -- 년월 (예: 202509)
    BRAND_CODE VARCHAR(50),      -- 브랜드 코드 (MLB, MLB_KIDS 등)
    COST_AMT DECIMAL(18,2),      -- 비용 금액
    SALE_AMT DECIMAL(18,2),      -- 매출 금액
    CATEGORY_L1 VARCHAR(50),     -- 대분류 (인건비, 마케팅비 등)
    CCTR_CODE VARCHAR(50),       -- 코스트센터 코드
    CCTR_NAME VARCHAR(100),      -- 코스트센터 명
    CCTR_TYPE VARCHAR(20)        -- 코스트센터 타입 (부서/매장)
);
```

## 📁 CSV 파일 업로드 (인원수)

`public/data/` 폴더에 인원수 CSV 파일 추가:

### 파일명 형식
`headcount_YYYYMM.csv` (예: `headcount_202509.csv`)

### CSV 형식
```csv
brand_code,headcount
MLB,150
MLB_KIDS,60
DISCOVERY,50
DUVETICA,40
SERGIO_TACCHINI,35
```

## 🔍 쿼리 수정

`app/api/data/snowflake/route.js` 파일에서 실제 테이블명으로 수정:

```javascript
const query = `
  SELECT 
    BRAND_CODE,
    SUM(COST_AMT) as TOTAL_COST,
    SUM(SALE_AMT) as TOTAL_SALES
  FROM YOUR_TABLE_NAME  -- 여기를 실제 테이블명으로 변경
  WHERE YYYYMM = '${month}'
  GROUP BY BRAND_CODE
`;
```

## ✅ 연동 확인

1. 로컬에서 테스트:
```bash
npm run dev
```

2. 브라우저에서 확인:
- http://localhost:3000
- 브랜드 카드에 실제 데이터 표시 확인

3. 개발자 도구 콘솔에서 데이터 소스 확인:
```javascript
// data_source 객체로 어떤 데이터가 사용되었는지 확인 가능
{
  snowflake: true,  // Snowflake 데이터 사용됨
  csv_headcount: true,  // CSV 인원수 사용됨
  mock: true  // Mock 데이터로 보완됨
}
```

## 🚨 문제 해결

### Snowflake 연결 실패
- 환경 변수가 올바르게 설정되었는지 확인
- Snowflake 계정의 IP 화이트리스트 확인
- 사용자 권한 확인

### CSV 파일을 찾을 수 없음
- 파일명이 `headcount_YYYYMM.csv` 형식인지 확인
- `public/data/` 폴더에 위치하는지 확인
- 파일 인코딩이 UTF-8인지 확인

### Mock 데이터만 표시됨
- 콘솔에서 에러 메시지 확인
- 네트워크 탭에서 API 호출 상태 확인

