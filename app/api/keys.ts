export const qk = {
  datasets: ["datasets"] as const,
  dataset: (id: number) => ["dataset", id] as const,
  versions: (id: number) => ["versions", id] as const,
  passport: (id: number, type = "all") => ["passport", id, type] as const,
  transformations: (id: number) => ["transformations", id] as const,
};
