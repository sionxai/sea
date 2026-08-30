import Image from "next/image";
import Link from "next/link";
import { resolveProductImage } from "@/lib/product-images";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const image = resolveProductImage(product.id, product.image);
  return <Link className="card" href={`/products/${product.id}`}>
    <div className="card-art">
      {image ? <Image className="product-image" src={image} alt={`${product.name} 구성품`} fill sizes="(max-width: 680px) 46vw, (max-width: 1120px) 31vw, 350px" /> : <span aria-hidden>{product.image}</span>}
      <span className="card-badge">{product.category}</span>
    </div>
    <div className="card-body">
      <div className="rating-line" aria-label={`평점 5점, 후기 ${product.reviews.length}개`}><span>★ 5.0</span><span>후기 {product.reviews.length}</span></div>
      <h3>{product.name}</h3>
      <p className="card-copy">{product.description}</p>
      <div className="card-meta"><p className="price">{product.price.toLocaleString()}원</p><span>재고 {product.stock}</span></div>
    </div>
  </Link>;
}
