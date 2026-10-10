import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { RepoFile } from "@/lib/github";

// An organization-scoped key must name the workspace on every request.
const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
const client = new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});

const Proposal = z.object({
  summary: z.string(),
  edits: z.array(z.object({ file: z.string(), find: z.string(), replace: z.string() })),
});
export type Edit = z.infer<typeof Proposal>["edits"][number];

const SYSTEM = `A website is being fixed at runtime by a PATCHWORK patch: a script finds one element by its clues and applies changes to it in the visitor's browser.
Your job: change the site's source code so the bug is fixed for real and the patch is no longer needed.

Rules:
- Fix the root cause in the source, matching what the patch's changes achieve. Do not add code that mimics the patch at runtime.
- Make the smallest edits that fix it. Do not reformat, rename or refactor anything else.
- Each edit is {file, find, replace}. "file" is one of the given paths. "find" is copied exactly from that file (whitespace included) and must appear exactly once in it; include enough surrounding text to make it unique.
- "summary" is one short sentence for the pull request title, describing the fix.`;

// Ask Claude for source edits that make the patch unnecessary.
export async function proposeEdits(
  patch: { name: string; target: unknown; changes: unknown },
  files: RepoFile[],
) {
  const fileBlocks = files.map((f) => `<file path="${f.path}">\n${f.content}\n</file>`).join("\n\n");
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "high", format: zodOutputFormat(Proposal) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${fileBlocks}\n\n<patch>\n${JSON.stringify({ name: patch.name, target: patch.target, changes: patch.changes }, null, 2)}\n</patch>`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("no usable answer from Claude");
  return response.parsed_output;
}

// Apply edits in order. Each `find` must appear exactly once in its file's current text; otherwise reject.
export function applyEdits(files: RepoFile[], edits: Edit[]) {
  if (!edits.length) return { error: "no edits proposed" };
  const text = new Map(files.map((f) => [f.path, f.content]));
  for (const e of edits) {
    const current = text.get(e.file);
    if (current === undefined) return { error: `unknown file ${e.file}` };
    const count = current.split(e.find).length - 1;
    if (!e.find || count !== 1) return { error: `edit in ${e.file}: text to replace found ${count} times, expected 1` };
    text.set(e.file, current.replace(e.find, () => e.replace));
  }
  return {
    files: files
      .filter((f) => text.get(f.path) !== f.content)
      .map((f) => ({ path: f.path, before: f.content, after: text.get(f.path)! })),
  };
}
