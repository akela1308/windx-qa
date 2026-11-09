import { redirect } from "next/navigation";

// Создание сайта теперь прямо на главной, на первом экране.
export default function NewSite() {
  redirect("/");
}
