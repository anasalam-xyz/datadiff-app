"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Home, LogOut, Plus, Settings, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { ease } from "./motion";
import { api, getActorName, saveActorName } from "@/app/api/client";
import NewDatasetModal from "@/components/NewDatasetModal";

function subscribeToActor(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("datadiff-actor-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("datadiff-actor-change", onStoreChange);
  };
}

function getServerActorName() {
  return "";
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [createDatasetOpen, setCreateDatasetOpen] = useState(false);
  const actor = useSyncExternalStore(subscribeToActor, getActorName, getServerActorName);
  const healthQuery = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const { response } = await api.GET("/health");
      if (!response.ok) throw new Error("API is unavailable");
      return true;
    },
    refetchInterval: 10_000,
    retry: false,
  });

  return (
    <div className="h-dvh overflow-hidden p-2 md:p-8">
      <div className="app-frame">
        <aside className="sidebar relative z-30">
          <Link href="/" title="DataDiff home" aria-label="DataDiff home" className="mb-8 flex items-center justify-center">
            <Image
              src="/logo_datadiff.jpeg"
              alt="DataDiff logo"
              width={44}
              height={44}
              className="size-11 rounded-control object-cover"
              priority
            />
          </Link>
          <nav aria-label="Quick actions" className="flex flex-col items-center gap-1">
            <Link href="/" className="nav-icon group relative text-white" aria-label="Home" title="Home">
              <Home size={19} fill="currentColor" strokeWidth={1.5} />
              <span className="sidebar-tooltip">Home</span>
            </Link>
            <button
              type="button"
              className="nav-icon group relative"
              aria-label="New dataset"
              title="New dataset"
              onClick={() => setCreateDatasetOpen(true)}
            >
              <Plus size={19} />
              <span className="sidebar-tooltip">New dataset</span>
            </button>
            <button type="button" className="nav-icon group relative" aria-label="Profile" title="Profile">
              <UserRound size={18} />
              <span className="sidebar-tooltip">Profile</span>
            </button>
            <button type="button" className="nav-icon group relative" aria-label="Settings" title="Settings">
              <Settings size={18} />
              <span className="sidebar-tooltip">Settings</span>
            </button>
          </nav>
          <button type="button" className="nav-icon group relative mt-auto" aria-label="Logout" title="Logout">
            <LogOut size={18} />
            <span className="sidebar-tooltip">Logout</span>
          </button>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain py-2 pr-2">
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2.5">
            <label className="chip gap-2 py-1.5 text-xs">
              <span className="text-mute">Acting as:</span>
              <input
                aria-label="Actor name"
                className="w-24 bg-transparent font-semibold text-ink outline-none placeholder:text-mute"
                value={actor}
                onChange={(event) => {
                  saveActorName(event.target.value);
                }}
                placeholder="your name"
              />
            </label>
            <span
              className="chip gap-2 py-1.5 text-xs"
              title={healthQuery.isSuccess ? "API is responding" : healthQuery.isError ? "API is unreachable" : "Checking API health"}
              aria-live="polite"
            >
              <span className={`size-1.5 rounded-full ${healthQuery.isSuccess ? "bg-ok" : healthQuery.isError ? "bg-bad" : "animate-pulse bg-warn"}`} />
              {healthQuery.isSuccess ? "API connected" : healthQuery.isError ? "API offline" : "Connecting..."}
            </span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm gap-1.5"
            >
              <BookOpen size={13} /> API docs <ExternalLink size={11} />
            </a>
          </div>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <NewDatasetModal isOpen={createDatasetOpen} onClose={() => setCreateDatasetOpen(false)} />
    </div>
  );
}
