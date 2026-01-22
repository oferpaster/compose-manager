"use client";

import { ServiceConfig } from "@/lib/compose";

type PortsOverviewSectionProps = {
  services: ServiceConfig[];
  resolvePortMapping: (port: string) => string;
  onOpenModal: () => void;
};

export default function PortsOverviewSection({
  services,
  resolvePortMapping,
  onOpenModal,
}: PortsOverviewSectionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Ports Overview</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onOpenModal();
            }}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
            title="Open"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M7 3H3v4a1 1 0 1 0 2 0V6h2a1 1 0 1 0 0-2zm14 0h-4a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0V3zM5 17a1 1 0 0 0-2 0v4h4a1 1 0 1 0 0-2H5v-2zm14 0v2h-2a1 1 0 1 0 0 2h4v-4a1 1 0 0 0-2 0z" />
            </svg>
          </button>
          <span className="text-sm text-slate-500">Toggle</span>
        </div>
      </summary>
      <div className="mt-4 space-y-4">
        {services.filter((service) => service.ports.length > 0).length === 0 ? (
          <p className="text-sm text-slate-500">No port mappings defined.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Ports</th>
                </tr>
              </thead>
              <tbody>
                {services
                  .filter((service) => service.ports.length > 0)
                  .map((service) => (
                    <tr key={`ports-${service.id}`} className="border-t">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {service.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="space-y-1">
                          {service.ports.map((port, index) => (
                            <div key={`${service.id}-port-${index}`}>
                              {resolvePortMapping(port)}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
