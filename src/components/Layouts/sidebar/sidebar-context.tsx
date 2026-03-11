// src/components/Layouts/sidebar/sidebar-context.tsx
"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
  state: "expanded" | "collapsed";
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebarContext must be used within a SidebarProvider");
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  // Always start closed — no flash on mobile
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  return (
    <SidebarContext.Provider value={{
      state: isOpen ? "expanded" : "collapsed",
      isOpen,
      setIsOpen,
      isMobile,
      toggleSidebar: () => setIsOpen(prev => !prev),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}