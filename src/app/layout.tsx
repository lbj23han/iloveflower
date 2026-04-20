import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const isTossBuild = process.env.NEXT_PUBLIC_TOSS_BUILD === 'true';
const kakaoKey = (process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "").trim();

export const metadata: Metadata = {
  metadataBase: new URL("https://xn--js0bm6bu3m3qo.site"),
  alternates: {
    canonical: "https://xn--js0bm6bu3m3qo.site",
  },
  title: "꽃놀이맵 — 지금 어디에 꽃이 피었을까?",
  description:
    "실시간 개화 현황과 꽃 명소 정보를 한눈에. 벚꽃, 매화, 철쭉, 유채꽃 등 전국 꽃놀이 장소를 지도로 확인하세요.",
  keywords: [
    "꽃놀이",
    "벚꽃",
    "개화현황",
    "꽃명소",
    "매화",
    "철쭉",
    "유채꽃",
    "꽃놀이맵",
  ],
  openGraph: {
    title: "꽃놀이맵",
    description: "지금 어디에 꽃이 피었을까?",
    type: "website",
    url: "https://xn--js0bm6bu3m3qo.site",
    siteName: "꽃놀이맵",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "꽃놀이맵",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="icon" href="/icon.png?v=2" />
        <link rel="shortcut icon" href="/icon.png?v=2" />
        <link rel="apple-touch-icon" href="/icon.png?v=2" />
        <meta
          name="google-site-verification"
          content="0JLZhV3wwUOIb0z2HLvwOaXesjZI046RL_nD6jkh8zk"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5992854033857462"
          crossOrigin="anonymous"
        />
        {isTossBuild ? (
          <script src="/kakao-maps-loader.js" />
        ) : (
          kakaoKey && (
            <Script
              src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=clusterer&autoload=false`}
              strategy="afterInteractive"
            />
          )
        )}
      </head>
      <body className="h-full">
        {children}
        <Link
          href="/privacy"
          aria-label="개인정보처리방침"
          className="fixed right-2 z-[70] inline-flex h-8 select-none items-center rounded-full border border-white/35 bg-white/55 px-2.5 text-[11px] font-medium text-[#9ca3af] shadow-[0_6px_16px_rgba(15,23,42,0.06)] backdrop-blur-md opacity-55 transition-opacity hover:opacity-80"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          개인정보
        </Link>
      </body>
    </html>
  );
}
