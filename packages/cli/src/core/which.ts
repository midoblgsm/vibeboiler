import { execa } from "execa";

export async function detectBinary(name: string): Promise<boolean> {
  try {
    await execa(name, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function detectGcloud(): Promise<boolean> {
  return detectBinary("gcloud");
}
