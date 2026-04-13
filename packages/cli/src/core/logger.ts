import chalk from "chalk";

const redactions = new Set<string>();

export function registerRedaction(value: string): void {
  if (value && value.length >= 4) redactions.add(value);
}

export function clearRedactions(): void {
  redactions.clear();
}

export function redact(text: string): string {
  let out = text;
  for (const secret of redactions) {
    if (!secret) continue;
    out = out.split(secret).join("***");
  }
  return out;
}

let verbose = false;
export function setVerbose(v: boolean): void {
  verbose = v;
}

export const logger = {
  info(msg: string): void {
    console.log(redact(msg));
  },
  success(msg: string): void {
    console.log(chalk.green("\u2713 ") + redact(msg));
  },
  warn(msg: string): void {
    console.warn(chalk.yellow("! ") + redact(msg));
  },
  error(msg: string): void {
    console.error(chalk.red("\u2717 ") + redact(msg));
  },
  step(msg: string): void {
    console.log(chalk.cyan("\u25B6 ") + chalk.bold(redact(msg)));
  },
  debug(msg: string): void {
    if (verbose) console.log(chalk.dim("[debug] " + redact(msg)));
  },
  plain(msg: string): void {
    console.log(redact(msg));
  },
};
