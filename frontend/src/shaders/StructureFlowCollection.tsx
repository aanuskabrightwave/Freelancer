"use client";

import React from "react";
import { FluidFieldBackground, NeuformCraftEffectProps } from "./neuform-isolated/NeuformCraftEffects";
import "./threeui.css";

export interface StructureFlowCollectionProps extends NeuformCraftEffectProps {
  variant?: "fluid-field" | "neon" | "woven-cloth" | "nebula" | "halftone" | "ember-storm" | "certificate";
}

export function StructureFlowCollection({
  variant = "fluid-field",
  ...props
}: StructureFlowCollectionProps) {
  // Renders the exact ThreeUI FluidFieldBackground registered component
  return <FluidFieldBackground {...props} />;
}

export default StructureFlowCollection;
