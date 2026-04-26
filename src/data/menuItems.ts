import { IMenuItem } from "@/types";

export const menuItems: IMenuItem[] = [
    {
        text: "Diensten",
        url: "#",
        children: [
            { text: "Chatbot voor Elektriciens", url: "/chatbot" },
            { text: "Voice AI voor Elektriciens", url: "/voice-ai" },
            { text: "SEO voor Elektriciens", url: "/seo" },
            { text: "Social Media voor Elektriciens", url: "/social-media" },
            { text: "Reviews voor Elektriciens", url: "/reviews" },
            { text: "Review Pakket", url: "/review-pakket" },
            { text: "CRM voor Elektriciens", url: "/crm" },
        ]
    },
    {
        text: "Tarieven",
        url: "/tarieven"
    },
    {
        text: "Gratis Scan",
        url: "/gratis-scan"
    },
    {
        text: "Gratis Website",
        url: "/gratis-website"
    },
    {
        text: "Blog",
        url: "/blog"
    }
];
