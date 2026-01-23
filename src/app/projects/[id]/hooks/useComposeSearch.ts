"use client";

import { useMemo, useState } from "react";

import type { ComposeRow } from "../components/types";

export default function useComposeSearch(composes: ComposeRow[]) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredComposes = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return composes.filter((compose) =>
      compose.name.toLowerCase().includes(normalized)
    );
  }, [composes, searchTerm]);

  return { searchTerm, setSearchTerm, filteredComposes };
}
