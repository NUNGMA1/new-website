# 규칙

- 항상 한국어로 답변해
- 코드 수정 전에 계획을 먼저 알려줘
- 파일을 삭제할 때는 반드시 먼저 확인해줘

# 앱 소개

카니보어 식단 기록 앱. 사용자가 매일 아침/점심/저녁 식단을 기록하고 다른 사람들의 식단을 피드 형식으로 볼 수 있는 웹앱.

## 기술 스택

- 프론트엔드: 순수 HTML/CSS/JS (프레임워크 없음)
- 백엔드: Supabase (PostgreSQL)
- 파일 구조: `index.html`, `style.css`, `app.js`

## DB 테이블

- `users`: username, password_hash
- `meals`: username, date, breakfast, lunch, dinner, note, created_at

## 주요 기능

- 아이디/비밀번호로 로그인 (없으면 자동 계정 생성)
- 아침/점심/저녁 태그 형식으로 식단 입력
- 한줄 메모 입력 가능
- 오늘 식단 기준 피드 표시 (날짜별 그룹핑)
- 연속 기록 스트릭 표시 (🔥 N일 연속)
