import "server-only";

const API = "https://api.github.com";

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub ${init?.method ?? "GET"} ${path}: ${res.status}`);
  return res.json();
}

export type RepoFile = { path: string; content: string };

// Source files only: no dependencies, build output, minified bundles, docs or images.
const CODE = /\.(html?|css|scss|js|jsx|mjs|ts|tsx|vue|svelte)$/i;
const JUNK = /(^|\/)(node_modules|dist|build|out|\.next|vendor|coverage)\/|\.min\.|\.map$/i;
const MAX_FILES = 50;
const MAX_SIZE = 200_000;

async function defaultBranch(repo: string): Promise<string> {
  return (await gh(`/repos/${repo}`)).default_branch;
}

async function readFile(repo: string, path: string, ref: string): Promise<string> {
  const data = await gh(`/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${ref}`);
  return Buffer.from(data.content, "base64").toString("utf8");
}

// Words the patch is built from: target text, class names, attribute names (target and changes).
export function cluesOf(patch: { target: Record<string, unknown>; changes: Array<Record<string, unknown>> }) {
  const t = patch.target as {
    text?: string;
    classes?: string[];
    attrs?: Record<string, string>;
    parent?: { classes?: string[] };
  };
  const clues = [
    t.text,
    ...(t.classes ?? []),
    ...Object.keys(t.attrs ?? {}),
    ...(t.parent?.classes ?? []),
    ...patch.changes.map((c) => (c.type === "attribute" ? (c.name as string) : undefined)),
  ];
  return [...new Set(clues.filter((c): c is string => !!c && c.trim().length > 1).map((c) => c.trim()))];
}

// Read the repo's source files and return the top `limit` by how many clues each contains.
export async function rankFiles(repo: string, clues: string[], limit = 3) {
  const branch = await defaultBranch(repo);
  const tree = await gh(`/repos/${repo}/git/trees/${branch}?recursive=1`);
  const paths: string[] = tree.tree
    .filter((e: { type: string; path: string; size?: number }) =>
      e.type === "blob" && CODE.test(e.path) && !JUNK.test(e.path) && (e.size ?? 0) <= MAX_SIZE)
    .slice(0, MAX_FILES)
    .map((e: { path: string }) => e.path);

  const files = await Promise.all(paths.map(async (path) => ({ path, content: await readFile(repo, path, branch) })));
  return files
    .map((f) => ({ ...f, hits: clues.filter((c) => f.content.includes(c)).length }))
    .filter((f) => f.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit);
}

export async function readFiles(repo: string, paths: string[]): Promise<RepoFile[]> {
  const branch = await defaultBranch(repo);
  return Promise.all(paths.map(async (path) => ({ path, content: await readFile(repo, path, branch) })));
}

// One commit with every changed file on a new branch, then a PR into the default branch.
export async function openPullRequest(repo: string, opts: { branch: string; title: string; body: string; files: RepoFile[] }) {
  const base = await defaultBranch(repo);
  const ref = await gh(`/repos/${repo}/git/ref/heads/${base}`);
  const parent = await gh(`/repos/${repo}/git/commits/${ref.object.sha}`);
  const tree = await gh(`/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: opts.files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
    }),
  });
  const commit = await gh(`/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: opts.title, tree: tree.sha, parents: [parent.sha] }),
  });
  await gh(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${opts.branch}`, sha: commit.sha }),
  });
  const pr = await gh(`/repos/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title: opts.title, body: opts.body, head: opts.branch, base }),
  });
  return pr.html_url as string;
}

// Undo a merged PR the way GitHub's own Revert button does: a new PR with a revert commit,
// so later commits to the same files are kept. REST has no revert endpoint, so this uses GraphQL.
export async function revertPullRequest(prUrl: string, body: string) {
  const m = prUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (!m) throw new Error("not a GitHub PR URL");
  const pr = await gh(`/repos/${m[1]}/pulls/${m[2]}`);
  if (!pr.merged) throw new Error("the PR isn't merged yet, so there is nothing to revert");

  const data = await gh("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `mutation($id: ID!, $title: String, $body: String) {
        revertPullRequest(input: { pullRequestId: $id, title: $title, body: $body }) { revertPullRequest { url } }
      }`,
      variables: { id: pr.node_id, title: `Revert "${pr.title}"`, body },
    }),
  });
  if (data.errors?.length) throw new Error(`GitHub revert failed: ${data.errors[0].message}`);
  return data.data.revertPullRequest.revertPullRequest.url as string;
}
