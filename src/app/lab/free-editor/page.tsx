import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FreeEditor } from "@/components/free-editor/FreeEditor";
import "@/components/free-editor/free-editor.css";

export const metadata: Metadata = { title: "WINDX / Free block prototype", robots: { index: false, follow: false } };
// Резервная проверка на запросе. Настоящий HTTP 404 закрытого стенда задаёт proxy.
export const instant = false;

export default async function FreeEditorPage() {
  await connection();
  // Стенд не появляется на production без явного включения. Рабочие сайты не затрагивает.
  if (process.env.NODE_ENV === "production" && process.env.WINDX_EDITOR_LAB !== "1") notFound();
  return <FreeEditor />;
}
