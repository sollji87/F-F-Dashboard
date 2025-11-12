# 🎨 대시보드 컬러 가이드

F&F 브랜드 대시보드에서 사용하는 모든 컬러 코드를 정리한 문서입니다.

---

## 📌 브랜드 컬러

각 브랜드의 고유 색상입니다. 브랜드 카드, 헤더, 강조 요소에 사용됩니다.

```javascript
export const BRAND_INFO = {
  MLB: { 
    code: 'MLB', 
    name: 'MLB', 
    color: '#002D72'  // 네이비 블루
  },
  MLB_KIDS: { 
    code: 'MLB_KIDS', 
    name: 'MLB KIDS', 
    color: '#E31937'  // 레드
  },
  DISCOVERY: { 
    code: 'DISCOVERY', 
    name: 'DISCOVERY', 
    color: '#00A651'  // 그린
  },
  DUVETICA: { 
    code: 'DUVETICA', 
    name: 'DUVETICA', 
    color: '#000000'  // 블랙
  },
  SERGIO_TACCHINI: { 
    code: 'SERGIO_TACCHINI', 
    name: 'SERGIO TACCHINI', 
    color: '#0066CC'  // 블루
  },
};
```

---

## 📊 차트 컬러 (카테고리별)

비용 카테고리별로 사용하는 파스텔톤 색상입니다. 월별 추이 차트, 스택 바 차트 등에 사용됩니다.

```javascript
const CATEGORY_COLORS = {
  '인건비': '#93C5FD',           // 파스텔 블루
  '광고선전비': '#FCA5A5',       // 파스텔 레드
  '지급수수료': '#86EFAC',       // 파스텔 그린
  '자가임차료': '#FCD34D',       // 파스텔 옐로우
  'VMD': '#C4B5FD',              // 파스텔 퍼플
  'VMD/ 매장보수대': '#C4B5FD',  // 파스텔 퍼플
  '샘플대': '#F9A8D4',           // 파스텔 핑크
  '샘플대(제작/구입)': '#F9A8D4', // 파스텔 핑크
  '기타영업비': '#D1D5DB',       // 파스텔 그레이
  '공통비': '#E5E7EB',           // 연한 그레이
};
```

### 드릴다운 차트용 파스텔 컬러 팔레트

```javascript
const PASTEL_COLORS = [
  '#93C5FD',  // 파스텔 블루
  '#FCA5A5',  // 파스텔 레드
  '#86EFAC',  // 파스텔 그린
  '#FCD34D',  // 파스텔 옐로우
  '#C4B5FD',  // 파스텔 퍼플
  '#F9A8D4',  // 파스텔 핑크
  '#A5F3FC',  // 파스텔 시안
  '#FDE68A',  // 파스텔 골드
  '#D8B4FE',  // 파스텔 라벤더
  '#FDA4AF',  // 파스텔 로즈
];
```

---

## 🎯 상태 표시 컬러

YOY, 증감률 등 상태를 나타내는 색상입니다.

### YOY 증감률

```javascript
// 증가 (나쁨)
'text-red-600 dark:text-red-400'      // YOY >= 100%
'text-orange-600 dark:text-orange-400' // YOY >= 50%

// 감소 (좋음)
'text-green-600 dark:text-green-400'   // YOY >= 0%
'text-blue-600 dark:text-blue-400'     // YOY < 0% 또는 신규

// 신규 항목
'text-blue-600'  // "신규" 표시
```

### 차이 금액

```javascript
// 증가
'text-red-600'    // 차이 >= 0

// 감소
'text-green-600'  // 차이 < 0
```

---

## 🌓 다크모드 테마 컬러

Tailwind CSS 기반 다크모드 색상 시스템입니다.

### 라이트 모드

```css
:root {
  --background: oklch(1 0 0);           /* 흰색 배경 */
  --foreground: oklch(0.145 0 0);       /* 검은색 텍스트 */
  --card: oklch(1 0 0);                 /* 흰색 카드 */
  --card-foreground: oklch(0.145 0 0);  /* 검은색 카드 텍스트 */
  --primary: oklch(0.205 0 0);          /* 진한 회색 */
  --primary-foreground: oklch(0.985 0 0); /* 밝은 회색 */
  --border: oklch(0.922 0 0);           /* 연한 회색 테두리 */
  --muted: oklch(0.97 0 0);             /* 뮤트 배경 */
  --muted-foreground: oklch(0.556 0 0); /* 뮤트 텍스트 */
}
```

### 다크 모드

```css
.dark {
  --background: oklch(0.145 0 0);       /* 검은색 배경 */
  --foreground: oklch(0.985 0 0);       /* 흰색 텍스트 */
  --card: oklch(0.205 0 0);             /* 진한 회색 카드 */
  --card-foreground: oklch(0.985 0 0);  /* 흰색 카드 텍스트 */
  --primary: oklch(0.985 0 0);          /* 밝은 회색 */
  --primary-foreground: oklch(0.205 0 0); /* 진한 회색 */
  --border: oklch(0.27 0 0);            /* 진한 회색 테두리 */
  --muted: oklch(0.27 0 0);             /* 뮤트 배경 */
  --muted-foreground: oklch(0.708 0 0); /* 뮤트 텍스트 */
}
```

---

## 🎨 Tailwind CSS 유틸리티 클래스

자주 사용하는 색상 조합입니다.

### 배경색

```css
/* 라이트 모드 */
bg-white          /* 흰색 */
bg-zinc-50        /* 매우 연한 회색 */
bg-zinc-100       /* 연한 회색 */

/* 다크 모드 */
dark:bg-zinc-800  /* 진한 회색 */
dark:bg-zinc-900  /* 매우 진한 회색 */
dark:bg-zinc-950  /* 거의 검은색 */
```

### 텍스트 색상

```css
/* 주요 텍스트 */
text-zinc-900 dark:text-zinc-50    /* 검은색/흰색 */

/* 보조 텍스트 */
text-zinc-600 dark:text-zinc-400   /* 중간 회색 */
text-zinc-500 dark:text-zinc-400   /* 연한 회색 */

/* 강조 텍스트 */
text-blue-600 dark:text-blue-400   /* 파란색 */
text-red-600 dark:text-red-400     /* 빨간색 */
text-green-600 dark:text-green-400 /* 초록색 */
```

### 테두리 색상

```css
border-zinc-200 dark:border-zinc-700  /* 기본 테두리 */
border-zinc-300 dark:border-zinc-600  /* 진한 테두리 */
```

### 호버 효과

```css
hover:bg-zinc-50 dark:hover:bg-zinc-800     /* 배경 호버 */
hover:text-zinc-900 dark:hover:text-zinc-200 /* 텍스트 호버 */
```

---

## 📈 차트 라이브러리 색상 (Recharts)

### Line Chart

```javascript
<Line 
  stroke="#8b5cf6"      // 보라색
  strokeWidth={2}
  dot={{ fill: '#8b5cf6', r: 4 }}
/>
```

### Bar Chart

```javascript
<Bar 
  fill="#8b5cf6"        // 보라색
  radius={[8, 8, 0, 0]} // 상단 모서리 둥글게
/>
```

### Pie Chart

```javascript
const COLORS = [
  '#8b5cf6',  // 보라
  '#ec4899',  // 핑크
  '#f59e0b',  // 주황
  '#10b981',  // 초록
  '#3b82f6',  // 파랑
  '#f97316',  // 주황-빨강
  '#06b6d4',  // 청록
  '#84cc16',  // 연두
];
```

---

## 💡 사용 예시

### 브랜드 헤더

```jsx
<div style={{ backgroundColor: brandColor }}>
  <h1 className="text-white">{brandName}</h1>
</div>
```

### 카테고리별 차트

```jsx
{Object.entries(CATEGORY_COLORS).map(([category, color]) => (
  <Bar key={category} dataKey={category} fill={color} />
))}
```

### YOY 표시

```jsx
<span className={yoy >= 100 ? 'text-red-600' : 'text-green-600'}>
  {yoy}%
</span>
```

### 신규 항목

```jsx
<span className="text-blue-600">신규</span>
```

---

## 📝 참고사항

1. **일관성**: 같은 의미의 요소는 항상 같은 색상을 사용하세요.
2. **접근성**: 텍스트와 배경의 명암비는 최소 4.5:1을 유지하세요.
3. **다크모드**: 모든 색상은 라이트/다크 모드 모두 고려하여 사용하세요.
4. **브랜드 컬러**: 브랜드 고유 색상은 변경하지 마세요.
5. **파스텔톤**: 차트에는 부드러운 파스텔톤을 사용하여 가독성을 높이세요.

---

## 🔗 관련 파일

- `lib/types.js` - 브랜드 정보 및 색상 정의
- `components/dashboard/charts/YoYTrendChart.jsx` - 카테고리 색상 정의
- `app/globals.css` - 전역 테마 색상
- `tailwind.config.js` - Tailwind 색상 설정

---

**작성일**: 2025년 1월  
**버전**: 1.0  
**작성자**: F&F Dashboard Team

