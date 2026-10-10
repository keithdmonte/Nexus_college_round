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

const Fix = z.object({
  summary: z.string(),
  name: z.string(),
  text: z.string().nullable(),
  color: z.string().nullable(),
  backgroundColor: z.string().nullable(),
  fontSize: z.string().nullable(),
  hide: z.boolean(),
  attrName: z.string().nullable(),
  attrValue: z.string().nullable(),
});
export type Fix = z.infer<typeof Fix>;

const FIX_SYSTEM = `You help fix a live website with a PATCHWORK patch: changes applied to ONE selected element in the visitor's browser, without touching the site's code.
You get the selected element (tag, text, classes, attributes, parent, selector), its current computed styles, the user's description of the problem, and the site's most relevant source files.

Return only the changes that fix the described problem on this element, using these fields (null / false = no change):
- text: new text content (only if the text itself is wrong)
- color, backgroundColor, fontSize: CSS values. Prefer the site's own CSS variables (e.g. var(--name)) when the source defines a fitting one.
- hide: true to hide the element
- attrName / attrValue: set one attribute. Use the exact attribute name the site's code expects (read the source). attrValue may be "" for a boolean-style attribute.
Never set event-handler attributes (on*), srcdoc, or javascript:/data: URLs.
"name": a short patch name like "Fix price label". "summary": one short plain sentence (max 20 words) naming the cause, e.g. "The price label was hidden by a leftover display:none rule."`;

// Ask Claude for runtime changes to the selected element that fix the described problem.
export async function suggestFix(
  input: { target: unknown; current: unknown; prompt: string },
  files: RepoFile[],
) {
  const fileBlocks = files.map((f) => `<file path="${f.path}">\n${f.content}\n</file>`).join("\n\n");
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "medium", format: zodOutputFormat(Fix) },
    system: FIX_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${fileBlocks}\n\n<element>\n${JSON.stringify({ target: input.target, current: input.current }, null, 2)}\n</element>\n\n<problem>\n${input.prompt}\n</problem>`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("no usable answer from Claude");
  return response.parsed_output;
}
