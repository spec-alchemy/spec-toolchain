import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function removeOutputPath(outputPath: string): Promise<boolean> {
  const exists = await pathExists(outputPath);

  if (!exists) {
    return false;
  }

  await rm(outputPath, { force: true, recursive: true });

  return true;
}

export async function writeJsonArtifact(
  outputPath: string,
  value: unknown
): Promise<string> {
  await writeTextArtifact(outputPath, `${JSON.stringify(value, null, 2)}\n`);

  return outputPath;
}

export async function writeTextArtifact(
  outputPath: string,
  source: string
): Promise<string> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");

  return outputPath;
}

async function pathExists(outputPath: string): Promise<boolean> {
  try {
    await access(outputPath);
    return true;
  } catch {
    return false;
  }
}
