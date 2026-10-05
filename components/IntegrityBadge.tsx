"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

export type IntegrityState = "unknown" | "valid" | "broken";
const Ctx = createContext<{ state: IntegrityState; setState: (s: IntegrityState) => void } | null>(null);

export function IntegrityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IntegrityState>("unknown");
  return <Ctx.Provider value={{ state, setState }}>{children}</Ctx.Provider>;
}

export function useIntegrity() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIntegrity must be used inside <IntegrityProvider>");
  return c;
}

const MAP = {
  unknown: { cls: "bg-card text-mute", label: "Not verified yet", Icon: ShieldQuestion },
  valid: { cls: "bg-ok-soft text-ok", label: "Verified", Icon: ShieldCheck },
  broken: { cls: "bg-bad-soft text-bad", label: "Tampered", Icon: ShieldAlert },
} as const;

export default function IntegrityBadge() {
  const { state } = useIntegrity();
  const { cls, label, Icon } = MAP[state];
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={state}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.18 }}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}
      >
        <Icon size={14} /> {label}
      </motion.span>
    </AnimatePresence>
  );
}
