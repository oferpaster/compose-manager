"use client";

import { ComposeConfig } from "@/lib/compose";

type PortsOverviewModalProps = {
  open: boolean;
  onClose: () => void;
  config: ComposeConfig;
  resolvePortMapping: (port: string) => string;
};

export default function PortsOverviewModal({
  open,
  onClose,
  config,
  resolvePortMapping,
}: PortsOverviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ports Overview
            </h2>
            <p className="text-sm text-slate-500">
              {config.name || "Compose"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-auto">
          {config.services.filter((service) => service.ports.length > 0)
            .length === 0 ? (
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
                  {config.services
                    .filter((service) => service.ports.length > 0)
                    .map((service) => (
                      <tr
                        key={`ports-modal-${service.id}`}
                        className="border-t"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {service.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="space-y-1">
                            {service.ports.map((port, index) => (
                              <div
                                key={`${service.id}-modal-port-${index}`}
                              >
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
      </div>
    </div>
  );
}
