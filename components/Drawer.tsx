"use client";
import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ease } from "./motion";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-2xl",
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease }}
            className={`relative w-full ${width} bg-surface h-full shadow-frame z-10 flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-line flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-xl font-extrabold text-ink truncate">{title}</h3>
                {subtitle && <p className="text-xs text-mute mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="size-8 rounded-control grid place-items-center text-mute hover:text-ink hover:bg-card transition-colors shrink-0"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
