import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Creative Freelancer Marketplace",
  description: "Find, hire and work with premium creative media professionals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
