import { permanentRedirect } from "next/navigation";

// Preserve previously shared links. Access is checked at the canonical page.
export default function LegacyRecruiterPage() {
  permanentRedirect("/design-journey");
}
