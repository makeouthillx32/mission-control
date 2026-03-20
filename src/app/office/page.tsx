// src/app/office/page.tsx
"use client";
import Office3D from "@/components/Office3D/Office3D";

export default function OfficePage() {
  return (
    <div className="page-fill" style={{ position: "relative" }}>
      <Office3D />
    </div>
  );
}