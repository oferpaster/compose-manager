export type EnvironmentRow = {
  id: string;
  name: string;
  description: string;
  updated_at: string;
};

export type EnvironmentResponse = {
  project: { id: string; name: string };
  environments: EnvironmentRow[];
};
