# 바다숲 키트

성게 패각 생태 블록에 해조류 포자를 붙인 바다 식목 키트를 소개하고, 비회원 주문·추천 해역 확인·이식 인증까지 체험할 수 있는 MVP입니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
# Set ADMIN_PASSWORD_HASH to a bcrypt hash and ADMIN_SESSION_SECRET to a random 32+ character secret.
npx firebase emulators:start --only firestore
# In a second terminal:
npm run dev
```

Firebase Emulator Suite가 실행 중인 상태에서 `http://localhost:3000`을 엽니다. 처음 상품 또는 주문 요청을 하면 Firestore의 `products` 컬렉션에 시연용 카탈로그가 추가됩니다. 해역·이식 인증·기존 일반 로그인 기능은 기존 SQLite 로컬 저장소를 유지합니다.

## Firebase와 관리자 설정

관리자 로그인 주소는 `/admin/login`입니다. 관리자 평문 비밀번호는 코드나 저장소에 넣지 말고, bcrypt 해시만 무시되는 `.env.local`의 `ADMIN_PASSWORD_HASH`에 설정하세요. `.env.local`에 bcrypt 해시를 직접 넣을 때는 dotenv 확장을 막기 위해 각 `$`를 `\$`로 이스케이프하고, 호스팅 환경변수 UI에는 원래 해시를 그대로 입력합니다. `ADMIN_SESSION_SECRET`과 `ORDER_LOOKUP_SECRET`은 각각 32자 이상이어야 합니다. 전자는 HttpOnly·SameSite=Strict 관리자 세션 쿠키, 후자는 동일 멱등성 키 재시도 시 조회 코드를 결정적으로 복구하는 HMAC에 사용됩니다.

서버는 Firebase Admin SDK와 Application Default Credentials(ADC)를 사용합니다. Firestore 보안 규칙은 클라이언트 읽기·쓰기를 모두 차단합니다. 개발·테스트는 `FIRESTORE_EMULATOR_HOST` 없이는 실패하며, 라이브 Firestore 테스트는 `ALLOW_LIVE_FIRESTORE=true`를 명시한 별도 운영 절차에서만 허용합니다. `TRUST_PROXY=1`은 플랫폼이 신뢰할 수 있는 원본 IP 헤더를 보장하는 환경에서만 설정하세요. 로컬·직접 노출 서버에서는 기본값 `false`를 유지합니다. 프로덕션에서는 에뮬레이터 호스트, 다른 프로젝트 ID, ADC, 관리자 환경 변수가 누락되면 요청이 실패하도록 구성되어 있습니다.

운영 Firestore에는 공개 GET/주문 요청으로 시연 상품을 자동 생성하지 않습니다. 에뮬레이터에서는 시연 카탈로그가 자동 생성되며, 운영 시드는 별도 통제 절차에서 `FIREBASE_ALLOW_SEED=true`를 명시하고 인증된 `POST /api/admin/seed`로만 수행해야 합니다.

청구가 비활성화되어 있으므로 관리형 Firestore TTL은 사용하지 않습니다. 새 rate-limit 쓰기는 만료 `rate_limits` 문서를 최대 1건, 성공한 주문은 만료 `order_requests` 문서를 최대 1건, 세션 폐기 쓰기는 만료 `admin_session_revocations` 문서를 최대 1건 정리합니다. 성공한 관리자 로그인과 관리자 주문 조회는 세 컬렉션에서 각각 최대 100건씩 추가 정리를 수행합니다. `expiresAt` 필드는 이 무료 티어 정리 기준이며, 관리형 TTL은 나중에 청구가 명시적으로 승인·활성화된 경우에만 선택적으로 고려하세요. 주문 요청 키와 조회 코드 복구 기간은 24시간입니다. 관리자 로그아웃은 세션 nonce의 해시를 폐기 컬렉션에 기록합니다. `ADMIN_SESSION_SECRET` 회전은 즉시 모든 관리자 쿠키를 무효화합니다. `ORDER_LOOKUP_SECRET`은 24시간 멱등성 재시도 기간에는 회전하지 말고, 회전 계획과 보존 기간을 운영 절차에서 함께 관리하세요.

## 검증

```bash
npm run typecheck
npm run build
# ADMIN_TEST_PASSWORD is intentionally supplied only by the local/CI environment.
ADMIN_TEST_PASSWORD=your-local-admin-password npm test
```

`npm test`는 실제 프로젝트가 아닌 `demo-sea-forest-kit` Firestore Emulator와 Playwright를 함께 실행합니다. 테스트는 비회원 주문→POST 조회, 잘못된 조회 코드, URL 코드 비노출, 관리자 인증·제한, 주문·가격·상태 관리, Firestore rules 차단, 멱등 주문과 재고 경합을 검증합니다.

속도 제한은 무단 주문·조회 시도를 줄이는 보조 장치일 뿐입니다. 실제 결제 전에는 CAPTCHA/봇 방어와 결제 제공사의 위험·중복 결제 방지 기능을 별도로 적용하세요.

실제 결제·배포·라이브 Firestore 쓰기는 이 저장소의 로컬 개발 명령에 포함하지 않습니다.

`public/images`의 제품·해역 이미지는 서비스 디자인 시연을 위해 생성된 AI 이미지이며 실제 상품 또는 특정 해역의 현장 사진이 아닙니다.
