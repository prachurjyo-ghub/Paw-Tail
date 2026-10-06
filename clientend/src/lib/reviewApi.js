import { apiRequest } from "@/lib/api";

export async function getProductReviews(productId) {
  const params = new URLSearchParams({ productId: String(productId) });
  const data = await apiRequest(`/reviews/get-reviews?${params}`);
  return {
    reviews: data.reviews || [],
    rating: data.rating || null,
  };
}

export async function submitProductReview({ productId, rating, comment }) {
  const data = await apiRequest("/reviews/post-reviews", {
    method: "POST",
    body: JSON.stringify({ productId, rating, comment }),
  });
  return data.review;
}
