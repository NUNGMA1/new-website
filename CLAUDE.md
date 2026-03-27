# 규칙

- 항상 한국어로 답변해
- 코드 수정 전에 계획을 먼저 알려줘
- 파일을 삭제할 때는 반드시 먼저 확인해줘

---

# 프로젝트 개요

**카니보어(Carnivore)** - 한국어 기반 육식 식단 기록 및 소셜 공유 웹 애플리케이션

- 사용자별 식단(아침/점심/저녁) 기록
- 연속 기록 스트릭(streak) 추적
- 전체 유저 피드 조회
- 모달 기반 2단계 로그인 → 식단 입력 플로우

---

# 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | 순수 HTML5 + Vanilla JavaScript (ES6+) + CSS3 |
| 백엔드/DB | [Supabase](https://supabase.com) (PostgreSQL) |
| 외부 라이브러리 | Supabase JS SDK v2 (CDN), Google Fonts (Noto Sans KR) |
| 빌드 도구 | 없음 (빌드 불필요) |
| 패키지 매니저 | 없음 |
| 테스트 프레임워크 | 없음 |

---

# 디렉토리 구조

```
new-website/
├── index.html   # HTML 마크업 (100줄) - 헤더, 히어로, 피드, 모달
├── style.css    # 스타일 (471줄) - 다크 테마, CSS 변수, 반응형
├── app.js       # 애플리케이션 로직 (394줄) - 인증, DB, UI
└── CLAUDE.md    # 이 파일
```

---

# 핵심 파일 설명

## index.html
- 단일 HTML 파일 SPA 구조
- 주요 섹션: `#header`, `#hero`, `#feed`, `#modal`
- 모달 내 `.step-1`(로그인), `.step-2`(식단 입력) 구조

## style.css
- CSS 변수로 색상 테마 관리 (`:root` 선언부 참조)
- 주요 색상: 다크 배경 계열 + 앰버 포인트 + 레드 CTA
- 글래스모피즘 효과 (`backdrop-filter: blur`)
- 미디어 쿼리: `@media (max-width: 600px)` 모바일 대응

## app.js
- **Supabase 설정** (29~30줄): `SUPABASE_URL`, `SUPABASE_KEY` 하드코딩
- **인증**: SHA-256 클라이언트 해싱 → `users` 테이블 조회
- **세션**: `localStorage`에 로그인 상태 저장
- **식단 저장**: `meals` 테이블 upsert (날짜 기준)
- **스트릭 계산**: 연속 날짜 체인 알고리즘
- **피드 렌더링**: 날짜별 그룹핑 후 카드 생성

---

# 데이터베이스 스키마 (Supabase)

```
users
  id          uuid (PK)
  username    text
  password_hash text (SHA-256)

meals
  id          uuid (PK)
  user_id     uuid (FK → users.id)
  date        date
  breakfast   text[]   (태그 배열)
  lunch       text[]
  dinner      text[]
  memo        text
```

---

# 개발 워크플로우

## 로컬 실행
빌드 불필요 - 파일을 직접 브라우저에서 열거나 간단한 정적 서버 사용:
```bash
# Python 정적 서버 예시
python3 -m http.server 8000
# 또는 npx serve .
```

## 코드 수정 시 주의사항
1. **JavaScript**: `app.js`는 단일 파일 - 함수 순서와 의존성 주의
2. **CSS**: CSS 변수(`:root`)를 변경하면 전체 테마에 영향
3. **HTML**: 모달 `.step-1`/`.step-2` ID 변경 시 `app.js`도 함께 수정
4. **Supabase 쿼리**: upsert/select 시 RLS(Row Level Security) 정책 확인 필요

## 브랜치 전략
- 현재 작업 브랜치: `claude/add-claude-documentation-B4wfU`
- 메인 브랜치: `main` (또는 `master`)

---

# 보안 주의사항

- `app.js`에 Supabase URL과 anon key가 하드코딩되어 있음
- anon key는 클라이언트 공개용이지만, 환경 변수로 관리하는 것을 권장
- 비밀번호는 SHA-256으로 클라이언트 해싱 후 저장 (서버 측 해싱 없음)
- Supabase RLS 정책으로 데이터 접근 제어 필요

---

# 코드 컨벤션

- 변수/함수명: camelCase (영어)
- UI 텍스트: 한국어
- 주석: 없음 (코드 자체가 단순하여 주석 최소화)
- DOM 조작: `querySelector` / `querySelectorAll` 사용
- 이벤트: `addEventListener` 직접 바인딩

---

# 배포

정적 파일 그대로 배포 가능 (GitHub Pages, Netlify, Vercel, S3 등):
```
index.html + style.css + app.js
```
빌드 스텝 없음.
