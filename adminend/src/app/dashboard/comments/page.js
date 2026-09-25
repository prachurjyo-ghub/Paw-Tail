import { redirect } from "next/navigation";

export default function CommentsRedirectPage() {
  redirect("/dashboard/reviews");
}
