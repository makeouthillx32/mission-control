// src/app/office/page.tsx
// OfficeProvider wraps the entire page tree so useOfficeContext() resolves
// in both Office3D (canvas) and the overlays mounted in ClientLayout.
"use client";

import { OfficeProvider } from "@/components/Layouts/overlays/office";
import Office3D from "@/components/Office3D/Office3D";

export default function OfficePage() {
  return (
    <OfficeProvider>
      <div className="page-fill" style={{ position: "relative" }}>
        <Office3D />
      </div>
    </OfficeProvider>
  );
}