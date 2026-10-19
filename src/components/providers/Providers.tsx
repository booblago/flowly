"use client";

import { SessionProvider } from "next-auth/react";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
        <CookieBanner />
      </LanguageProvider>
    </SessionProvider>
  );
}
