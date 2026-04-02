import type { Metadata } from "next";
import SpelContent from "./SpelContent";

export const metadata: Metadata = {
  title: "ElektroSim - Elektricien Simulator | ElektroAI",
  description:
    "Word een virtuele elektricien! Loop rond in de werkplaats, repareer zekeringen, installeer stopcontacten en verdien munten om upgrades te kopen. Gratis online spel van ElektroAI.",
  openGraph: {
    title: "ElektroSim - Elektricien Simulator | ElektroAI",
    description:
      "Word een virtuele elektricien! Loop rond, voltooi opdrachten en koop upgrades in deze leuke pixel-art simulator.",
    type: "website",
    url: "https://www.elektroai.nl/spel",
    siteName: "ElektroAI",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.elektroai.nl/spel" },
};

export default function SpelPage() {
  return <SpelContent />;
}
