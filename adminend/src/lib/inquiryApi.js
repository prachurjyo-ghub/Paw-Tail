import { adminApi } from "@/lib/adminApi";

export async function getInquiriesFromApi(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.topic) query.set("topic", params.topic);
  if (params.q) query.set("q", params.q);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await adminApi(`/inquiries/get-inquiries${suffix}`);
  return {
    inquiries: data.inquiries || [],
    topics: data.topics || [],
  };
}

export async function updateInquiry(id, payload) {
  const data = await adminApi(`/inquiries/update-inquiry/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.inquiry;
}
