import { LegalDocument } from "@/components/legal/LegalDocument";

export default function CookiesPage() {
  return (
    <LegalDocument
      titleKey="cookiePolicy"
      bodyKeys={["cookiesP1", "cookiesP2", "cookiesP3", "cookiesP4"]}
    />
  );
}
