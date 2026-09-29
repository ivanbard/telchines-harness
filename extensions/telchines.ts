import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isAbsolute, relative, resolve } from "node:path";
import { realpath, stat } from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const run = promisify(execFile);

async function command(bin: string, args: string[], cwd: string, signal?: AbortSignal) {
  try {
    const result = await run(bin, args, { cwd, signal, timeout: 60_000, maxBuffer: 1024 * 1024 });
    return { status: "passed", output: result.stdout + result.stderr };
  } catch (error) {
    const failure = error as Error & { code?: number | string; stdout?: string; stderr?: string };
    if (typeof failure.code !== "number") throw new Error(`${bin}: ${failure.message}`);
    return { status: "failed", exitCode: failure.code, output: (failure.stdout ?? "") + (failure.stderr ?? "") };
  }
}

export default function telchines(pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => {
    event.systemPromptOptions.sections.telchines = [
      "You are a hardware development agent. Ground conclusions in project files and tool output.",
      "For RTL changes: inspect the relevant source and spec, make the smallest useful edit, run rtl_check, and report the exact validation level.",
      "A compile pass is not simulation or formal proof. Show remaining limits and the changed files for human review.",
    ].join("\n");
  });

  pi.registerTool({
    name: "tel_retrieve",
    label: "Telchines evidence",
    description: "Search an initialized Telchines project for cited RTL, documentation, and logs.",
    parameters: Type.Object({ query: Type.String({ minLength: 1 }) }),
    async execute(_id, { query }, signal, _update, ctx) {
      const result = await command("tel", ["retrieve", query, "--format", "json"], ctx.cwd, signal);
      if (result.status !== "passed") throw new Error(result.output || "tel retrieve failed; initialize the project with tel project init .");
      return { content: [{ type: "text", text: result.output.slice(0, 16000) }], details: result };
    },
  });

  pi.registerTool({
    name: "rtl_check",
    label: "RTL compile check",
    description: "Compile Verilog/SystemVerilog source files with Icarus Verilog. This checks syntax and elaboration, not behavior.",
    parameters: Type.Object({ files: Type.Array(Type.String(), { minItems: 1, maxItems: 50 }) }),
    async execute(_id, { files }, signal, _update, ctx) {
      const projectRoot = await realpath(ctx.cwd);
      for (const file of files) {
        const path = resolve(projectRoot, file);
        const outside = relative(projectRoot, path);
        if (isAbsolute(file) || outside === ".." || outside.startsWith("..\\") || outside.startsWith("../")) {
          throw new Error(`File must be inside the project: ${file}`);
        }
        if (!/\.(sv|v)$/i.test(file)) throw new Error(`Expected an RTL source file: ${file}`);
        let source;
        try { source = await realpath(path); } catch { throw new Error(`RTL source file does not exist: ${file}`); }
        const resolved = relative(projectRoot, source);
        if (resolved === ".." || resolved.startsWith("..\\") || resolved.startsWith("../") || !(await stat(source)).isFile()) {
          throw new Error(`RTL source file must be inside the project: ${file}`);
        }
      }
      const result = await command("iverilog", ["-g2012", "-tnull", ...files], ctx.cwd, signal);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...result, validation: "compile_only", files, output: result.output.slice(0, 16000) }) }],
        details: result,
      };
    },
  });
}
