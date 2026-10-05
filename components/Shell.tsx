"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Home } from "lucide-react";
import type { ReactNode } from "react";
import { ease } from "./motion";

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="app-frame">
        <aside className="sidebar">
          <span className="text-white text-2xl font-extrabold mb-6">P.</span>
          <Link href="/" title="Datasets" className="nav-icon" data-active={pathname === "/" || pathname.startsWith("/datasets")}>
            <Home size={20} />
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            title="API docs"
            className="nav-icon mt-auto"
          >
            <BookOpen size={20} />
          </a>
        </aside>
        <main className="flex-1 min-w-0 py-2 pr-2">
          <div className="flex justify-end mb-5">
            <span className="chip">
              <span className="size-1.5 rounded-full bg-ok" /> Acting as web-ui
            </span>
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
    </div>
  );
}
