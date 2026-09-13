import { FormEvent, useState } from "react";
import { api } from "../api";

export function OrderForm({ onCreated }: { onCreated: () => void }) {
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [volumeM3, setVolumeM3] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createOrder({
        order_type: "delivery",
        dropoff_address: dropoffAddress,
        recipient_name: recipientName || null,
        package_volume_m3: volumeM3 ? Number(volumeM3) : null,
        package_weight_kg: weightKg ? Number(weightKg) : null,
      });
      setDropoffAddress("");
      setRecipientName("");
      setVolumeM3("");
      setWeightKg("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel">
      <h2>New order</h2>
      <label>
        Dropoff address
        <input
          value={dropoffAddress}
          onChange={(e) => setDropoffAddress(e.target.value)}
          placeholder="Ermou 1, Athens"
          required
        />
      </label>
      <label>
        Recipient name
        <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
      </label>
      <div className="row">
        <label>
          Volume (m3)
          <input type="number" step="0.01" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} />
        </label>
        <label>
          Weight (kg)
          <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Add order"}
      </button>
    </form>
  );
}
