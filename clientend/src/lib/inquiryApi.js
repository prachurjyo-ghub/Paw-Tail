import { apiRequest } from "@/lib/api";

export const INQUIRY_TOPICS = [
  "Order & delivery",
  "Nutrition advice",
  "Product question",
  "Visit a store",
  "Returns & refunds",
  "Wholesale / bulk",
];

export async function submitInquiry(payload) {
  return apiRequest("/inquiries/create-inquiry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyInquiries() {
  const data = await apiRequest("/inquiries/my-inquiries");
  return data.inquiries || [];
}
