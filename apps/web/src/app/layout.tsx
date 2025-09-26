"use client";
import { useEffect } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Set document title client-side
    document.title = "WeWatch - Watch Together";
    
    // Add meta description client-side
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Watch videos together in sync');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'Watch videos together in sync';
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body
        className="dark bg-gray-950 text-gray-100 font-[Geist] antialiased"
        style={{
          fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        }}
      >
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
