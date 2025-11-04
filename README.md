비용 분석 대시보드 기능 명세서 (Next.js + Tailwind + shadcn/ui)

참고: 솔지가 업로드한 예시 화면(MLB 비용 대시보드 컴포넌트)을 UI/인터랙션 패턴의 레퍼런스로 활용합니다. 

mlb_dashboard_dynamic

1) 개요 (Purpose)

목표: 브랜드/계정(G/L)/코스트센터(CCTR) 단위의 비용 데이터를 월별로 집계·분석하고, 매출액/인원수/매장수 대비 효율성을 종합적으로 시각화. OpenAI API를 연결하여 자동 인사이트(KPI 코멘트, 리스크/액션아이템 등)를 생성.

대상 브랜드: MLB, MLB KIDS, DISCOVERY, DUVETICA, SERGIO TACCHINI

데이터 소스: Snowflake (원천) → CSV Export → Python 전처리 → Next.js 프론트에 공급

2) 범위 (Scope)

브랜드 선택 랜딩 → 브랜드별 상세 대시보드

월별 추이/YOY/누적(YTD), 대분류/중분류/소분류(계정체계) Drill-down

코스트센터 관점: 부서 vs 매장 분해, CCTR 규칙 필터 반영

효율성 지표: 매출대비 비용률 / 인당 비용 / 매장당 비용 트렌드

OpenAI 인사이트: 컨텍스트(브랜드/월/계정/코멘트) 기반 자동 해석

3) 시스템 아키텍처

Frontend: Next.js 14 App Router, Tailwind CSS, shadcn/ui, Recharts

Backend: Next.js API Routes(/api/*)

/api/data: 전처리 산출물(JSON) 서빙

/api/insights: OpenAI 호출(서버사이드)

ETL 파이프라인

Snowflake Export: 월 1회/주 1회/일 1회(옵션) CSV 덤프

Python 전처리: 비용 매핑, 인원/매장수 Merge, 메트릭 파생, 캐시 JSON 생성

배포 산출물: /public/data/{brand}/yyyymm.json 또는 Object Storage

4) 데이터 파이프라인 상세
4.1 Snowflake → CSV Export
4.2 Python 전처리 (pandas)
) KPI/메트릭 정의

총비용: 선택 필터(공통비 제외 여부) 반영 집계액

매출대비 비용률(%) = cost_amt / sale_amt * 100

인당 비용(백만원) = cost_amt / headcount / 1e6

매장당 비용(백만원) = cost_amt / store_cnt / 1e6

YOY(%) = (올해 - 전년) / 전년 * 100

누적(YTD): 당해 1월~선택월

주: 분모가 0/결측인 경우 표시 로직(“-”, 회색 처리) 및 툴팁 안내.

6) UX 플로우 / 페이지 구성
6.1 랜딩 (브랜드 선택)

컴포넌트: BrandSelector (shadcn Card, Button, Select)

액션: 브랜드 클릭 → /brand/[code]

6.2 브랜드 대시보드 /brand/[code]

상단 KPI 카드: 총비용, 비용률, 인당/매장당 비용 (전년 대비 화살표/색상)

섹션 A: 월별 YOY 트렌드 (Bar + Line, Recharts)

섹션 B: 비용 비중 Treemap (대분류) & 클릭 Drill-down(소분류 TopN)

섹션 C: 대분류 YOY 비교 (당월/누적 토글, 가로 Bar)

섹션 D: 코스트센터 분석 — 부서 vs 매장 → CCTR TopN → CCTR 내 대분류

섹션 E: 효율성 지표(비용률/인당/매장당) 라인 트렌드

우상단: 기간/필터(브랜드 하위, CCTR 타입, 계정대분류, 공통비 제외 토글)

우하단: AI 인사이트 패널(요약/리스크/액션, 재생성 버튼)

레이아웃/인터랙션은 업로드 예시의 패턴을 준수 (카드형, 툴팁, 드릴다운, 돌아가기). 

mlb_dashboard_dynamic

7) 컴포넌트 목록

BrandSelector, KpiCard, YoYTrendChart, TreemapCategory, CategoryDrilldownBar,

CatYoYCompare, CctrTypeSplit, CctrTopN, CctrCatBreakdown,

EfficiencyTrends, FilterBar, AiInsightsPanel, Loader, ErrorState
