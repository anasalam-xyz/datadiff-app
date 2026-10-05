"use client";
import { useRef, useState } from "react";
import { UploadCloud, File, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "./Toast";
import type { Version } from "@/app/api/types";

interface FileDropzoneProps {
  datasetId: number;
  onUploaded: (version: Version) => void;
}

export default function FileDropzone({ datasetId, onUploaded }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "json", "jsonl"].includes(ext)) {
      setErrorMsg("Unsupported file type. Please upload a .csv, .json, or .jsonl file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("File size exceeds 50 MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (!apiKey) {
        throw new Error("Set NEXT_PUBLIC_API_KEY in .env.local to upload files.");
      }

      const res = await fetch(`${baseUrl}/api/v1/datasets/${datasetId}/versions`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "X-Actor": "web-ui",
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.error?.message ?? res.statusText ?? "Upload failed";
        setErrorMsg(message);
        return;
      }

      toast.success(`Version ${data.version_no} added`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded(data);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card p-5 space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200 ${
          isDragging
            ? "border-ink bg-card-hover"
            : "border-line hover:border-subtle bg-surface"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.jsonl"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="size-11 rounded-control bg-card grid place-items-center text-ink mb-3 shrink-0">
          <UploadCloud size={20} />
        </div>

        <p className="font-bold text-sm text-ink">
          Click or drag & drop to upload dataset version
        </p>
        <p className="text-xs text-mute mt-1">
          Supports CSV, JSON, and JSONL formats (max 50 MB)
        </p>
      </div>

      {/* Selected File & Upload Button */}
      {selectedFile && (
        <div className="bg-surface border border-line rounded-control p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-control bg-card grid place-items-center text-ink shrink-0">
              <File size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-mute font-mono">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-solid btn-sm"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={13} />
                  <span>Upload version</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Inline Error (422, duplicate PK, etc.) */}
      {errorMsg && (
        <div className="p-3 rounded-control bg-bad-soft border border-bad/20 text-bad flex items-start gap-2.5 text-xs font-semibold">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}
    </div>
  );
}
