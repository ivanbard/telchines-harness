import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import telchines from "../extensions/telchines.ts";

test("RTL check reports real compiler failures and passes", async () => {
  const tools = new Map();
  telchines({ on() {}, registerTool(tool) { tools.set(tool.name, tool); } });
  const root = await mkdtemp(join(tmpdir(), "telchines-harness-"));
  try {
    const check = tools.get("rtl_check");
    await writeFile(join(root, "good.sv"), "module good; endmodule\n");
    await writeFile(join(root, "bad.sv"), "module bad; broken syntax endmodule\n");
    const good = await check.execute("test", { files: ["good.sv"] }, undefined, undefined, { cwd: root });
    const bad = await check.execute("test", { files: ["bad.sv"] }, undefined, undefined, { cwd: root });
    assert.equal(JSON.parse(good.content[0].text).status, "passed");
    assert.equal(JSON.parse(bad.content[0].text).status, "failed");
    await assert.rejects(check.execute("test", { files: ["../outside.sv"] }, undefined, undefined, { cwd: root }), /inside the project/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Telchines retrieval returns cited project evidence", async () => {
  const tools = new Map();
  telchines({ on() {}, registerTool(tool) { tools.set(tool.name, tool); } });
  const root = await mkdtemp(join(tmpdir(), "telchines-evidence-"));
  try {
    await writeFile(join(root, "uart.md"), "UART start bit must stay low for one baud interval.\n");
    execFileSync("tel", ["project", "init", "."], { cwd: root });
    execFileSync("tel", ["index"], { cwd: root });
    const result = await tools.get("tel_retrieve").execute("test", { query: "UART start bit" }, undefined, undefined, { cwd: root });
    assert.match(result.content[0].text, /uart\.md/);
    assert.match(result.content[0].text, /citation/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
