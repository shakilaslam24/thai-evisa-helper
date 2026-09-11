/**
 * Starts Next on the port named in .env.
 *
 *   node scripts/serve.mjs dev     development
 *   node scripts/serve.mjs start   production
 *
 * Next reads PORT from the process environment but does NOT read it from
 * .env — a PORT line there is silently ignored and the server lands on 3000.
 * On DreamFly's machines 3000 is the CRM, so the two would fight over the
 * port, or nginx would quietly send website traffic to the CRM. Loading .env
 * here and passing the port explicitly closes that gap.
 *
 * An exported PORT still wins, so `PORT=4000 npm start` behaves as expected.
 */
import { spawn } from "node:child_process";
import path from "node:path";

const mode = process.argv[2] === "dev" ? "dev" : "start";

const exported = process.env.PORT;
try {
  process.loadEnvFile();
} catch {
  // .env is optional: the variables may already be exported (systemd, CI).
}
// loadEnvFile does not overwrite an existing value, but be explicit about it.
const port = exported ?? process.env.PORT ?? "3000";

const next = path.join(process.cwd(), "node_modules", ".bin", "next");
const child = spawn(next, [mode, "-p", port], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 0;
});
