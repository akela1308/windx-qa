import Image from "next/image";
import { Google_Sans } from "next/font/google";

const googleSans = Google_Sans({ subsets: ["latin", "cyrillic"], weight: "500", adjustFontFallback: false, fallback: ["Arial", "sans-serif"] });

// Обычный переход, без prefetch: начало OAuth должно происходить по нажатию.
export function GoogleButton({ label, link = false }: { label: string; link?: boolean }) {
  return <a href={link ? "/auth/google?link=1" : "/auth/google"} className={`${googleSans.className} flex h-10 w-full items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-white px-3 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}>
    <Image src="/brands/google-g.png" alt="" width={20} height={20} className="shrink-0" />
    {label}
  </a>;
}
