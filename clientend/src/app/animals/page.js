import { redirect } from "next/navigation";
import { getCategoryAnimalsView } from "@/lib/categoryApi";

export default async function AnimalsPage() {
  const animals = await getCategoryAnimalsView();
  if (!animals.length) {
    redirect("/");
  }

  redirect(`/animals/${animals[0].slug}`);
}
