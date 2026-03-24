import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function resetOutputDirectory(directoryPath: string): Promise<void> {
  await rm(directoryPath, {
    force: true,
    recursive: true
  });
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
