import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminPassword = process.env.ADMIN_TEST_PASSWORD;
if (!adminPassword) throw new Error("ADMIN_TEST_PASSWORD is required for the emulator E2E suite.");
const firebaseProjectId = process.env.TEST_FIREBASE_PROJECT_ID ?? "demo-sea-forest-kit";

let created: { orderNumber: string; lookupCode: string; totalPrice: number };

test.describe.configure({ mode: "serial" });

test("operational cleanup remains bounded to 100 documents per collection", () => {
  const storeSource = readFileSync(join(process.cwd(), "src/lib/firestore-store.ts"), "utf8");
  expect(storeSource).toContain("const cleanupMaximumPerCollection = 100;");
  expect(storeSource).toContain("limit(cleanupMaximumPerCollection)");
  expect(storeSource).toContain("const collections = [rateLimits, adminSessionRevocations, idempotencyRequests];");
  expect(storeSource).toContain("cleanupExpiredCollections([rateLimits], 1)");
  expect(storeSource).toContain("cleanupExpiredCollections([idempotencyRequests], 1)");
  expect(storeSource).not.toContain("products.limit(1)");
  expect(storeSource).toContain("const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));");
  expect(storeSource).toContain("if (!snapshot.exists) transaction.create(references[index]");
});

test("checkout persists an idempotency key before a failed request and reuses it after reload", async ({ page }) => {
  await page.route("**/api/orders", async (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "temporary" }) }));
  await page.goto("/checkout?product=1");
  await page.getByLabel("받는 분").fill("재시도 고객");
  await page.getByLabel("연락처").fill("010-9999-9999");
  await page.getByLabel("배송지").fill("서울특별시 재시도길 1");
  await page.getByLabel("수량").fill("1");
  await page.getByRole("button", { name: "테스트 결제 완료하기" }).click();
  const first = await page.evaluate(() => sessionStorage.getItem("sea-forest-pending-order"));
  await page.reload();
  const second = await page.evaluate(() => sessionStorage.getItem("sea-forest-pending-order"));
  expect(first).toBeTruthy();
  expect(second).toBe(first);
});

test("Firestore rules deny direct client reads and writes", async ({ request }) => {
  const endpoint = `http://127.0.0.1:8080/v1/projects/${firebaseProjectId}/databases/(default)/documents/products`;
  const read = await request.get(endpoint);
  const write = await request.patch(`${endpoint}/unauthorized-direct-write`, { data: { fields: { name: { stringValue: "unauthorized" } } } });
  expect(read.status()).toBe(403);
  expect(write.status()).toBe(403);
});

test("a guest can order once, then lookup rejects a wrong code and accepts the issued code", async ({ page }) => {
  const requestUrls: string[] = [];
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.goto("/checkout?product=1");
  await page.getByLabel("받는 분").fill("테스트 고객");
  await page.getByLabel("연락처").fill("010-1234-5678");
  await page.getByLabel("배송지").fill("서울특별시 중구 바다숲길 12 101호");
  await page.getByLabel("수량").fill("1");
  await page.getByRole("button", { name: "테스트 결제 완료하기" }).click();
  await expect(page.getByTestId("order-created")).toBeVisible();
  created = {
    orderNumber: await page.getByTestId("order-number").textContent() ?? "",
    lookupCode: await page.getByTestId("lookup-code").textContent() ?? "",
    totalPrice: 39_000,
  };
  expect(created.orderNumber).toMatch(/^SF-\d{8}-[A-F0-9]{16}$/);
  expect(created.lookupCode).not.toEqual("");
  await page.getByLabel("조회 코드").fill("WRONG-CODE");
  await page.getByRole("button", { name: "주문 조회하기" }).click();
  await expect(page.getByRole("alert")).toHaveText("주문 번호 또는 조회 코드가 맞지 않습니다.");
  await page.getByLabel("조회 코드").fill(created.lookupCode);
  await page.getByRole("button", { name: "주문 조회하기" }).click();
  await expect(page.getByTestId("order-result")).toContainText("결제완료");
  await expect(page.getByTestId("order-result")).toContainText("다시마 숲 시작 키트");
  expect(requestUrls.some((url) => url.includes(created.lookupCode))).toBe(false);
  expect(requestUrls.some((url) => url.includes("/api/orders/lookup"))).toBe(true);
});

test("an unauthenticated request cannot read admin orders", async ({ request }) => {
  const response = await request.get("/api/admin");
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/api/orders")).status()).toBe(405);
});

test("admin can see the order and update price and delivery status without changing the order snapshot", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("관리자 비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(created.orderNumber)).toBeVisible();

  const price = page.getByLabel("다시마 숲 시작 키트 가격");
  await price.fill("41000");
  await price.blur();
  await expect(page.getByRole("status")).toHaveText("저장했습니다.");
  await page.goto("/products");
  await expect(page.getByText("41,000원").first()).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel(`주문 ${created.orderNumber} 상태`).selectOption("배송중");
  await expect(page.getByRole("status")).toHaveText("저장했습니다.");
  await page.goto("/orders");
  await page.getByLabel("주문 번호").fill(created.orderNumber);
  await page.getByLabel("조회 코드").fill(created.lookupCode);
  await page.getByRole("button", { name: "주문 조회하기" }).click();
  await expect(page.getByTestId("order-result")).toContainText("배송중");
  await expect(page.getByTestId("order-result")).toContainText(created.totalPrice.toLocaleString());

  await page.goto("/admin");
  const invalidPatch = await page.evaluate(async () => fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "price", id: 1, value: 1.5 }) }).then((response) => response.status));
  const extraPatch = await page.evaluate(async () => fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "status", orderNumber: created.orderNumber, value: "배송중", totalPrice: 1 }) }).then((response) => response.status));
  const invalidMethod = await page.evaluate(async () => fetch("/api/admin", { method: "DELETE" }).then((response) => response.status));
  expect(invalidPatch).toBe(400);
  expect(extraPatch).toBe(400);
  expect(invalidMethod).toBe(405);
});

test("order writes are idempotent and stock decrements atomically", async ({ page }) => {
  await page.goto("/admin");
  const outcomes = await page.evaluate(async () => {
    const mutation = (body: unknown) => fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await mutation({ type: "stock", id: 3, value: 1 });
    const payload = { productId: 3, quantity: 1, recipient: "경합 고객", phone: "010-5555-5555", address: "서울특별시 성동구 바다길 1" };
    return Promise.all(["AAAAAAAAAAAAAAAA", "BBBBBBBBBBBBBBBB"].map((idempotencyKey) => fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) }).then((response) => response.status)));
  });
  expect(outcomes.sort()).toEqual([400, 201]);

  const idempotency = await page.evaluate(async () => {
    const mutation = (body: unknown) => fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await mutation({ type: "stock", id: 2, value: 2 });
    const key = "CCCCCCCCCCCCCCCC";
    const payload = { productId: 2, quantity: 1, recipient: "재시도 고객", phone: "010-6666-6666", address: "서울특별시 마포구 바다길 2" };
    const first = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(payload) });
    const firstBody = await first.json() as { order?: { lookupCode?: string } };
    const second = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(payload) });
    const secondBody = await second.json() as { order?: { lookupCode?: string } };
    const products = await fetch("/api/products", { cache: "no-store" }).then((response) => response.json()) as Array<{ id: number; stock: number }>;
    return { statuses: [first.status, second.status], lookupCodes: [firstBody.order?.lookupCode, secondBody.order?.lookupCode], stock: products.find((product) => product.id === 2)?.stock };
  });
  expect(idempotency.statuses).toEqual([201, 200]);
  expect(idempotency.lookupCodes[0]).toMatch(/^[A-F0-9]{6}(?:-[A-F0-9]{6}){3}$/);
  expect(idempotency.lookupCodes[1]).toBe(idempotency.lookupCodes[0]);
  expect(idempotency.stock).toBe(1);
});

test("admin logout revokes a replayed prior admin cookie", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("관리자 비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const priorCookie = (await page.context().cookies()).find((cookie) => cookie.name === "sea_forest_admin");
  expect(priorCookie).toBeDefined();

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.context().addCookies([priorCookie!]);
  const status = await page.evaluate(async () => fetch("/api/admin", { cache: "no-store" }).then((response) => response.status));
  expect(status).toBe(403);
});

test("wrong administrator password is rate limited after five attempts", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/admin/login");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel("관리자 비밀번호").fill("not-the-password");
    await page.getByRole("button", { name: "관리자 로그인" }).click();
    await expect(page.getByRole("alert")).toHaveText("비밀번호를 확인해 주세요.");
  }
  await page.getByRole("button", { name: "관리자 로그인" }).click();
  await expect(page.getByRole("alert")).toContainText("로그인 시도가 너무 많습니다");
});

test("cross-origin guest, lookup, and administrator mutations are rejected", async ({ request }) => {
  const crossOriginHeaders = { Origin: "https://outside.example", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" };
  const order = await request.post("/api/orders", { headers: { ...crossOriginHeaders, "Idempotency-Key": "CROSSORIGINKEY01" }, data: { productId: 1, quantity: 1, recipient: "외부 요청", phone: "010-0000-0000", address: "서울시 외부길 1" } });
  const lookup = await request.post("/api/orders/lookup", { headers: crossOriginHeaders, data: { orderNumber: "SF-20260831-0000000000000000", lookupCode: "AAAAAA-BBBBBB-CCCCCC-DDDDDD" } });
  const admin = await request.post("/api/admin-login", { headers: crossOriginHeaders, data: { password: "wrong" } });
  expect(order.status()).toBe(403);
  expect(lookup.status()).toBe(403);
  expect(admin.status()).toBe(403);
});

test("guest order creation is rate limited", async ({ request }) => {
  const headers = { Origin: "http://127.0.0.1:3100", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.42" };
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const response = await request.post("/api/orders", { headers: { ...headers, "Idempotency-Key": `RATELIMITKEY${String(attempt).padStart(4, "0")}` }, data: { productId: 999_999_999, quantity: 1, recipient: "제한 테스트", phone: "010-7777-7777", address: "서울특별시 제한길 1" } });
    statuses.push(response.status());
  }
  expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
  expect(statuses[10]).toBe(429);
});

test("guest orders reject client-provided price, total, and status fields", async ({ request }) => {
  const headers = { Origin: "http://127.0.0.1:3100", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", "Idempotency-Key": "EXTRAFIELDSORDER1", "X-Forwarded-For": "198.51.100.43" };
  const response = await request.post("/api/orders", { headers, data: { productId: 1, quantity: 1, recipient: "추가 필드", phone: "010-8888-8888", address: "서울특별시 검증길 1", price: 1, totalPrice: 1, status: "배송완료" } });
  expect(response.status()).toBe(400);
});

test("mobile checkout, lookup, and admin login have no horizontal overflow or console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/checkout?product=1", "/orders", "/admin/login"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
  expect(errors).toEqual([]);
});
