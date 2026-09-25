import { notFound } from "next/navigation";

import Container from "@/components/Container";
import ProductDetails from "@/components/ProductDetails";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

async function getProduct(slug) {
  const response = await fetch(
    `${API_BASE_URL}/products/get-product/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load product");
  }

  return response.json();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getProduct(slug);

  if (!data?.product) {
    return {
      title: "Product not found | PawTail",
    };
  }

  return {
    title: `${data.product.name} | PawTail`,
    description: data.product.description,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await getProduct(slug);

  if (!data?.product) {
    notFound();
  }

  return (
    <main className="bg-white">
      <Container className="py-8 lg:py-12">
        <ProductDetails
          product={data.product}
          relatedProducts={data.relatedProducts || []}
        />
      </Container>
    </main>
  );
}
