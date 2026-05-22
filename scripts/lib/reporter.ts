/**
 * Progress reporter with three modes:
 *   - interactive: clack spinner UI (TTY, default)
 *   - quiet:       plain-text one-line-per-step (pipe/grep friendly)
 *   - logFile:     append-on-write transcript to disk (survives crashes)
 *
 * Modes compose: --quiet + --log-file works.
 */
import {
  intro as clackIntro,
  outro as clackOutro,
  spinner as clackSpinner,
} from "@clack/prompts";
import { createWriteStream, type WriteStream } from "node:fs";

export interface ReporterStep {
  stop(msg: string): void;
}

export interface Reporter {
  intro(msg: string): void;
  outro(msg: string): void;
  step(msg: string): ReporterStep;
  info(msg: string): void;
  error(msg: string): void;
  close(): Promise<void>;
}

export interface ReporterOptions {
  readonly quiet?: boolean;
  readonly logFile?: string;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI_RE, "");

export function makeReporter(opts: ReporterOptions = {}): Reporter {
  const useSpinner = !opts.quiet && process.stdout.isTTY;
  const log: WriteStream | null = opts.logFile
    ? createWriteStream(opts.logFile, { flags: "a" })
    : null;

  const write = (level: string, msg: string) => {
    if (!log) return;
    log.write(`${ts()} [${level}] ${stripAnsi(msg)}\n`);
  };

  return {
    intro(msg) {
      if (!opts.quiet) clackIntro(msg);
      write("intro", msg);
    },
    outro(msg) {
      if (opts.quiet) console.log(msg);
      else clackOutro(msg);
      write("outro", msg);
    },
    step(startMsg) {
      const t0 = Date.now();
      write("step", startMsg);
      if (useSpinner) {
        const s = clackSpinner();
        s.start(startMsg);
        return {
          stop(stopMsg) {
            s.stop(stopMsg);
            write("done", `${stopMsg} (${Date.now() - t0}ms)`);
          },
        };
      }
      console.log(`→ ${startMsg}`);
      return {
        stop(stopMsg) {
          const ms = Date.now() - t0;
          console.log(`  ✓ ${stopMsg} (${ms}ms)`);
          write("done", `${stopMsg} (${ms}ms)`);
        },
      };
    },
    info(msg) {
      if (!opts.quiet) console.log(msg);
      write("info", msg);
    },
    error(msg) {
      console.error(msg);
      write("error", msg);
    },
    async close() {
      if (!log) return;
      await new Promise<void>((resolve) => log.end(resolve));
    },
  };
}

function ts(): string {
  return new Date().toISOString();
}
