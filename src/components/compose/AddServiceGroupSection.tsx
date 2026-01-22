"use client";

import { ServiceCatalogItem } from "@/lib/serviceCatalog";

type AddServiceGroupSectionProps = {
  services: ServiceCatalogItem[];
  selectedService: ServiceCatalogItem | null;
  serviceQuery: string;
  selectedVersion: string;
  serviceCount: number;
  isPlayground: boolean;
  onServiceQueryChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onServiceCountChange: (value: number) => void;
  onAdd: () => void;
};

export default function AddServiceGroupSection({
  services,
  selectedService,
  serviceQuery,
  selectedVersion,
  serviceCount,
  isPlayground,
  onServiceQueryChange,
  onVersionChange,
  onServiceCountChange,
  onAdd,
}: AddServiceGroupSectionProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Add service group</h2>
      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_0.7fr_auto]">
        <div>
          <label className="text-sm text-slate-600">Service</label>
          <input
            list="services"
            value={serviceQuery}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="Search service..."
            onChange={(event) => onServiceQueryChange(event.target.value)}
          />
          <datalist id="services">
            {services.map((service) => (
              <option key={service.id} value={service.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-sm text-slate-600">Version</label>
          <select
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            value={selectedVersion}
            onChange={(event) => onVersionChange(event.target.value)}
            disabled={!selectedService}
          >
            <option value="">Default</option>
            {selectedService?.versions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-600">Instances</label>
          <input
            type="number"
            min={1}
            value={serviceCount}
            onChange={(event) =>
              onServiceCountChange(Math.max(1, Number(event.target.value) || 1))
            }
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={onAdd}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {isPlayground ? "Add" : "Configure"}
          </button>
        </div>
      </div>
    </section>
  );
}
