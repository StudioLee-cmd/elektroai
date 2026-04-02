import type { Metadata } from "next";
import { siteDetails } from "@/data/siteDetails";
import ChatbotContent from "@/app/chatbot/ChatbotContent";

export const metadata: Metadata = {
    title: `Chatbot voor Elektriciens | ${siteDetails.siteName}`,
    description: `Ontdek onze chatbot oplossing speciaal voor elektriciens. ${siteDetails.siteName} helpt je groeien.`,
};

export default function Page() {
    return <ChatbotContent />;
}
