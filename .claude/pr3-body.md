## Phase 3: First-Run Configuration Experience

### Setup Checklist

New "Getting started" card appears above the status card for users who haven't completed setup yet. Steps:
1. Choose destination (local file or gist enabled with credentials)
2. Add source path (non-default source rule exists)
3. Validate connection (readiness passes)
4. Sync now (at least one sync has run)

Auto-hides once all steps are complete. Each step shows a check or circle icon with strikethrough for completed items.

### URL Status Indicators

The subscription URL area now shows a status badge:
- **Gist URL ready** (green) — gist connection validated
- **Local path ready** (green) — local file export enabled
- **Not validated** (yellow) — gist config present but not validated
- **Not ready** (yellow) — no destination configured

### PAT Wording Fix

Changed from "stored securely within Obsidian's local storage" to "stored locally by Obsidian plugin data (plaintext, not encrypted)". Added hint: "Only the gist scope is required — create a fine-grained PAT scoped to Gist only."

Files: `DestinationSection.ts`, `README.md`

### README Cleanup

- Fixed typo: "shcedule" → "schedule" (line 41)
- Removed duplicate "Core Capabilities" heading (appeared at lines 22 and 47)
- Fixed "Secure Storage" → "Local Storage" with honest plaintext description

### Clipboard Fix (included)

Both clipboard click handlers in StatusCard.ts now use `async/await` instead of `void` so the try/catch actually catches rejections.

## Verification

- `npm run validate` passes (typecheck + lint + 41 tests + build)
- No core sync logic changes
- Setup checklist only visible to new/incomplete configurations
