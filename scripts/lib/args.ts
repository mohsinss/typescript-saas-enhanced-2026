/**
 * Minimal flag parser for scaffolding scripts. Supports:
 *   <positional...>           — collected in order
 *   -q | --quiet              — boolean
 *   --log-file <path>         — value (path written to disk)
 *   --log-file=<path>         — value (equals form)
 *   -h | --help               — boolean
 *
 * Throws on unknown flags. Anything not starting with `-` is positional.
 */

export interface ParsedArgs {
  readonly positional: readonly string[];
  readonly quiet: boolean;
  readonly logFile?: string;
  readonly help: boolean;
}

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  let quiet = false;
  let logFile: string | undefined;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--quiet" || a === "-q") quiet = true;
    else if (a === "--help" || a === "-h") help = true;
    else if (a === "--log-file") {
      const next = argv[++i];
      if (!next) throw new CliError("--log-file requires a path");
      logFile = next;
    } else if (a.startsWith("--log-file=")) {
      logFile = a.slice("--log-file=".length);
      if (!logFile) throw new CliError("--log-file= requires a value");
    } else if (a.startsWith("-")) {
      throw new CliError(`Unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }

  return { positional, quiet, logFile, help };
}
