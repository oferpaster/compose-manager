"use client";

import { ServiceConfig } from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

type ServiceGroup = {
  groupId: string;
  serviceId: string;
  instances: ServiceConfig[];
};

type ConfiguredServicesSectionProps = {
  groups: ServiceGroup[];
  catalogServices: ServiceCatalogItem[];
  serviceSearch: string;
  onServiceSearchChange: (value: string) => void;
  onEditGroup: (groupId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, direction: "up" | "down") => void;
  onHoverGroup: (groupId: string | null) => void;
};

export default function ConfiguredServicesSection({
  groups,
  catalogServices,
  serviceSearch,
  onServiceSearchChange,
  onEditGroup,
  onRemoveGroup,
  onMoveGroup,
  onHoverGroup,
}: ConfiguredServicesSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Configured services
        </h2>
        <div className="flex items-center gap-3">
          <input
            value={serviceSearch}
            onChange={(event) => onServiceSearchChange(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
            placeholder="Search services..."
          />
          <span className="text-xs uppercase tracking-widest text-slate-400">
            grouped
          </span>
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No services match your search.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, index) => {
            const serviceInfo = catalogServices.find(
              (item) => item.id === group.serviceId
            );
            return (
              <div
                key={group.groupId}
                onMouseEnter={() => onHoverGroup(group.groupId)}
                onMouseLeave={() => onHoverGroup(null)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {serviceInfo?.name || group.serviceId}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {group.instances.length} instance(s):{" "}
                      {group.instances.map((instance) => instance.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onEditGroup(group.groupId)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onRemoveGroup(group.groupId)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => onMoveGroup(group.groupId, "up")}
                      disabled={index === 0}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-40"
                    >
                      Move up
                    </button>
                    <button
                      onClick={() => onMoveGroup(group.groupId, "down")}
                      disabled={index === groups.length - 1}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-40"
                    >
                      Move down
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
