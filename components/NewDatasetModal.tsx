"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { api, apiHeaders, ApiError, errMsg, unwrap } from "@/app/api/client";
import { qk } from "@/app/api/keys";
import type { Dataset } from "@/app/api/types";

interface NewDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewDatasetModal({ isOpen, onClose }: NewDatasetModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [license, setLicense] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [pkInput, setPkInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSource("");
    setLicense("");
    setTagsInput("");
    setPkInput("");
    setFormError(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const primary_key = pkInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      return unwrap<Dataset>(
        await api.POST("/api/v1/datasets", {
          params: { header: apiHeaders },
          body: {
            name: name.trim(),
            description: description.trim() || null,
            source: source.trim() || null,
            license: license.trim() || null,
            tags,
            primary_key,
          },
        })
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.datasets });
      toast.success(`Dataset "${data.name}" created`);
      resetForm();
      onClose();
      router.push(`/datasets/${data.id}/passport`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setFormError("A dataset with that name already exists");
      } else {
        setFormError(errMsg(err));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Dataset name is required");
      return;
    }
    setFormError(null);
    createMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create new dataset"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
            Dataset Name <span className="text-bad">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            className="input"
            placeholder="e.g. loan-applications-v1"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (formError) setFormError(null);
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
            Description
          </label>
          <textarea
            rows={2}
            className="input resize-none"
            placeholder="What data does this collection store?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
              Source
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. S3, Warehouse, Kaggle"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
              License
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. MIT, CC-BY-4.0"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
            Tags
          </label>
          <input
            type="text"
            className="input"
            placeholder="tabular, credit, evaluation (comma-separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-subtle mb-1.5">
            Primary Key Columns
          </label>
          <input
            type="text"
            className="input font-mono text-xs"
            placeholder="e.g. id, user_id (comma-separated)"
            value={pkInput}
            onChange={(e) => setPkInput(e.target.value)}
          />
          <p className="text-xs text-mute mt-1.5">
            Needed to detect modified rows. Leave empty to only detect added/deleted rows.
          </p>
        </div>

        {formError && (
          <div className="p-3 rounded-control bg-bad-soft text-bad text-xs font-semibold">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-solid"
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create dataset
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
