import { LegalDocument } from "@/components/legal/LegalDocument";

export default function TermsPage() {
  return (
    <LegalDocument
      titleKey="termsOfService"
      bodyKeys={["termsP1", "termsP2", "termsP3", "termsP4", "termsP5"]}
    />
  );
}
