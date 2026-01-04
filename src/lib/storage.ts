import fs from "fs";
import path from "path";
import { ComposeConfig, generateComposeYaml, generateEnvFile } from "./compose";
import { findServiceById, loadCatalog } from "./catalogStore";
import { loadNetworks } from "./networkStore";

const COMPOSE_ROOT = path.join(process.cwd(), "data", "compose-files");

function ensureDir(target: string) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

export function saveComposeAssets(config: ComposeConfig) {
  ensureDir(COMPOSE_ROOT);
  const composeDir = path.join(COMPOSE_ROOT, config.id);
  ensureDir(composeDir);

  const composeYaml = generateComposeYaml(config, loadCatalog(), loadNetworks());
  const envFile = generateEnvFile(config);

  fs.writeFileSync(path.join(composeDir, "docker-compose.yml"), composeYaml, "utf8");
  fs.writeFileSync(path.join(composeDir, ".env"), envFile, "utf8");

  config.services.forEach((serviceConfig) => {
    const service = findServiceById(serviceConfig.serviceId);
    if (!service?.springBoot || !serviceConfig.applicationProperties) return;

    const serviceName = serviceConfig.name || service.id;
    const serviceFolder = path.join(composeDir, serviceName);
    ensureDir(serviceFolder);
    fs.writeFileSync(
      path.join(serviceFolder, "application.properties"),
      serviceConfig.applicationProperties,
      "utf8"
    );
  });

  return { composeYaml, envFile };
}

export function readComposeYaml(composeId: string) {
  const composePath = path.join(COMPOSE_ROOT, composeId, "docker-compose.yml");
  if (!fs.existsSync(composePath)) return "";
  return fs.readFileSync(composePath, "utf8");
}
