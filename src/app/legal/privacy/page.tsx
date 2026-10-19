import { LegalDocument } from "@/components/legal/LegalDocument";

export default function PrivacyPage() {
  return (
    <LegalDocument
      titleKey="privacyPolicy"
      bodyKeys={[
        "privacyP1",
        "privacyP2",
        "privacyP3",
        "privacyP4",
        "privacyP5",
      ]}
    />
  );
}
