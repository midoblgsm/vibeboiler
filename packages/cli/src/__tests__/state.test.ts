import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadState, saveState, markStep, isStepDone } from "../core/state.js";
import { emptyState } from "../core/config.js";

describe("state persistence", () => {
  it("returns empty state when file missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vb-state-"));
    const file = path.join(dir, "state.json");
    const s = await loadState(file);
    expect(s.version).toBe(1);
    expect(s.steps).toEqual({});
  });

  it("round-trips state via save/load", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vb-state-"));
    const file = path.join(dir, "state.json");
    const s = emptyState();
    s.project.id = "my-proj";
    s.firebase.web.apiKey = "apikey";
    markStep(s, "firebase");
    await saveState(file, s);
    const loaded = await loadState(file);
    expect(loaded.project.id).toBe("my-proj");
    expect(loaded.firebase.web.apiKey).toBe("apikey");
    expect(isStepDone(loaded, "firebase")).toBe(true);
  });
});
