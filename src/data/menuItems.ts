import { IMenuItem } from "@/types";

export const menuItems: IMenuItem[] = [
    {
        text: "Diensten",
        url: "#",
        children: [
            { text: "Chatbot voor Elektriciens", url: "/chatbot-voor-elektriciens" },
            { text: "Voice AI voor Elektriciens", url: "/voice-ai-voor-elektriciens" },
            { text: "SEO voor Elektriciens", url: "/seo-voor-elektriciens" },
            { text: "Social Media voor Elektriciens", url: "/social-media-voor-elektriciens" },
            { text: "Reviews voor Elektriciens", url: "/reviews-voor-elektriciens" },
            { text: "Review Pakket", url: "/review-pakket" },
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
