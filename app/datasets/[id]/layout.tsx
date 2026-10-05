"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import { api, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Dataset, Version } from "@/app/api/types";
import IntegrityBadge, { IntegrityProvider } from "@/components/IntegrityBadge";

const TABS = [
  { slug: "passport", label: "Passport" },
  { slug: "versions", label: "Versions" },
  { slug: "compare", label: "Compare" },
] as const;

function DatasetShell({ id, children }: { id: number; children: ReactNode }) {
  const pathname = usePathname();
  const ds = useQuery({
    queryKey: qk.dataset(id),
    queryFn: async () =>
      unwrap<Dataset>(await api.GET("/api/v1/datasets/{dataset_id}", { params: { path: { dataset_id: id } } })),
  });
  const vs = useQuery({
    queryKey: qk.versions(id),
    queryFn: async () =>
      unwrap<Version[]>(await api.GET("/api/v1/datasets/{dataset_id}/versions", { params: { path: { dataset_id: id } } })),
  });
  const d = ds.data;
  const latest = vs.data?.at(-1)?.version_no;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-mute hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Datasets
      </Link>

      <div className="card p-6 flex items-start justify-between gap-6">
        <div className="min-w-0 space-y-3">
          {ds.isError ? (
            <p className="text-bad text-sm">{errMsg(ds.error)}</p>
          ) : d ? (
            <>
              <h1 className="text-3xl font-extrabold truncate">{d.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {latest && <span className="chip num">Latest v{latest}</span>}
                {d.primary_key.length ? (
                  d.primary_key.map((k) => (
                    <span key={k} className="chip font-mono"><KeyRound size={11} /> {k}</span>
                  ))
                ) : (
                  <span className="pill-warn">No primary key</span>
                )}
                {d.tags.map((t) => <span key={t} className="chip text-subtle">{t}</span>)}
              </div>
            </>
          ) : (
            <>
              <div className="skeleton h-9 w-72" />
              <div className="skeleton h-6 w-48" />
            </>
          )}
        </div>
        <IntegrityBadge />
      </div>

      <nav className="flex gap-6">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/datasets/${id}/${t.slug}`} className="tab"
                data-active={pathname.startsWith(`/datasets/${id}/${t.slug}`)}>
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

export default function DatasetLayout({ children }: { children: ReactNode }) {
  const id = Number(useParams<{ id: string }>().id);
  return (
    <IntegrityProvider key={id}>
      <DatasetShell id={id}>{children}</DatasetShell>
    </IntegrityProvider>
  );
}
