import { Suspense } from "react";
import { Sidebar } from "@/components/shell/Sidebar";

// Страницы кабинета: слева меню, справа содержимое. У редактора сайта своя рабочая рамка без этого меню.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex-1 lg:flex">
      <Suspense fallback={<div className="hidden w-[284px] shrink-0 border-r border-line lg:block" />}>
        <Sidebar />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
