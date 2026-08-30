export type Product = { id: number; name: string; description: string; price: number; stock: number; category: string; image: string; options: string[]; reviews: Review[] };
export type Review = { id: number; author: string; rating: number; content: string };
export type Region = { id: number; name: string; area: string; season: string; note: string; latitude: number; longitude: number };
export type Order = { id: number; totalPrice: number; status: string; createdAt: string; items: { productName: string; quantity: number; unitPrice: number }[] };
