"use client";

import React from "react";
import { StructureFlowCollection } from "@/shaders/StructureFlowCollection";

export default function AuthenticatedFluidBackground() {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen pointer-events-none overflow-hidden select-none"
      style={{
        zIndex: 0,
        isolation: "isolate",
        opacity: 0.90
      }}
      aria-hidden="true"
    >
      <StructureFlowCollection
        variant="fluid-field"
        hue={0}
        saturation={1.0}
        brightness={1.0}
        mode="dark"
        className="w-full h-full"
      />
    </div>
  );
}
