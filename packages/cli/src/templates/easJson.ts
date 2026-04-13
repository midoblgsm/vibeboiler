export interface EasJsonPatch {
  appleId?: string;
  ascAppId?: string;
  appleTeamId?: string;
}

/**
 * Parse eas.json, patch the `submit.production.ios` block, return the
 * re-serialized file. Leaves `submit.production.android` untouched since
 * Google Play setup is a v1 non-goal.
 */
export function patchEasJson(source: string, patch: EasJsonPatch): string {
  const parsed = JSON.parse(source);
  parsed.submit = parsed.submit ?? {};
  parsed.submit.production = parsed.submit.production ?? {};
  const ios = parsed.submit.production.ios ?? {};
  if (patch.appleId !== undefined) ios.appleId = patch.appleId;
  if (patch.ascAppId !== undefined) ios.ascAppId = patch.ascAppId;
  if (patch.appleTeamId !== undefined) ios.appleTeamId = patch.appleTeamId;
  parsed.submit.production.ios = ios;
  return JSON.stringify(parsed, null, 2) + "\n";
}
