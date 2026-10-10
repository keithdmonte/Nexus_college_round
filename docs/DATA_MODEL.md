# Data Model

Supabase (Postgres). Four tables. Final SQL lives in `supabase/schema.sql` (Phase 0).

## `sites`

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `name` | text | Northfold | |
| `url` | text | `http://localhost:5500` | Also the allowed origin for editor messages |
| `site_key` | text, unique | `pw_live_abc123` | Public, in the snippet tag |
| `preview_token` | text | `xyz789` | Unlocks drafts via `?pw_preview=` / `?pw_edit=` |
| `github_repo` | text | `keithdmonte/northfold_store` | For Patch to PR |
| `live_version_id` | uuid, nullable | | Version visitors get. Rollback changes this |
| `created_at` | timestamptz | | |

## `patches`

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `site_id` | uuid | | |
| `name` | text | Fix Checkout button | |
| `page` | text | `*` | Which pages it applies to. `*` = all |
| `target` | jsonb | see below | Clues to find the element |
| `changes` | jsonb | see below | List of edits |
| `status` | text | `draft` | `draft` / `published` / `retired` |
| `last_broken_at` | timestamptz, nullable | | Set when a visitor's snippet could not find the element. Shown as a warning; does not change `status` (one odd visitor should not disable a patch for everyone) |
| `pr_url` | text, nullable | | Set when the PR is opened |
| `created_at`, `updated_at` | timestamptz | | |

## `versions`

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | uuid | | |
| `site_id` | uuid | | |
| `number` | int | 4 | Shown as v4. v0 = empty (original site) |
| `patches` | jsonb | | **Frozen copy** of the patches live in this version |
| `note` | text | Fix checkout | |
| `created_at` | timestamptz | | |

Why a frozen copy: editing a patch later must not change what an old version contains. Rollback to v3 restores exactly what was live in v3.

## `audit_log`

| Field | Type | Example |
|---|---|---|
| `id` | uuid | |
| `site_id` | uuid | |
| `action` | text | `created` / `edited` / `published` / `rolled_back` / `pr_opened` / `reported_broken` / `retired` |
| `patch_id` | uuid, nullable | |
| `version_id` | uuid, nullable | |
| `details` | jsonb | |
| `created_at` | timestamptz | |

## Patch format

```json
{
  "name": "Fix Checkout button",
  "page": "*",
  "target": {
    "tag": "button",
    "text": "Checkout",
    "classes": ["btn", "btn-accent"],
    "attrs": { "data-check-out": "" },
    "parent": { "tag": "div", "classes": ["totals"] },
    "selector": "aside.drawer div.totals > button"
  },
  "changes": [
    { "type": "style", "props": { "color": "var(--on-accent)" } },
    { "type": "attribute", "name": "data-checkout", "value": "" }
  ],
  "status": "draft"
}
```

### Change types

| Type | Shape | Effect |
|---|---|---|
| `text` | `{ "type": "text", "value": "Pay Now" }` | Sets `textContent` |
| `style` | `{ "type": "style", "props": { "color": "#fff" } }` | Sets inline styles |
| `hide` | `{ "type": "hide" }` | `display: none` |
| `attribute` | `{ "type": "attribute", "name": "data-checkout", "value": "" }` | Sets an attribute. `"value": null` removes it |

### Element matching

1. Try `selector` first; if exactly one element matches and its clues score high, use it
2. Otherwise score every element of the target `tag`: text match weighs most, then attributes, then classes, then parent
3. Best score wins if it is at least ~60% of the maximum possible score
4. No winner: patch skipped. Reported broken (`last_broken_at`) only on a near-miss: an element resembles the target (same text, or the selector matches) but scores below the threshold. If nothing resembles it, the element is just not on the page right now (e.g. drawer closed) and nothing is reported

`var(--on-accent)` uses the store's own colour token, so the fix also works in dark mode and matches what the real code fix will be.
