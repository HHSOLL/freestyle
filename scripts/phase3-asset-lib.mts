import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const resolveRepoPath = (...segments: string[]) => path.join(repoRoot, ...segments);

export const relativeFromRepo = (targetPath: string) => path.relative(repoRoot, targetPath).replaceAll(path.sep, "/");

export const parseArgs = (argv: string[]) => {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
};

export const ensureDir = async (targetPath: string) => {
  await fs.mkdir(targetPath, { recursive: true });
};

export const readFileIfExists = async (targetPath: string) => {
  try {
    return await fs.readFile(targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const copyFileIfChanged = async (sourcePath: string, targetPath: string) => {
  const [source, existing] = await Promise.all([fs.readFile(sourcePath), readFileIfExists(targetPath)]);

  if (existing && Buffer.compare(source, existing) === 0) {
    return false;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, source);
  return true;
};

export const statIfExists = async (targetPath: string) => {
  try {
    return await fs.stat(targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const listFilesRecursive = async (rootPath: string, predicate?: (targetPath: string) => boolean) => {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath, predicate);
      }
      if (entry.isFile() && (!predicate || predicate(entryPath))) {
        return [entryPath];
      }
      return [];
    }),
  );

  return nested.flat().sort();
};

export const runCommand = (
  command: string,
  args: string[],
  options: {
    cwd?: string;
    dryRun?: boolean;
    env?: NodeJS.ProcessEnv;
  } = {},
) => {
  if (options.dryRun) {
    console.log(`[dry-run] ${command} ${args.join(" ")}`);
    return;
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:${process.env.PATH ?? ""}`,
      ...options.env,
    },
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
};

export const writeJson = async (targetPath: string, value: unknown) => {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, JSON.stringify(value, null, 2) + "\n");
};
