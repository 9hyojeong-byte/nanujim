import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "나누짐 (Nanujim) 🌿 - 여행 공용 장비 나눔",
  description: "여러 명이 함께 여행을 갈 때, 텐트/버너/랜턴 같은 공용 장비를 쉽고 공평하게 나누어 챙기세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="mobile-frame">
          {children}
        </div>
      </body>
    </html>
  );
}
