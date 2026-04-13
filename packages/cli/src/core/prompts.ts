import { input, password, confirm, select, checkbox } from "@inquirer/prompts";

export interface PromptOptions {
  assumeYes?: boolean;
}

export async function askInput(
  message: string,
  opts: { default?: string; validate?: (v: string) => true | string } = {},
): Promise<string> {
  return input({ message, default: opts.default, validate: opts.validate });
}

export async function askPassword(
  message: string,
  opts: { validate?: (v: string) => true | string } = {},
): Promise<string> {
  return password({ message, mask: "*", validate: opts.validate });
}

export async function askConfirm(
  message: string,
  opts: { default?: boolean; assumeYes?: boolean } = {},
): Promise<boolean> {
  if (opts.assumeYes) return true;
  return confirm({ message, default: opts.default ?? true });
}

export async function askSelect<T extends string>(
  message: string,
  choices: ReadonlyArray<{ name: string; value: T }>,
  opts: { default?: T } = {},
): Promise<T> {
  return select({ message, choices: [...choices], default: opts.default }) as Promise<T>;
}

export async function askMultiselect<T extends string>(
  message: string,
  choices: ReadonlyArray<{ name: string; value: T; checked?: boolean }>,
): Promise<T[]> {
  const result = await checkbox({
    message,
    choices: choices.map((c) => ({ name: c.name, value: c.value, checked: c.checked })),
  });
  return result as T[];
}
