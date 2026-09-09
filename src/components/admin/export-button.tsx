"use client";

import { useState, useTransition } from "react";
import { exportEnquiriesAction } from "@/app/admin/(dashboard)/enquiries/actions";

/**
 * Builds the CSV on the server, then hands it to the browser as a Blob.
 * Doing it this way keeps the query (and the enquiry data) server-side and
 * avoids a public download endpoint that would need its own access control.
 */
export function ExportButton({ type, status }: { type: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            try {
              const formData = new FormData();
              formData.set("type", type);
              formData.set("status", status);
              const { filename, csv } = await exportEnquiriesAction(formData);

              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
            } catch {
              setError("Export failed. Please try again.");
            }
          })
        }
      >
        {pending ? "Preparing…" : "Export CSV"}
      </button>
      {error ? <span className="text-[0.75rem] text-[#8c1d18]">{error}</span> : null}
    </div>
  );
}
