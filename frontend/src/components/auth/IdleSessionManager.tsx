"use client";

import { useIdleSession } from "@/hooks/useIdleSession";

export default function IdleSessionManager() {
  useIdleSession();
  return null;
}
