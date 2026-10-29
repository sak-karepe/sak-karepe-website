"use client";
import { ErrorMessage } from "@/components/error-message";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorMessage error={error} retry={retry} />;
}
