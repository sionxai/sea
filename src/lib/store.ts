import "server-only";
import bcrypt from "bcryptjs";
import { sqlite } from "@/lib/db";
import type { Order, Product, Region, Review } from "@/lib/types";

const seedProducts = [
  ["다시마 숲 시작 키트", "성게 패각 생태 블록과 다시마 포자를 담은 첫 바다 식목 키트입니다.", 39000, 18, "초보자", "/images/kit-kelp-start.png"],
  ["감태 회복 키트", "겨울 바다에 어울리는 감태 포자와 안내서를 함께 제공합니다.", 49000, 12, "계절 추천", "/images/kit-gamtae-recovery.png"],
  ["해조류 관찰 키트", "이식 뒤 변화를 기록할 수 있는 관찰 노트가 포함된 키트입니다.", 32000, 25, "관찰", "/images/kit-observation.png"],
] as const;

export function ensureSeedData() {
  const count = sqlite.prepare("SELECT count(*) as count FROM products").get() as { count: number };
  if (count.count) return;
  const insert = sqlite.transaction(() => {
    const password = bcrypt.hashSync("ocean2026!", 12);
    sqlite.prepare("INSERT INTO users (name,email,password_hash,role,created_at) VALUES (?,?,?,?,?)").run("바다 관리자", "admin@ocean.local", password, "admin", new Date().toISOString());
    sqlite.prepare("INSERT INTO users (name,email,password_hash,role,created_at) VALUES (?,?,?,?,?)").run("체험 사용자", "user@ocean.local", password, "user", new Date().toISOString());
    const addProduct = sqlite.prepare("INSERT INTO products (name,description,price,stock,category,image) VALUES (?,?,?,?,?,?)");
    const addOption = sqlite.prepare("INSERT INTO product_options (product_id,name) VALUES (?,?)");
    const addReview = sqlite.prepare("INSERT INTO reviews (product_id,author,rating,content) VALUES (?,?,?,?)");
    for (const [name, description, price, stock, category, image] of seedProducts) {
      const id = Number(addProduct.run(name, description, price, stock, category, image).lastInsertRowid);
      addOption.run(id, "기본 구성"); addOption.run(id, "안내서 포함");
      addReview.run(id, "바다를 사랑하는 구매자", 5, "포장과 안내가 친절해서 첫 이식도 어렵지 않았어요.");
    }
    const addRegion = sqlite.prepare("INSERT INTO regions (name,area,season,note,latitude,longitude) VALUES (?,?,?,?,?,?)");
    addRegion.run("문갑도 연안", "전남 진도", "10월–3월", "현지 어촌계 안내를 먼저 확인해 주세요.", 34.36, 126.17);
    addRegion.run("월정리 해역", "제주 구좌", "11월–2월", "파도가 높은 날에는 이식을 피해주세요.", 33.54, 126.79);
    addRegion.run("청산도 연안", "전남 완도", "9월–2월", "지정 구역 안에서만 진행해 주세요.", 34.18, 126.93);
    sqlite.prepare("INSERT INTO kit_codes (code,product_id) VALUES (?,?)").run("OCEAN-2026-START", 1);
  });
  insert();
}

function reviews(productId: number): Review[] { return sqlite.prepare("SELECT id,author,rating,content FROM reviews WHERE product_id = ?").all(productId) as Review[]; }
function product(row: Omit<Product, "options" | "reviews">): Product {
  return { ...row, options: (sqlite.prepare("SELECT name FROM product_options WHERE product_id = ?").all(row.id) as { name: string }[]).map((x) => x.name), reviews: reviews(row.id) };
}
export function getProducts(query = "", category = ""): Product[] {
  ensureSeedData();
  const text = `%${query.trim()}%`;
  const rows = sqlite.prepare("SELECT id,name,description,price,stock,category,image FROM products WHERE (name LIKE ? OR description LIKE ?) AND (? = '' OR category = ?) ORDER BY id").all(text, text, category, category) as Omit<Product, "options" | "reviews">[];
  return rows.map(product);
}
export function getProduct(id: number) { return getProducts().find((item) => item.id === id) ?? null; }
export function getRegions(): Region[] { ensureSeedData(); return sqlite.prepare("SELECT * FROM regions ORDER BY id").all() as Region[]; }
export function authenticate(email: string, password: string) {
  ensureSeedData(); const user = sqlite.prepare("SELECT id,name,email,password_hash as passwordHash,role FROM users WHERE email = ?").get(email) as { id: number; name: string; email: string; passwordHash: string; role: string } | undefined;
  return user && bcrypt.compareSync(password, user.passwordHash) ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
}
export function createOrder(userId: number, productId: number, quantity: number, recipient: string, address: string) {
  const item = getProduct(productId); if (!item) throw new Error("상품을 찾을 수 없습니다."); if (quantity < 1 || quantity > item.stock) throw new Error("재고 수량을 확인해 주세요.");
  const now = new Date().toISOString();
  const execute = sqlite.transaction(() => {
    const result = sqlite.prepare("INSERT INTO orders (user_id,total_price,status,recipient,address,created_at) VALUES (?,?,?,?,?,?)").run(userId, item.price * quantity, "결제완료", recipient, address, now);
    const orderId = Number(result.lastInsertRowid); sqlite.prepare("INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES (?,?,?,?)").run(orderId, productId, quantity, item.price);
    sqlite.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, productId); return orderId;
  }); return execute();
}
export function getOrders(userId: number): Order[] {
  ensureSeedData(); const rows = sqlite.prepare("SELECT id,total_price as totalPrice,status,created_at as createdAt FROM orders WHERE user_id = ? ORDER BY id DESC").all(userId) as Omit<Order, "items">[];
  return rows.map((order) => ({ ...order, items: sqlite.prepare("SELECT p.name as productName, oi.quantity, oi.unit_price as unitPrice FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?").all(order.id) as Order["items"] }));
}
export function getAdminOrders(): (Order & { recipient: string; address: string })[] {
  ensureSeedData(); const rows = sqlite.prepare("SELECT id,total_price as totalPrice,status,recipient,address,created_at as createdAt FROM orders ORDER BY id DESC").all() as Omit<Order & { recipient: string; address: string }, "items">[];
  return rows.map((order) => ({ ...order, items: sqlite.prepare("SELECT p.name as productName, oi.quantity, oi.unit_price as unitPrice FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?").all(order.id) as Order["items"] }));
}
export function updateInventory(productId: number, stock: number) { if (!Number.isInteger(stock) || stock < 0) throw new Error("재고는 0 이상의 정수여야 합니다."); const result = sqlite.prepare("UPDATE products SET stock = ? WHERE id = ?").run(stock, productId); if (!result.changes) throw new Error("상품을 찾을 수 없습니다."); }
export function createProduct(input: { name: string; description: string; price: number; stock: number; category: string }) {
  if (!input.name.trim() || !input.description.trim() || !input.category.trim()) throw new Error("상품명, 설명, 카테고리를 입력해 주세요.");
  if (!Number.isInteger(input.price) || input.price < 0 || !Number.isInteger(input.stock) || input.stock < 0) throw new Error("가격과 재고는 0 이상의 정수여야 합니다.");
  const result = sqlite.transaction(() => { const product = sqlite.prepare("INSERT INTO products (name,description,price,stock,category,image) VALUES (?,?,?,?,?,?)").run(input.name.trim(), input.description.trim(), input.price, input.stock, input.category.trim(), "/images/kit-kelp-start.png"); const id = Number(product.lastInsertRowid); sqlite.prepare("INSERT INTO product_options (product_id,name) VALUES (?,?)").run(id, "기본 구성"); return id; })(); return result;
}
export function updateOrderStatus(orderId: number, status: string) { if (!['결제완료','배송중','배송완료','취소'].includes(status)) throw new Error("허용되지 않은 주문 상태입니다."); const result = sqlite.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId); if (!result.changes) throw new Error("주문을 찾을 수 없습니다."); }
export function certifyKit(code: string, regionId: number, userId?: number) {
  ensureSeedData(); const kit = sqlite.prepare("SELECT code,used FROM kit_codes WHERE code = ?").get(code) as { code: string; used: number } | undefined;
  if (!kit) throw new Error("등록되지 않은 키트 코드입니다."); if (kit.used) throw new Error("이미 인증된 키트 코드입니다.");
  if (!sqlite.prepare("SELECT id FROM regions WHERE id = ?").get(regionId)) throw new Error("추천 해역을 선택해 주세요.");
  sqlite.transaction(() => { sqlite.prepare("INSERT INTO certifications (code,region_id,user_id,certified_at) VALUES (?,?,?,?)").run(code, regionId, userId ?? null, new Date().toISOString()); sqlite.prepare("UPDATE kit_codes SET used = 1 WHERE code = ?").run(code); })();
}
