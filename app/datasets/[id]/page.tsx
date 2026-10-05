"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DatasetIndex() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/datasets/${id}/passport`); }, [id, router]);
  return null;
}
