// src/app/office/page.tsx
import Office3D from '@/components/Office3D/Office3D';

export const metadata = {
  title: 'The Office 3D | Mission Control',
  description: 'Visualiza tus agentes trabajando en tiempo real en un entorno 3D',
};

export default function OfficePage() {
  // page-fill = calc(100vh - topbar - statusbar), no overflow
  // position:relative so Office3D's absolute children are scoped here
  return (
    <div className="page-fill" style={{ position: "relative" }}>
      <Office3D />
    </div>
  );
}