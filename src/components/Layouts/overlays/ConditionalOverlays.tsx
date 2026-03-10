// components/ConditionalOverlays.tsx
"use client";

import { usePathname } from "next/navigation";
import AccessibilityOverlay from "@/components/Layouts/overlays/accessibility/accessibility";


export default function ConditionalOverlays() {
  const pathname = usePathname();

  // Exclude overlays from app and dashboard pages
  const isAppPage = pathname?.startsWith('/app');
  const isDashboardPage = pathname?.startsWith('/dashboard');
  
  const shouldShowOverlays = !isAppPage && !isDashboardPage;

  if (!shouldShowOverlays) {
    return null;
  }

  return (
    <>
      {/* 🛒 Cart Button - bottom left */}
      
      
      {/* ♿ Accessibility Overlay - bottom right */}
      <AccessibilityOverlay />
      
      {/* 🛒 Cart Drawer - slide-out panel */}
      
    </>
  );
}