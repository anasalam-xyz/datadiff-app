"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { api, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Dataset } from "@/app/api/types";
import DatasetCard from "@/components/DatasetCard";
import NewDatasetModal from "@/components/NewDatasetModal";
import EmptyState from "@/components/EmptyState";
import { PassportHero } from "@/components/Illustrations";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const datasetsQuery = useQuery({
    queryKey: qk.datasets,
    queryFn: async () => unwrap<Dataset[]>(await api.GET("/api/v1/datasets")),
  });

  const datasets = datasetsQuery.data ?? [];
  const filteredDatasets = datasets.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-line text-ink">
            <ShieldCheck size={14} className="text-ok" />
            <span>Cryptographic provenance for AI data</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            Dataset Passports
          </h1>
          <p className="text-sm text-subtle leading-relaxed">
            Every change to an AI dataset recorded as a tamper-evident, hash-chained history.
            Track versions, verify lineage, and audit schema modifications.
          </p>
        </div>
        <div className="hidden sm:block shrink-0 -my-4 opacity-90">
          <PassportHero className="h-28 w-auto" />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="text"
            className="input pl-9 text-xs sm:text-sm"
            placeholder="Search datasets by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-mute hidden sm:inline num">
            {datasets.length} dataset{datasets.length === 1 ? "" : "s"} total
          </span>
          <button
            type="button"
            className="btn btn-solid shrink-0"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} />
            New dataset
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {datasetsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5.5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton size-9 rounded-control shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
              <div className="skeleton h-10 w-full" />
              <div className="flex gap-2">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="pt-3 border-t border-line flex justify-between">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : datasetsQuery.isError ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-bad font-semibold text-sm">
            {errMsg(datasetsQuery.error)}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => datasetsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : datasets.length === 0 ? (
        <EmptyState
          title="No datasets yet"
          description="Create your first dataset to start logging versions, tracking transformations, and verifying hash chains."
          action={
            <button
              type="button"
              className="btn btn-solid"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={16} />
              New dataset
            </button>
          }
        />
      ) : filteredDatasets.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <p className="font-bold text-ink">No datasets match &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-xs text-mute">Try searching for a different keyword or tag.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDatasets.map((d) => (
            <DatasetCard key={d.id} dataset={d} />
          ))}
        </div>
      )}

      {/* New Dataset Modal */}
      <NewDatasetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
