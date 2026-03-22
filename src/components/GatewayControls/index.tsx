// src/components/GatewayControls/index.tsx
"use client";

import { useState } from "react";
import { useGatewayRestart } from "@/hooks/useGatewayStatus";
import { DefaultModel as GatewayControlsInner } from "./DefaultModel";
import RestartDialog from "./RestartDialog";

export { DefaultModel as GatewayControls } from "./DefaultModel";

export function GatewayControlsWithRestart() {
  const [restartOpen, setRestartOpen] = useState(false);
  const restart = useGatewayRestart();

  const handleRestart = () => {
    restart.mutate(undefined, {
      onSettled: () => setRestartOpen(false),
    });
  };

  return (
    <>
      <GatewayControlsInner />
      <RestartDialog
        open={restartOpen}
        onOpenChange={setRestartOpen}
        onConfirm={handleRestart}
        isPending={restart.isPending}
      />
    </>
  );
}