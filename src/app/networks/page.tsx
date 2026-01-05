"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NetworkConfig = { name: string; driver?: string };

export default function NetworksPage() {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [newNetwork, setNewNetwork] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/networks");
      const data = (await response.json()) as { networks: NetworkConfig[] };
      setNetworks(data.networks || []);
    }

    load().catch(() => null);
  }, []);

  const handleSave = async (next: NetworkConfig[]) => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/networks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networks: next }),
      });
      if (!response.ok) {
        throw new Error("Failed to save networks");
      }
      setNetworks(next);
      setSaveMessage("Saved");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const handleAdd = async () => {
    const name = newNetwork.trim();
    if (!name) return;
    if (networks.some((network) => network.name === name)) {
      setSaveMessage("Network already exists");
      return;
    }
    const driver = newDriver.trim();
    const next = [...networks, { name, driver: driver || undefined }];
    setNewNetwork("");
    setNewDriver("");
    await handleSave(next);
  };

  const handleRemove = async (name: string) => {
    const next = networks.filter((network) => network.name !== name);
    await handleSave(next);
  };

  const handleDriverChange = (name: string, driver: string) => {
    setNetworks((prev) =>
      prev.map((network) =>
        network.name === name
          ? { ...network, driver: driver.trim() || undefined }
          : network
      )
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Networks
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Default networks
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
            >
              ← Back to settings
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              New network
              <input
                className="mt-2 w-full min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={newNetwork}
                onChange={(event) => setNewNetwork(event.target.value)}
                placeholder="backend"
              />
            </label>
            <label className="text-sm text-slate-600">
              Driver
              <input
                className="mt-2 w-full min-w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                value={newDriver}
                onChange={(event) => setNewDriver(event.target.value)}
                placeholder="bridge"
              />
            </label>
            <button
              onClick={handleAdd}
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              disabled={isSaving}
            >
              Add network
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {networks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No networks configured yet.
              </p>
            ) : (
              networks.map((network) => (
                <div
                  key={network.name}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {network.name}
                    </span>
                    <input
                      className="w-48 rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700"
                      placeholder="driver"
                      value={network.driver || ""}
                      onChange={(event) =>
                        handleDriverChange(network.name, event.target.value)
                      }
                      onBlur={() => handleSave(networks)}
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(network.name)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                    disabled={isSaving}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {saveMessage ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {saveMessage}
          </div>
        ) : null}
      </div>
    </main>
  );
}
