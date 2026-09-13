import { ChangeEvent, useState } from "react";
import { api } from "../api";

export function CsvUpload({ onUploaded }: { onUploaded: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const result = await api.uploadOrdersCsv(file);
      setStatus(
        `Created ${result.created_count} orders, ${result.failed_count} failed` +
          (result.failed_count > 0
            ? `: ${result.failed.slice(0, 3).map((f) => `row ${f.row}: ${f.error}`).join("; ")}`
            : "")
      );
      onUploaded();
    } catch (err) {
      setStatus(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="panel">
      <h2>Bulk import (CSV)</h2>
      <p className="hint">
        Columns: order_type, pickup_address, dropoff_address, package_volume_m3, package_weight_kg,
        preferred_window_start, preferred_window_end, recipient_name, recipient_phone, special_notes
      </p>
      <input type="file" accept=".csv" onChange={handleChange} disabled={uploading} />
      {status && <p>{status}</p>}
    </div>
  );
}
