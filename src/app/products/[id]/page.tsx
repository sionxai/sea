import { ProductDetail } from "@/components/product-detail";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) { return <ProductDetail id={Number((await params).id)} />; }
