import { LegalDocument } from "@/components/legal/LegalDocument";

export default function SecurityPage() {
  return (
    <LegalDocument
      titleKey="securityPolicy"
      bodyKeys={[
        "securityP1",
        "securityP2",
        "securityP3",
        "securityP4",
        "securityP5",
      ]}
    />
  );
}
