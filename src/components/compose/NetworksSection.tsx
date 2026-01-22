"use client";

type NetworkItem = {
  name: string;
  driver?: string;
};

type NetworksSectionProps = {
  networks: NetworkItem[];
  selectedNetworks: string[];
  onToggle: (network: string) => void;
};

export default function NetworksSection({
  networks,
  selectedNetworks,
  onToggle,
}: NetworksSectionProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Networks</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {networks.map((network) => (
          <button
            key={network.name}
            onClick={() => onToggle(network.name)}
            className={`network-pill rounded-full border px-3 py-1 text-sm ${
              selectedNetworks.includes(network.name)
                ? "network-pill-selected border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {network.name}
          </button>
        ))}
      </div>
    </section>
  );
}
