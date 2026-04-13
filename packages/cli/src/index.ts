import { buildProgram } from "./program.js";

const program = buildProgram();
program.parseAsync(process.argv).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
