"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "./Toast";

interface HashChipProps {
  hash: string;
  prefix?: string;
  length?: number;
  className?: string;
}

export default function HashChip({
  hash,
  prefix,
  length = 8,
  className = "",
}: HashChipProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  if (!hash) return <span className="text-mute font-mono text-xs">–</span>;

  const short = hash.length > length + 4
    ? `${hash.slice(0, length)}…${hash.slice(-4)}`
    : hash.slice(0, length);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    toast.info("Hash copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      title={`${hash} (click to copy)`}
      onClick={handleCopy}
      className={`hash-chip inline-flex items-center gap-1 text-[11px] font-mono select-none ${className}`}
    >
      {prefix && <span className="text-mute">{prefix}:</span>}
      <span>{copied ? "copied" : short}</span>
      {copied ? (
        <Check size={11} className="text-ok shrink-0" />
      ) : (
        <Copy size={11} className="text-mute opacity-60 group-hover:opacity-100 shrink-0" />
      )}
    </button>
  );
}
