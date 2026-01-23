export type ComposeRow = {
  id: string;
  name: string;
  updated_at: string;
};

export type SnapshotRow = {
  id: string;
  name: string;
  description: string;
  file_name: string;
  created_at: string;
};

export type ImageOption = {
  image: string;
  version: string;
  services: string[];
};

export type ImageDownloadRow = {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
  errorMessage?: string;
  images: ImageOption[];
};

export type ProjectResponse = {
  project: { id: string; name: string };
  composes: ComposeRow[];
  capabilities?: { imageDownloads?: boolean };
};
