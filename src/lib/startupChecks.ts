import fs from "fs";
import path from "path";

type StartupCheckResult = {
  ok: boolean;
  dataDir: string;
  dataDirWritable: boolean;
  error: string | null;
};

let cachedResult: StartupCheckResult | null = null;

function checkDataDirWritable(dataDir: string): StartupCheckResult {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    const probePath = path.join(dataDir, ".write-test");
    fs.writeFileSync(probePath, "ok", "utf8");
    fs.unlinkSync(probePath);
    return {
      ok: true,
      dataDir,
      dataDirWritable: true,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      dataDir,
      dataDirWritable: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function ensureStartupChecks(): StartupCheckResult {
  if (cachedResult) return cachedResult;
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  cachedResult = checkDataDirWritable(dataDir);

  if (!cachedResult.ok) {
    console.error(
      `Startup check failed: data dir not writable (${cachedResult.dataDir}).`,
      cachedResult.error
    );
  }

  return cachedResult;
}
