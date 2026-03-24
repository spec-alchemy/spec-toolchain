import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveDesignSpecPath(relativePath: string): string {
  return fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
}

export async function writeJsonArtifact(
  relativePath: string,
  value: unknown
): Promise<string> {
  const outputPath = resolveDesignSpecPath(relativePath);

  await writeTextFile(outputPath, `${JSON.stringify(value, null, 2)}\n`);

  return outputPath;
}

export async function writeTextArtifact(
  relativePath: string,
  source: string
): Promise<string> {
  const outputPath = resolveDesignSpecPath(relativePath);

  await writeTextFile(outputPath, source);

  return outputPath;
}

async function writeTextFile(absolutePath: string, source: string): Promise<void> {
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, source, "utf8");
}
