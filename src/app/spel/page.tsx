import type { Metadata } from "next";
import { siteDetails } from "@/data/siteDetails";
import SpelContent from "./SpelContent";

export const metadata: Metadata = {
  title: `Stroommeester - Het Bedrading Puzzelspel | ${siteDetails.siteName}`,
  description:
    "Speel Stroommeester: verbind de stroom met apparaten door slim bedrading te leggen. Een retro pixel-art puzzelgame van ElektroAI.",
  openGraph: {
    title: `Stroommeester - Het Bedrading Puzzelspel | ${siteDetails.siteName}`,
    description:
      "Speel Stroommeester: verbind de stroom met apparaten door slim bedrading te leggen.",
    url: `${siteDetails.siteUrl}spel`,
    type: "website",
    locale: "nl_NL",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SpelPage() {
  return <SpelContent />;
}
