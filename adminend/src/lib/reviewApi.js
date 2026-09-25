import { adminApi } from "@/lib/adminApi";

export async function getReviewsFromApi(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.hidden === true || params.hidden === false) {
    query.set("hidden", String(params.hidden));
  }
  if (params.rating) query.set("rating", String(params.rating));
  if (params.q) query.set("q", params.q);
  if (params.productId) query.set("productId", params.productId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await adminApi(`/reviews/get-reviews${suffix}`);
  return data.reviews || [];
}

export async function replyToReview(id, reply) {
  const data = await adminApi(`/reviews/reply-reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ reply }),
  });
  return data.review;
}

export async function hideReview(id, isHidden = true) {
  const data = await adminApi(`/reviews/hide-reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isHidden }),
  });
  return data.review;
}

export async function deleteReview(id) {
  return adminApi(`/reviews/delete-reviews/${id}`, {
    method: "DELETE",
  });
}

export const normalizeReview = (review) => ({
  id: review._id,
  customer: review.customerName,
  product: review.product?.name || "Product",
  productId: review.product?._id || review.product || "",
  rating: review.rating,
  comment: review.comment || "",
  reply: review.reply || "",
  status: review.status || (review.reply ? "replied" : "pending"),
  isHidden: Boolean(review.isHidden),
  createdAt: review.createdAt,
});
