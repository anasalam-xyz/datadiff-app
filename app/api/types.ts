export interface LatestVersion {
  version_no: number;
  row_count: number;
  column_count: number;
  created_at: string;
}

export interface Dataset {
  id: number; name: string; description: string | null; source: string | null;
  license: string | null; tags: string[]; primary_key: string[]; created_at: string;
  latest_version?: LatestVersion | null;
}

export interface Version {
  id: number; dataset_id: number; version_no: number; parent_version_id: number | null;
  file_name: string; file_size: number; file_sha256: string; row_count: number; column_count: number;
  // Backend VersionOut serializes this field as `columns_schema` (validation_alias only affects input).
  columns_schema: { name: string; dtype: string }[];
  created_by: string; created_at: string;
}

export type EntryType = "CREATED" | "VERSION_ADDED" | "TRANSFORMATION";
export interface EntryPayload {
  name?: string;
  primary_key?: string[];
  version_no?: number;
  file_name?: string;
  file_sha256?: string;
  file_size?: number;
  row_count?: number;
  column_count?: number;
  diff_vs_previous?: {
    from_version: number;
    mode: string;
    added: number;
    deleted: number;
    modified: number | null;
    unchanged: number;
    columns_added: number;
    columns_removed: number;
    columns_dtype_changed: number;
  };
  type?: string;
  params?: Record<string, unknown>;
  description?: string;
  from_version?: number;
  to_version?: number;
  [key: string]: unknown;
}

export interface Entry {
  id: number; dataset_id: number; seq: number; entry_type: EntryType;
  version_id: number | null; transformation_id: number | null; payload: EntryPayload;
  actor_type: string; actor_label: string; created_at: string; prev_hash: string; entry_hash: string;
}

export interface Transformation {
  id: number; dataset_id: number; type: string; params: Record<string, unknown>;
  description: string | null; from_version: number | null; to_version: number | null;
  actor_label: string; created_at: string;
}

export interface VerifyResult {
  valid: boolean; entries_checked: number; first_broken_seq: number | null;
  reason: string | null; file_mismatches: { version_no: number; expected: string; actual: string }[];
}

export interface Diff {
  from_version: number; to_version: number; mode: "primary_key" | "row_hash";
  summary: {
    mode: string; rows_a: number; rows_b: number; row_delta: number; added: number; deleted: number;
    modified: number | null; unchanged: number; columns_added: number; columns_removed: number;
    columns_dtype_changed: number;
  };
  schema_diff: {
    columns_added: string[]; columns_removed: string[];
    dtype_changed: { column: string; from: string; to: string }[];
    possible_renames: { from: string; to: string }[];
  };
  rows: {
    added: Record<string, string | null>[]; deleted: Record<string, string | null>[];
    modified: { key: Record<string, string | null>; changes: { column: string; old: string | null; new: string | null }[] }[];
  };
  column_changes: Record<string, number>; warnings: string[]; page: { limit: number; offset: number };
}
