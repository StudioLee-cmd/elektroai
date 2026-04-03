import type { Metadata } from "next";
import { siteDetails } from "@/data/siteDetails";
import SpelContent from "./SpelContent";

export const metadata: Metadata = {
  title: `ElektroAI Wereld - Elektricien Simulatie | ${siteDetails.siteName}`,
  description:
    "Bouw je elektriciensbedrijf op in deze isometrische pixelwereld! Los bedrading-puzzels op, bedien klanten en verdien munten. Een retro pixel-art simulatiegame van ElektroAI.",
  openGraph: {
    title: `ElektroAI Wereld - Elektricien Simulatie | ${siteDetails.siteName}`,
    description:
      "Bouw je elektriciensbedrijf op in deze isometrische pixelwereld! Los bedrading-puzzels op, bedien klanten en verdien munten.",
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
