import { apiRequest } from "@/lib/api";

export async function getProductReviews(productId) {
  const data = await apiRequest(`/reviews/get-reviews?productId=${productId}`);
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
