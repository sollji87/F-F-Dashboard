# AI 인사이트 생성 가이드

## 📌 개요

AI 인사이트는 **로컬에서 미리 생성**하여 CSV 파일로 저장하고, **Vercel 배포 시 CSV를 읽어서 표시**합니다.

이렇게 하면:
- ✅ Vercel에 OpenAI API 키를 설정할 필요 없음
- ✅ API 비용 절감 (배포 환경에서 API 호출 안 함)
- ✅ 빠른 응답 속도 (파일만 읽으면 되니까)
- ✅ 오프라인에서도 인사이트 확인 가능

---

## 🚀 사용 방법

### 1️⃣ 로컬에서 AI 인사이트 생성

#### 사전 준비
1. `.env.local` 파일에 OpenAI API 키 설정
```env
OPENAI_API_KEY=your-openai-api-key-here
```

2. 개발 서버 실행 (데이터 API가 필요하므로)
```bash
npm run dev
```

#### 인사이트 생성
새 터미널을 열고:
```bash
npm run generate-insights
```

이 명령은:
- 모든 브랜드 (MLB, MLB_KIDS, DISCOVERY, DUVETICA, SERGIO_TACCHINI)
- 모든 월 (202501 ~ 202510)
- 총 50개의 AI 인사이트를 생성합니다

생성 과정:
```
🚀 AI 인사이트 생성 시작...

📊 처리 중: MLB - 202501
🤖 AI 분석 중 [MLB 202501]...
✅ AI 분석 완료 [MLB 202501]
💾 CSV 저장 완료: public/data/ai_insights/insights_MLB_202501.csv

📊 처리 중: MLB - 202502
...

🎉 AI 인사이트 생성 완료!
✅ 성공: 50건
❌ 실패: 0건

📁 저장 위치: public/data/ai_insights/
```

---

### 2️⃣ 생성된 파일 확인

```
public/data/ai_insights/
├── insights_MLB_202501.csv
├── insights_MLB_202502.csv
├── insights_MLB_202503.csv
...
├── insights_SERGIO_TACCHINI_202509.csv
└── insights_SERGIO_TACCHINI_202510.csv
```

각 CSV 파일 형식:
```csv
field,value
summary,"전체 요약 내용"
key_findings,"발견사항1|발견사항2|발견사항3"
risks,"리스크1|리스크2"
action_items,"액션1|액션2|액션3"
```

---

### 3️⃣ Git에 커밋 & 배포

```bash
git add public/data/ai_insights/
git commit -m "feat: Add AI insights CSV files"
git push origin main
```

Vercel이 자동으로 배포하고, 배포된 사이트에서 AI 인사이트를 볼 수 있습니다!

---

## 🔄 업데이트 프로세스

새로운 월의 데이터가 추가되었을 때:

1. **Snowflake 데이터 업데이트**
   ```bash
   # 개발 서버 실행
   npm run dev
   
   # Snowflake 데이터 내보내기
   http://localhost:3000/test-snowflake 접속 후 "Export" 버튼 클릭
   ```

2. **AI 인사이트 재생성**
   ```bash
   npm run generate-insights
   ```

3. **Git 커밋 & 배포**
   ```bash
   git add public/data/
   git commit -m "chore: Update data and AI insights"
   git push origin main
   ```

---

## 📝 주의사항

- **개발 서버 실행 필수**: 인사이트 생성 스크립트는 로컬 API를 호출하므로 `npm run dev`가 실행 중이어야 합니다.
- **API 비용**: OpenAI API는 유료이므로, 필요한 브랜드/월만 선택적으로 생성하려면 스크립트를 수정하세요.
- **생성 시간**: 약 1분당 50-60건 생성 (API 호출 제한 고려)
- **오류 처리**: 일부 브랜드/월에 데이터가 없으면 자동으로 스킵됩니다.

---

## 🛠️ 커스터마이징

특정 브랜드/월만 생성하려면 `scripts/generate-ai-insights.js` 수정:

```javascript
// 특정 브랜드만
const BRANDS = ['MLB', 'MLB_KIDS'];

// 특정 월만
const MONTHS = ['202509', '202510'];
```

---

## ❓ 문제 해결

### Q: "데이터 로드 실패" 에러
A: 개발 서버(`npm run dev`)가 실행 중인지 확인하세요.

### Q: "OPENAI_API_KEY not set" 에러
A: `.env.local` 파일에 API 키가 설정되어 있는지 확인하세요.

### Q: 배포 후 인사이트가 안 보여요
A: 
1. `public/data/ai_insights/` 폴더가 Git에 커밋되었는지 확인
2. Vercel 배포 로그에서 파일이 포함되었는지 확인
3. 브라우저 개발자 도구에서 API 응답 확인

---

## 📊 비용 예상

OpenAI GPT-4o-mini 기준:
- 1건당 약 $0.001 ~ $0.002
- 50건 (5개 브랜드 × 10개월) = 약 $0.05 ~ $0.10

매달 업데이트 시: 연간 약 $0.60 ~ $1.20

