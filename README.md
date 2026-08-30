# 바다숲 키트

성게 패각 생태 블록에 해조류 포자를 붙인 바다 식목 키트를 소개하고, 주문·추천 해역 확인·이식 인증까지 체험할 수 있는 로컬 MVP입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 첫 요청 시 `data/ocean-forest.db`가 생성되고 시연 데이터가 자동으로 추가됩니다.

## 시연 계정

- 사용자: `user@ocean.local` / `ocean2026!`
- 관리자: `admin@ocean.local` / `ocean2026!`

## 검증

```bash
npm run typecheck
npm run build
```

현재 버전은 SQLite 로컬 백엔드, 이메일 세션 로그인, 테스트 결제를 사용합니다. 실제 운영 전에는 OAuth, PG 결제, 운영용 비밀키와 데이터베이스로 교체해야 합니다.

`public/images`의 제품·해역 이미지는 서비스 디자인 시연을 위해 생성된 AI 이미지이며 실제 상품 또는 특정 해역의 현장 사진이 아닙니다.
