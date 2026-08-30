import "server-only";

import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { assertFirebaseServerReady, FirebaseConfigurationError, firestore } from "@/lib/firebase-admin";
import type { Product } from "@/lib/types";

const products = firestore.collection("products");
const orders = firestore.collection("orders");
const rateLimits = firestore.collection("rate_limits");
const idempotencyRequests = firestore.collection("order_requests");
const adminSessionRevocations = firestore.collection("admin_session_revocations");
const statuses = ["결제완료", "배송중", "배송완료", "취소"] as const;
export type OrderStatus = typeof statuses[number];

type StoredProduct = {
  id: number; name: string; description: string; price: number; stock: number;
  category: string; image: string; options?: string[]; reviews?: Product["reviews"];
};
type StoredOrder = {
  orderNumber: string; lookupCodeHash: string; recipient: string; phone: string; address: string;
  productId: number; productName: string; quantity: number; unitPrice: number; totalPrice: number;
  status: OrderStatus; createdAt: string;
};

export type GuestOrder = Pick<StoredOrder, "orderNumber" | "status" | "totalPrice"> & { lookupCode?: string };
export type OrderLookup = Pick<StoredOrder, "orderNumber" | "productName" | "quantity" | "totalPrice" | "status" | "createdAt">;
export type AdminOrder = Omit<StoredOrder, "lookupCodeHash">;

type StoredIdempotencyRequest = { fingerprint: string; orderNumber: string; status: OrderStatus; totalPrice: number; createdAt: string; expiresAt: Timestamp };
type StoredRateLimit = { count: number; resetAt: number; expiresAt: Timestamp };
const idempotencyWindowMs = 24 * 60 * 60 * 1000;
const cleanupMaximumPerCollection = 100;

const seeds: StoredProduct[] = [
  { id: 1, name: "다시마 숲 시작 키트", description: "성게 패각 생태 블록과 다시마 포자를 담은 첫 바다 식목 키트입니다.", price: 39000, stock: 18, category: "초보자", image: "/images/kit-kelp-start.png", options: ["기본 구성", "안내서 포함"], reviews: [{ id: 1, author: "바다를 사랑하는 구매자", rating: 5, content: "포장과 안내가 친절해서 첫 이식도 어렵지 않았어요." }] },
  { id: 2, name: "감태 회복 키트", description: "겨울 바다에 어울리는 감태 포자와 안내서를 함께 제공합니다.", price: 49000, stock: 12, category: "계절 추천", image: "/images/kit-gamtae-recovery.png", options: ["기본 구성", "안내서 포함"], reviews: [{ id: 2, author: "계절 바다 관찰자", rating: 5, content: "계절 안내를 함께 확인할 수 있어 준비하기 좋았습니다." }] },
  { id: 3, name: "해조류 관찰 키트", description: "이식 뒤 변화를 기록할 수 있는 관찰 노트가 포함된 키트입니다.", price: 32000, stock: 25, category: "관찰", image: "/images/kit-observation.png", options: ["기본 구성", "관찰 노트"], reviews: [{ id: 3, author: "바다숲 참여자", rating: 5, content: "기록을 남기며 변화를 살펴보기 좋았어요." }] },
];

function validInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function text(value: unknown, name: string, max: number) {
  if (typeof value !== "string") throw new Error(`${name}을(를) 입력해 주세요.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new Error(`${name}을(를) ${max}자 이내로 입력해 주세요.`);
  return trimmed;
}

function productFromData(data: StoredProduct): Product {
  return {
    id: data.id, name: data.name, description: data.description, price: data.price, stock: data.stock,
    category: data.category, image: data.image, options: data.options ?? ["기본 구성"], reviews: data.reviews ?? [],
  };
}

let seedDataPromise: Promise<void> | undefined;

function seedingIsAllowed(explicitAdminSeed: boolean) {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST) || (explicitAdminSeed && process.env.FIREBASE_ALLOW_SEED === "true");
}

export async function ensureProductSeedData(explicitAdminSeed = false) {
  await assertFirebaseServerReady();
  if (!seedingIsAllowed(explicitAdminSeed)) return;
  seedDataPromise ??= (async () => {
    await firestore.runTransaction(async (transaction) => {
      const references = seeds.map((seed) => products.doc(String(seed.id)));
      const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
      const now = new Date().toISOString();
      snapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) transaction.create(references[index], { ...seeds[index], createdAt: now, updatedAt: now });
      });
    });
  })();
  try { await seedDataPromise; } catch (error) { seedDataPromise = undefined; throw error; }
}

export async function seedProductsForAdmin() {
  if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_ALLOW_SEED !== "true") throw new FirebaseConfigurationError("FIREBASE_ALLOW_SEED=true is required for an explicit production seed.");
  await ensureProductSeedData(true);
}

export async function getProducts(query = "", category = "") {
  await ensureProductSeedData();
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const snapshot = await products.get();
  return snapshot.docs.map((document) => productFromData(document.data() as StoredProduct)).filter((product) => {
    const matchesQuery = !normalizedQuery || `${product.name} ${product.description}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
    return matchesQuery && (!category || product.category === category);
  }).sort((a, b) => a.id - b.id);
}

export async function getProduct(id: number) {
  await assertFirebaseServerReady();
  if (!validInteger(id, 1, Number.MAX_SAFE_INTEGER)) return null;
  await ensureProductSeedData();
  const snapshot = await products.doc(String(id)).get();
  return snapshot.exists ? productFromData(snapshot.data() as StoredProduct) : null;
}

function newOrderNumber() {
  return `SF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

function orderLookupSecret() {
  const secret = process.env.ORDER_LOOKUP_SECRET;
  if (!secret || secret.length < 32) throw new FirebaseConfigurationError("ORDER_LOOKUP_SECRET must be at least 32 characters.");
  return secret;
}

function lookupCodeFor(idempotencyKey: string) {
  const digest = createHmac("sha256", orderLookupSecret()).update(`sea-forest-order-lookup-v1:${idempotencyKey}`).digest("hex").slice(0, 24).toUpperCase();
  return digest.match(/.{1,6}/g)?.join("-") ?? digest;
}

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function consumeFirestoreAttempt(bucket: string, clientId: string, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  await assertFirebaseServerReady();
  try { await cleanupExpiredCollections([rateLimits], 1); } catch { /* A bounded cleanup failure does not disable rate limiting. */ }
  const reference = rateLimits.doc(hash(`${bucket}:${clientId}`));
  return firestore.runTransaction(async (transaction) => {
    const now = Date.now();
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists ? snapshot.data() as StoredRateLimit : null;
    if (!current || current.resetAt <= now) {
      transaction.set(reference, { count: 1, resetAt: now + windowMs, expiresAt: Timestamp.fromMillis(now + windowMs) });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= maxAttempts) return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
    transaction.update(reference, { count: current.count + 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

export async function clearFirestoreAttempts(bucket: string, clientId: string) {
  await rateLimits.doc(hash(`${bucket}:${clientId}`)).delete();
}

async function cleanupExpiredCollections(collections: ReturnType<typeof firestore.collection>[], maximumPerCollection: number) {
  const now = Timestamp.now();
  const deletedCounts = await Promise.all(collections.map(async (collection) => {
    const expired = await collection.where("expiresAt", "<=", now).orderBy("expiresAt", "asc").limit(maximumPerCollection).get();
    if (expired.empty) return 0;
    const batch = firestore.batch();
    expired.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    return expired.size;
  }));
  return deletedCounts.reduce((total, count) => total + count, 0);
}

export async function cleanupExpiredOperationalDocs() {
  await assertFirebaseServerReady();
  return cleanupExpiredCollections([rateLimits, adminSessionRevocations, idempotencyRequests], cleanupMaximumPerCollection);
}

export async function cleanupOneExpiredAdminSessionRevocation() {
  await assertFirebaseServerReady();
  return cleanupExpiredCollections([adminSessionRevocations], 1);
}

export async function createGuestOrder(input: { productId: unknown; quantity: unknown; recipient: unknown; phone: unknown; address: unknown; idempotencyKey: string }): Promise<GuestOrder & { duplicate: boolean }> {
  await assertFirebaseServerReady();
  await ensureProductSeedData();
  if (!validInteger(input.productId, 1, Number.MAX_SAFE_INTEGER)) throw new Error("상품을 다시 선택해 주세요.");
  if (!validInteger(input.quantity, 1, 99)) throw new Error("수량은 1개 이상 99개 이하의 정수여야 합니다.");
  const productId = input.productId;
  const quantity = input.quantity;
  const recipient = text(input.recipient, "받는 분", 80);
  const phone = text(input.phone, "연락처", 30);
  const address = text(input.address, "배송지", 240);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.idempotencyKey)) throw new Error("주문 요청 키를 다시 생성해 주세요.");
  const productReference = products.doc(String(productId));
  const lookupCode = lookupCodeFor(input.idempotencyKey);
  const lookupCodeHash = await bcrypt.hash(lookupCode, 12);
  const createdAt = new Date().toISOString();
  const idempotencyExpiresAt = Timestamp.fromMillis(Date.now() + idempotencyWindowMs);
  const fingerprint = hash(JSON.stringify({ productId, quantity, recipient, phone, address }));
  const idempotencyReference = idempotencyRequests.doc(hash(input.idempotencyKey));

  for (let numberAttempt = 0; numberAttempt < 3; numberAttempt += 1) {
    const orderNumber = newOrderNumber();
    try {
      const result = await firestore.runTransaction(async (transaction) => {
        const [existingRequest, productSnapshot, orderSnapshot] = await Promise.all([
          transaction.get(idempotencyReference), transaction.get(productReference), transaction.get(orders.doc(orderNumber)),
        ]);
        if (existingRequest.exists) {
          const existing = existingRequest.data() as StoredIdempotencyRequest;
          if (existing.fingerprint !== fingerprint) throw new Error("같은 주문 요청 키에는 같은 입력값을 사용해 주세요.");
          return { orderNumber: existing.orderNumber, lookupCode, status: existing.status, totalPrice: existing.totalPrice, duplicate: true };
        }
        if (orderSnapshot.exists) throw new Error("ORDER_NUMBER_COLLISION");
        if (!productSnapshot.exists) throw new Error("상품을 찾을 수 없습니다.");
        const product = productSnapshot.data() as StoredProduct;
        if (!validInteger(product.price, 0, 100_000_000) || !validInteger(product.stock, 0, 1_000_000)) throw new Error("상품 정보를 확인할 수 없습니다.");
        if (product.stock < quantity) throw new Error("재고 수량을 확인해 주세요.");
        const totalPrice = product.price * quantity;
        const stored: StoredOrder = {
          orderNumber, lookupCodeHash, recipient, phone, address, productId: product.id, productName: product.name,
          quantity, unitPrice: product.price, totalPrice, status: "결제완료", createdAt,
        };
        transaction.set(orders.doc(orderNumber), stored);
        transaction.set(idempotencyReference, { fingerprint, orderNumber, status: stored.status, totalPrice, createdAt, expiresAt: idempotencyExpiresAt } satisfies StoredIdempotencyRequest);
        transaction.update(productReference, { stock: product.stock - quantity, updatedAt: FieldValue.serverTimestamp() });
        return { orderNumber, lookupCode, status: stored.status, totalPrice, duplicate: false };
      });
      try { await cleanupExpiredCollections([idempotencyRequests], 1); } catch { /* Successful orders remain valid if cleanup is unavailable. */ }
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_NUMBER_COLLISION") continue;
      throw error;
    }
  }
  throw new Error("주문 번호를 생성하지 못했습니다. 다시 시도해 주세요.");
}

const invalidLookupHash = "$2b$12$8XGacDkrpnNQ2EF0oWCGa.hEjTXuqOPrwn2ynqPM.lZcdCGldOD8a";

export async function lookupGuestOrder(orderNumberInput: string, lookupCodeInput: string): Promise<OrderLookup | null> {
  await assertFirebaseServerReady();
  const orderNumber = orderNumberInput.trim().toUpperCase();
  const lookupCode = lookupCodeInput.trim();
  const validInput = /^SF-\d{8}-[A-F0-9]{16}$/.test(orderNumber) && Boolean(lookupCode) && lookupCode.length <= 40;
  if (!validInput) {
    await bcrypt.compare(lookupCode.slice(0, 40) || "invalid", invalidLookupHash);
    return null;
  }
  const snapshot = await orders.doc(orderNumber).get();
  const data = snapshot.exists ? snapshot.data() as StoredOrder : null;
  const correct = await bcrypt.compare(lookupCode, data?.lookupCodeHash ?? invalidLookupHash);
  if (!data || !correct) return null;
  return { orderNumber: data.orderNumber, productName: data.productName, quantity: data.quantity, totalPrice: data.totalPrice, status: data.status, createdAt: data.createdAt };
}

function validProductInput(input: { name: unknown; description: unknown; category: unknown; price: unknown; stock: unknown }) {
  const name = text(input.name, "상품명", 100);
  const description = text(input.description, "설명", 1000);
  const category = text(input.category, "카테고리", 50);
  if (!validInteger(input.price, 0, 100_000_000) || !validInteger(input.stock, 0, 1_000_000)) throw new Error("가격과 재고는 허용 범위의 정수여야 합니다.");
  return { name, description, category, price: input.price, stock: input.stock };
}

export async function createProduct(input: { name: unknown; description: unknown; category: unknown; price: unknown; stock: unknown }) {
  await assertFirebaseServerReady();
  const data = validProductInput(input);
  let id = randomInt(100_000_000, 2_000_000_000);
  for (let attempts = 0; attempts < 3; attempts += 1) {
    const reference = products.doc(String(id));
    if (!(await reference.get()).exists) {
      const now = new Date().toISOString();
      await reference.create({ ...data, id, image: "/images/kit-kelp-start.png", options: ["기본 구성"], reviews: [], createdAt: now, updatedAt: now });
      return id;
    }
    id = randomInt(100_000_000, 2_000_000_000);
  }
  throw new Error("상품 식별자를 생성하지 못했습니다. 다시 시도해 주세요.");
}

export async function updateProductStock(productId: unknown, stock: unknown) {
  await assertFirebaseServerReady();
  if (!validInteger(productId, 1, Number.MAX_SAFE_INTEGER) || !validInteger(stock, 0, 1_000_000)) throw new Error("재고는 허용 범위의 정수여야 합니다.");
  const reference = products.doc(String(productId));
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("상품을 찾을 수 없습니다.");
  await reference.update({ stock, updatedAt: FieldValue.serverTimestamp() });
}

export async function updateProductPrice(productId: unknown, price: unknown) {
  await assertFirebaseServerReady();
  if (!validInteger(productId, 1, Number.MAX_SAFE_INTEGER) || !validInteger(price, 0, 100_000_000)) throw new Error("가격은 허용 범위의 정수여야 합니다.");
  const reference = products.doc(String(productId));
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("상품을 찾을 수 없습니다.");
  await reference.update({ price, updatedAt: FieldValue.serverTimestamp() });
}

export async function updateOrderStatus(orderNumber: unknown, status: unknown) {
  await assertFirebaseServerReady();
  if (typeof orderNumber !== "string" || !/^SF-\d{8}-[A-F0-9]{16}$/.test(orderNumber) || !statuses.includes(status as OrderStatus)) throw new Error("주문 상태를 확인해 주세요.");
  const reference = orders.doc(orderNumber);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("주문을 찾을 수 없습니다.");
  await reference.update({ status, updatedAt: FieldValue.serverTimestamp() });
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  await assertFirebaseServerReady();
  try { await cleanupExpiredOperationalDocs(); } catch { /* Bounded cleanup must not block administration. */ }
  const snapshot = await orders.orderBy("createdAt", "desc").limit(100).get();
  return snapshot.docs.map((document) => {
    const data = document.data() as StoredOrder;
    const { lookupCodeHash: _lookupCodeHash, ...order } = data;
    return order;
  });
}
