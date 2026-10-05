"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { api, apiHeaders, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Transformation, Version } from "@/app/api/types";
import { useIntegrity } from "./IntegrityBadge";

interface LogTransformationModalProps {
  datasetId: number;
  isOpen: boolean;
  onClose: () => void;
  versions: Version[];
}

const TRANSFORMATION_TYPES = [
  "dedup",
  "normalize",
  "filter",
  "impute",
  "drop_column",
  "rename",
  "join",
  "custom",
] as const;

export default function LogTransformationModal({
  datasetId,
  isOpen,
  onClose,
  versions,
}: LogTransformationModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { setState: setIntegrity } = useIntegrity();

  const [type, setType] = useState<string>("dedup");
  const [description, setDescription] = useState("");
  const [fromVersion, setFromVersion] = useState<number>(
    versions.length > 1 ? versions[versions.length - 2].version_no : versions[0]?.version_no ?? 1
  );
  const [toVersion, setToVersion] = useState<number>(
    versions.length > 0 ? versions[versions.length - 1].version_no : 2
  );
  const [paramsText, setParamsText] = useState("{\n  \n}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const resetForm = () => {
    setType("dedup");
    setDescription("");
    setParamsText("{\n  \n}");
    setJsonError(null);
    setServerError(null);
  };

  const validateJson = (text: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(text || "{}");
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("Params must be a valid JSON object");
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch (error: unknown) {
      setJsonError(`Invalid JSON: ${error instanceof Error ? error.message : "Invalid JSON"}`);
      return null;
    }
  };

  const mutation = useMutation({
    mutationFn: async (parsedParams: Record<string, unknown>) => {
      return unwrap<Transformation>(
        await api.POST("/api/v1/datasets/{dataset_id}/transformations", {
          params: { path: { dataset_id: datasetId }, header: apiHeaders() },
          body: {
            type,
            params: parsedParams,
            description: description.trim() || null,
            from_version: fromVersion,
            to_version: toVersion,
          },
        })
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.transformations(datasetId) });
      queryClient.invalidateQueries({ queryKey: qk.passport(datasetId) });
      queryClient.invalidateQueries({ queryKey: qk.versions(datasetId) });
      setIntegrity("unknown");
      toast.success(`Transformation "${data.type}" logged`);
      resetForm();
      onClose();
    },
    onError: (err) => {
      setServerError(errMsg(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (fromVersion === toVersion) {
      setServerError("From version and To version must differ");
      return;
    }

    const parsedParams = validateJson(paramsText);
    if (!parsedParams) return;

    mutation.mutate(parsedParams);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Log transformation"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
            Transformation Type <span className="text-bad">*</span>
          </label>
          <select
            className="input cursor-pointer"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TRANSFORMATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* From Version and To Version */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
              From Version <span className="text-bad">*</span>
            </label>
            <select
              className="input cursor-pointer"
              value={fromVersion}
              onChange={(e) => setFromVersion(Number(e.target.value))}
            >
              {versions.map((v) => (
                <option key={v.version_no} value={v.version_no}>
                  v{v.version_no} ({v.file_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
              To Version <span className="text-bad">*</span>
            </label>
            <select
              className="input cursor-pointer"
              value={toVersion}
              onChange={(e) => setToVersion(Number(e.target.value))}
            >
              {versions.map((v) => (
                <option key={v.version_no} value={v.version_no}>
                  v{v.version_no} ({v.file_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
            Description
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Dropped duplicate IDs and normalized age column"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Params JSON Editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-subtle">
              Parameters (JSON)
            </label>
            <span className="text-[11px] text-mute font-mono">object</span>
          </div>
          <textarea
            rows={4}
            className="input font-mono text-xs resize-none"
            placeholder="{}"
            value={paramsText}
            onChange={(e) => {
              setParamsText(e.target.value);
              validateJson(e.target.value);
            }}
          />
          {jsonError && (
            <p className="text-bad text-xs font-medium mt-1">{jsonError}</p>
          )}
        </div>

        {serverError && (
          <div className="p-3 rounded-control bg-bad-soft text-bad text-xs font-semibold">
            {serverError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-solid"
            disabled={mutation.isPending || !!jsonError}
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Logging...</span>
              </>
            ) : (
              <>
                <Wand2 size={16} />
                <span>Log transformation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
