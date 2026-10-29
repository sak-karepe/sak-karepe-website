"use client";
import { ErrorMessage } from "@/components/error-message";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorMessage error={error} retry={retry} admin />;
}
