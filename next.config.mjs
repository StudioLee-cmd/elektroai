/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    async redirects() {
        return [
            { source: '/chatbot-voor-:suffix', destination: '/chatbot', permanent: true },
            { source: '/voice-ai-voor-:suffix', destination: '/voice-ai', permanent: true },
            { source: '/reviews-voor-:suffix', destination: '/reviews', permanent: true },
            { source: '/seo-voor-:suffix', destination: '/seo', permanent: true },
            { source: '/social-media-voor-:suffix', destination: '/social-media', permanent: true },
                    { source: '/blog/trafo-en-hoogspanning-als-elektricien-specialisme', destination: '/', permanent: true },
            { source: '/blog/b2b-bouwprojecten-als-elektricien-aannemer-werk', destination: '/', permanent: true },
            { source: '/blog/zzp-cooperatie-elektriciens-collectieve-inkoop-spoeddienst', destination: '/', permanent: true },
            { source: '/blog/uurtarief-elektricien-zzp-rekenmethode-cijfers-2026', destination: '/', permanent: true },
            { source: '/blog/warmtepomp-installatie-elektricien-f-gassen-samenwerking-service-line-specialisatie', destination: '/', permanent: true },
            { source: '/blog/audiovisueel-home-theater-elektricien-premium-niche-cedia-specialisatie', destination: '/', permanent: true },
            { source: '/blog/industriele-schakelkasten-kema-keur-elektricien-b2b-specialisme-specialisatie', destination: '/', permanent: true },
            { source: '/blog/led-verlichting-zakelijk-subsidies-elektricien', destination: '/', permanent: true },
            { source: '/blog/datakabel-netwerkbekabeling-elektricien-b2b-specialisme', destination: '/', permanent: true },
            { source: '/blog/verduurzaming-elektricien-zonnepanelen-laadpalen', destination: '/', permanent: true },
            { source: '/blog/slimme-installaties-elektricien-domotica', destination: '/', permanent: true },
            { source: '/blog/salderingsregeling-2027-elektricien-klanten', destination: '/', permanent: true },
            { source: '/blog/robot-elektricien-huis', destination: '/', permanent: true },
            { source: '/blog/prijzen-website-elektricien', destination: '/blog/prijzen-website-elektricien-transparantie', permanent: true },
            { source: '/blog/reviews-verzamelen-elektricien', destination: '/blog/reviews-verzamelen-elektricien-automatisch', permanent: true },
            { source: '/blog/social-media-voor-elektriciens', destination: '/social-media', permanent: true },
        ];
    },
};

export default nextConfig;
