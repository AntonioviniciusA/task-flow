"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function FooterAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  // Substitua ca-pub-XXXXXXXX e data-ad-slot pelo seu ID real
  // Recomendado usar variáveis de ambiente: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const adClient =
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXX";
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID || "XXXXXXXX";

  if (adClient === "ca-pub-XXXXXXXX") {
    return null; // Não exibe nada se não estiver configurado
  }

  return (
    <div className="w-full border-t p-2 flex justify-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="text-xs text-muted-foreground absolute top-0 right-2">
        Publicidade
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minWidth: "300px", minHeight: "50px" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
