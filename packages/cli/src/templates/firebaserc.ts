export function renderFirebaserc(projectId: string): string {
  return JSON.stringify({ projects: { default: projectId } }, null, 2) + "\n";
}
