import type { Metadata } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";

// Unbounded: широкий гротеск для заголовков, Geist: текст. Оба с кириллицей (интерфейс на ru).
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic"], weight: ["500", "700", "800"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin", "cyrillic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "WINDX: websites for small businesses",
  description: "Describe your business, get a website that looks designed, not generated, and keep improving it by asking.",
};

// Тёмная тема из памяти браузера ставится до первой отрисовки, чтобы не мигал светлый экран.
// Так же восстанавливается свёрнутое меню кабинета.
const THEME_SCRIPT = `try{var d=document.documentElement;if(localStorage.getItem("windx_theme")==="dark")d.dataset.theme="dark";if(localStorage.getItem("windx_sidebar")==="collapsed")d.dataset.sidebar="collapsed"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: тему ставит скрипт ниже до отрисовки, сервер о ней не знает.
    <html lang="en" suppressHydrationWarning className={`${unbounded.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
