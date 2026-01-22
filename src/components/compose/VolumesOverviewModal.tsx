"use client";

import { ComposeConfig } from "@/lib/compose";
import { ServiceCatalogItem } from "@/lib/serviceCatalog";

type CatalogSummary = {
  services: ServiceCatalogItem[];
  networks: { name: string; driver?: string }[];
};

type VolumesOverviewModalProps = {
  open: boolean;
  onClose: () => void;
  config: ComposeConfig;
  catalog: CatalogSummary;
};

export default function VolumesOverviewModal({
  open,
  onClose,
  config,
  catalog,
}: VolumesOverviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="flex h-[88vh] w-[88vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Volumes Overview
            </h2>
            <p className="text-sm text-slate-500">{config.name || "Compose"}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-auto">
          {config.services.filter((service) => {
            const info = catalog.services.find(
              (item) => item.id === service.serviceId
            );
            const hasProps =
              Boolean(info?.springBoot) && Boolean(service.applicationProperties);
            return service.volumes.length > 0 || hasProps;
          }).length === 0 ? (
            <p className="text-sm text-slate-500">No volumes mounted.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Volumes</th>
                  </tr>
                </thead>
                <tbody>
                  {config.services.map((service) => {
                    const info = catalog.services.find(
                      (item) => item.id === service.serviceId
                    );
                    const volumes = [...service.volumes];
                    if (info?.springBoot && service.applicationProperties) {
                      volumes.push(
                        `./${service.name}/application.properties:/opt/app/application.properties`
                      );
                    }
                    if (volumes.length === 0) return null;
                    return (
                      <tr
                        key={`volumes-modal-${service.id}`}
                        className="border-t"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {service.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="space-y-1">
                            {volumes.map((volume, index) => (
                              <div key={`${service.id}-modal-volume-${index}`}>
                                {volume}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
