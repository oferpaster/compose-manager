"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import { ComposeConfig, ServiceConfig } from "@/lib/compose";

type DependencyEdge = {
  from: string;
  to: string;
  condition: string;
};

type DependencyMapModalProps = {
  open: boolean;
  onClose: () => void;
  config: ComposeConfig;
  updateDependenciesForService: (
    serviceName: string,
    nextDependsOn: ServiceConfig["dependsOn"]
  ) => void;
};

export default function DependencyMapModal({
  open,
  onClose,
  config,
  updateDependenciesForService,
}: DependencyMapModalProps) {
  const dependencyNetworkRef = useRef<HTMLDivElement | null>(null);
  const dependencyNetworkInstance = useRef<Network | null>(null);
  const dependencyNodesRef = useRef<DataSet<{
    id: string;
    label: string;
    color?: unknown;
    font?: unknown;
  }> | null>(null);
  const [dependencyServiceName, setDependencyServiceName] = useState("");
  const [dependencyView, setDependencyView] = useState<"hierarchical" | "free">(
    "hierarchical"
  );
  const [showAllDependencyEdges, setShowAllDependencyEdges] = useState(true);
  const [dependedOnOpen, setDependedOnOpen] = useState(false);
  const readTheme = useCallback(() => {
    if (typeof document === "undefined") return false;
    const theme = document.documentElement.dataset.theme;
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
  }, []);
  const [isDarkTheme, setIsDarkTheme] = useState(() => readTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setIsDarkTheme(readTheme());
    });
    observer.observe(document.documentElement, { attributes: true });

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleMedia = () => setIsDarkTheme(readTheme());
    media?.addEventListener?.("change", handleMedia);

    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", handleMedia);
    };
  }, [readTheme]);

  const dependencyServiceNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    config.services.forEach((service) => {
      if (!service.name || seen.has(service.name)) return;
      seen.add(service.name);
      names.push(service.name);
    });
    return names;
  }, [config.services]);

  const effectiveDependencyServiceName = useMemo(() => {
    if (!dependencyServiceNames.length) return "";
    if (dependencyServiceName && dependencyServiceNames.includes(dependencyServiceName)) {
      return dependencyServiceName;
    }
    return dependencyServiceNames[0] || "";
  }, [dependencyServiceName, dependencyServiceNames]);

  const dependencyEdges = useMemo<DependencyEdge[]>(
    () =>
      config.services.flatMap((service) =>
        service.dependsOn
          .filter((entry) => entry.name)
          .map((entry) => ({
            from: service.name,
            to: entry.name,
            condition: entry.condition || "",
          }))
      ),
    [config.services]
  );

  const filteredDependencyEdges = useMemo(() => {
    if (showAllDependencyEdges || !effectiveDependencyServiceName) {
      return dependencyEdges;
    }
    return dependencyEdges.filter(
      (edge) =>
        edge.from === effectiveDependencyServiceName ||
        edge.to === effectiveDependencyServiceName
    );
  }, [dependencyEdges, showAllDependencyEdges, effectiveDependencyServiceName]);

  const focusNodeNames = useMemo(() => {
    if (showAllDependencyEdges || !effectiveDependencyServiceName) {
      return dependencyServiceNames;
    }
    const names = new Set<string>([effectiveDependencyServiceName]);
    filteredDependencyEdges.forEach((edge) => {
      names.add(edge.from);
      names.add(edge.to);
    });
    return dependencyServiceNames.filter((name) => names.has(name));
  }, [
    dependencyServiceNames,
    effectiveDependencyServiceName,
    filteredDependencyEdges,
    showAllDependencyEdges,
  ]);

  useEffect(() => {
    if (!open) {
      dependencyNetworkInstance.current?.destroy();
      dependencyNetworkInstance.current = null;
      dependencyNodesRef.current = null;
      return;
    }
    if (!dependencyNetworkRef.current) return;

    const nodes = new DataSet(
      focusNodeNames.map((name) => ({
        id: name,
        label: name,
      }))
    );
    dependencyNodesRef.current = nodes;
    const edges = new DataSet(
      filteredDependencyEdges.map((edge) => ({
        id: `${edge.from}->${edge.to}`,
        from: edge.from,
        to: edge.to,
        arrows: "to",
        label: edge.condition || "",
      }))
    );

    const isHierarchical = dependencyView === "hierarchical";
    const labelColor = isDarkTheme ? "#f8fafc" : "#0f172a";
    const edgeLabelColor = isDarkTheme ? "#e2e8f0" : "#475569";
    const selectedNodeFill = isDarkTheme ? "#334155" : "#0f172a";
    const selectedNodeStroke = isDarkTheme ? "#475569" : "#0f172a";
    const options: Record<string, unknown> = {
      autoResize: true,
      physics: {
        enabled: !isHierarchical,
        stabilization: false,
        barnesHut: {
          gravitationalConstant: -5200,
          springLength: 90,
          springConstant: 0.05,
          centralGravity: 0.7,
        },
      },
      nodes: {
        shape: "dot",
        size: 12,
        color: {
          background: "#94a3b8",
          border: "#64748b",
          highlight: {
            background: selectedNodeFill,
            border: selectedNodeStroke,
          },
        },
        font: { color: labelColor, size: 14, face: "ui-sans-serif" },
        scaling: {
          label: {
            enabled: true,
            min: 14,
            max: 14,
          },
        },
      },
      edges: {
        color: { color: "#94a3b8" },
        font: { color: edgeLabelColor, size: 10, align: "middle" },
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        smooth: isHierarchical
          ? { enabled: true, type: "cubicBezier" }
          : { enabled: true, type: "dynamic" },
      },
      interaction: { hover: true },
      configure: false,
    };
    if (isHierarchical) {
      options.layout = {
        hierarchical: {
          enabled: true,
          direction: "LR",
          sortMethod: "directed",
          nodeSpacing: 90,
          levelSeparation: 140,
        },
      };
    }

    const network = new Network(
      dependencyNetworkRef.current,
      { nodes, edges },
      options
    );
    dependencyNetworkInstance.current = network;
    network.on("selectNode", (params) => {
      const id = params.nodes[0];
      if (typeof id === "string") {
        setDependencyServiceName(id);
      }
    });
    network.fit({
      animation: { duration: 300, easingFunction: "easeInOutQuad" },
    });
    if (!isHierarchical) {
      setTimeout(() => {
        network.fit({
          animation: { duration: 300, easingFunction: "easeInOutQuad" },
        });
      }, 500);
    }

    return () => {
      network.destroy();
    };
  }, [open, focusNodeNames, filteredDependencyEdges, dependencyView, isDarkTheme]);

  useEffect(() => {
    if (!dependencyNodesRef.current) return;
    const nodes = dependencyNodesRef.current;
    focusNodeNames.forEach((name) => {
      const isSelected = name === effectiveDependencyServiceName;
      nodes.update({
        id: name,
        color: {
          background: isSelected ? (isDarkTheme ? "#334155" : "#0f172a") : "#94a3b8",
          border: isSelected ? (isDarkTheme ? "#475569" : "#0f172a") : "#64748b",
        },
        font: {
          color: isDarkTheme ? "#f8fafc" : "#0f172a",
          size: 14,
          face: "ui-sans-serif",
        },
      });
    });
  }, [effectiveDependencyServiceName, focusNodeNames, isDarkTheme]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex h-[88vh] w-[88vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Service Dependencies
            </h2>
            <p className="text-sm text-slate-500">
              {config.name || "Compose"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setDependencyView((prev) =>
                  prev === "hierarchical" ? "free" : "hierarchical"
                )
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
            >
              {dependencyView === "hierarchical" ? "Free layout" : "Hierarchical"}
            </button>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
        <div className="mt-4 grid flex-1 gap-6 overflow-hidden lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div
              ref={dependencyNetworkRef}
              className="h-full min-h-[560px] w-full flex-1"
            />
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
              <span>
                {showAllDependencyEdges ? "Showing all edges" : "Focused edges"}
              </span>
              <button
                onClick={() => setShowAllDependencyEdges((prev) => !prev)}
                className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600"
              >
                {showAllDependencyEdges ? "Focus selected" : "Show all"}
              </button>
            </div>
          </div>
          <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Edit dependencies
                </p>
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={() => setShowAllDependencyEdges((prev) => !prev)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  >
                    {showAllDependencyEdges ? "Focus this service" : "Show all"}
                  </button>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {effectiveDependencyServiceName || "Select a service"}
                </h3>
                <select
                  className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  value={effectiveDependencyServiceName}
                  onChange={(event) => setDependencyServiceName(event.target.value)}
                >
                  {dependencyServiceNames.map((name) => (
                    <option key={`dep-select-${name}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {effectiveDependencyServiceName ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Dependencies
                    </h4>
                    <button
                      onClick={() => {
                        const current =
                          config.services.find(
                            (service) =>
                              service.name === effectiveDependencyServiceName
                          )?.dependsOn || [];
                        updateDependenciesForService(
                          effectiveDependencyServiceName,
                          [
                          ...current,
                          { name: "", condition: "service_started" },
                        ]
                        );
                      }}
                      className="rounded-lg border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-600"
                    >
                      + Add dependency
                    </button>
                  </div>
                  {(
                    config.services.find(
                      (service) => service.name === effectiveDependencyServiceName
                    )?.dependsOn || []
                  ).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No dependencies added.
                    </p>
                  ) : (
                    (
                      config.services.find(
                        (service) => service.name === effectiveDependencyServiceName
                      )?.dependsOn || []
                    ).map((entry, index) => (
                      <div
                        key={`dep-edit-${effectiveDependencyServiceName}-${index}`}
                        className="grid gap-3 md:grid-cols-[1fr_200px_auto]"
                      >
                        <select
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={entry.name}
                          onChange={(event) => {
                            const current =
                              config.services.find(
                                (service) =>
                                  service.name === effectiveDependencyServiceName
                              )?.dependsOn || [];
                            const next = [...current];
                            next[index] = {
                              ...entry,
                              name: event.target.value,
                            };
                            updateDependenciesForService(
                              effectiveDependencyServiceName,
                              next
                            );
                          }}
                        >
                          <option value="">Select service</option>
                          {dependencyServiceNames
                            .filter(
                              (name) => name !== effectiveDependencyServiceName
                            )
                            .filter(
                              (name) =>
                                name === entry.name ||
                                !(
                                  config.services.find(
                                    (service) =>
                                      service.name ===
                                      effectiveDependencyServiceName
                                  )?.dependsOn || []
                                ).some(
                                  (item, idx) =>
                                    idx !== index && item.name === name
                                )
                            )
                            .map((name) => (
                              <option
                                  key={`dep-edit-${effectiveDependencyServiceName}-${index}-${name}`}
                                  value={name}
                                >
                                  {name}
                                </option>
                            ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          value={entry.condition}
                          onChange={(event) => {
                            const current =
                              config.services.find(
                                (service) =>
                                  service.name === effectiveDependencyServiceName
                              )?.dependsOn || [];
                            const next = [...current];
                            next[index] = {
                              ...entry,
                              condition: event.target.value,
                            };
                            updateDependenciesForService(
                              effectiveDependencyServiceName,
                              next
                            );
                          }}
                        >
                          <option value="">No condition</option>
                          <option value="service_started">Service started</option>
                          <option value="service_healthy">Service healthy</option>
                          <option value="service_completed_successfully">
                            Service completed successfully
                          </option>
                        </select>
                        <button
                          onClick={() => {
                            const current =
                              config.services.find(
                                (service) =>
                                  service.name === effectiveDependencyServiceName
                              )?.dependsOn || [];
                            const next = current.filter((_, idx) => idx !== index);
                            updateDependenciesForService(
                              effectiveDependencyServiceName,
                              next
                            );
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <button
                      onClick={() => setDependedOnOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between text-left text-xs uppercase tracking-widest text-slate-500"
                    >
                      Depended on by
                      <span className="text-sm text-slate-400">
                        {dependedOnOpen ? "−" : "+"}
                      </span>
                    </button>
                    {dependedOnOpen ? (
                      <div className="mt-2 space-y-3 text-sm text-slate-700">
                        {config.services.filter((service) =>
                          service.dependsOn.some(
                            (entry) =>
                              entry.name === effectiveDependencyServiceName
                          )
                        ).length === 0 ? (
                          <span className="text-slate-500">
                            No services depend on this.
                          </span>
                        ) : (
                          config.services
                            .filter((service) =>
                              service.dependsOn.some(
                                (entry) =>
                                  entry.name === effectiveDependencyServiceName
                              )
                            )
                            .flatMap((service) =>
                              service.dependsOn
                                .filter(
                                  (entry) =>
                                    entry.name === effectiveDependencyServiceName
                                )
                                .map((entry, index) => (
                                  <div
                                    key={`depended-${service.id}-${index}`}
                                    className="grid gap-3 md:grid-cols-[1fr_200px_auto]"
                                  >
                                    <input
                                      readOnly
                                      value={service.name}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    />
                                    <select
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                      value={entry.condition}
                                      onChange={(event) => {
                                        const next = service.dependsOn.map(
                                          (item, itemIndex) =>
                                            itemIndex === index &&
                                            item.name ===
                                              effectiveDependencyServiceName
                                              ? {
                                                  ...item,
                                                  condition: event.target.value,
                                                }
                                              : item
                                        );
                                        updateDependenciesForService(
                                          service.name,
                                          next
                                        );
                                      }}
                                    >
                                      <option value="">No condition</option>
                                      <option value="service_started">
                                        Service started
                                      </option>
                                      <option value="service_healthy">
                                        Service healthy
                                      </option>
                                      <option value="service_completed_successfully">
                                        Service completed successfully
                                      </option>
                                    </select>
                                    <button
                                      onClick={() => {
                                        const next = service.dependsOn.filter(
                                          (item) =>
                                            !(
                                              item.name ===
                                                effectiveDependencyServiceName &&
                                              item.condition === entry.condition
                                            )
                                        );
                                        updateDependenciesForService(
                                          service.name,
                                          next
                                        );
                                      }}
                                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))
                            )
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Select a service node to edit dependencies.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
