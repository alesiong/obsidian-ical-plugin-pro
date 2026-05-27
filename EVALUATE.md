> Capability Router Protocol
> This file is a long-lived project state file.
> Do not rewrite this file wholesale.
> Only append new entries or edit explicitly conflicting fields after user confirmation.
> If a request conflicts with existing content, surface the conflict first.

## Evaluation Log

### 2026-05-26: v2.1.7 Functional Check & Settings UI Review

**Build**: Clean (99.3kb, 38ms)
**Lint**: Clean (zero warnings)
**Tests**: No project-level tests exist

#### Functional Areas Verified

| Area | File | Status |
|------|------|--------|
| Plugin lifecycle | `ObsidianIcalPlugin.ts` | OK - load/save/sync flow intact |
| Settings model & migration | `Settings.ts` | OK - legacy migration covers v1 fields |
| Settings UI | `SettingsTab.ts` | OK - all 6 sections render, debounce works |
| Task indexing | `TaskIndexingService.ts` | OK - vault event wiring correct |
| Sync execution | `CalendarSyncService.ts` | OK - multi-destination with error handling |
| Diagnostics | `DiagnosticsService.ts` | OK - bundle includes settings, readiness, preview |
| Connection validation | `ConnectionValidationService.ts` | OK - gist reachability check |

#### CSS Issues Found

1. `.ical-pro-header h2` targets h2 but `setHeading()` in Obsidian renders h3 — selector mismatch
2. `.ical-pro-logic-tip` class defined in CSS but never used in code (dead CSS)
3. `.ical-sync-error` uses `var(--text-error-rgb)` which may not exist in all themes
4. `.ical-status-partial` not styled — partial sync shows default color

#### Settings UI Optimization — Completed

- [x] Fix CSS selector mismatch (h2 → h3)
- [x] Remove dead CSS rules (.ical-pro-logic-tip)
- [x] Add .ical-status-partial style
- [x] Fix theme-fragile var(--text-error-rgb)
- [x] Mobile responsive status card grid (@media 600px)
- [x] Collapsible sections with chevron toggle
- [x] Source rules / excluded paths card styling
- [x] Advanced section starts collapsed

#### Commits

- `21f50b9` fix: correct CSS selector mismatch, add partial sync style, remove dead rules
- `0202aab` feat: collapsible settings sections and mobile-responsive status card
- `63b94c5` feat: conditional settings visibility, password token field, first-run guidance
- `306231b` feat: reorder sections, improve sync status readability, fix header clicks

#### UX Improvements (63b94c5)

- **Conditional visibility**: Gist fields hidden when gist toggle off; local file path hidden when local file toggle off; filter text inputs hidden when their toggles off
- **Password field**: Personal access token now uses `type="password"` instead of plain text
- **First-run guidance**: Status card shows actionable next step (from DestinationHealthService) when readiness issues exist

#### UX Improvements (306231b)

- **Section reorder**: Destination (Sync and cloud) now appears before Scope, matching the natural setup flow
- **Sync status card**: Restructured into logical groups — result/time, readiness, preview with bold count, destination results with color-coded status badges and separator
- **Header click fix**: Clicking toggle/dropdown controls inside collapsible section headers no longer toggles collapse
- **Filter descriptions**: Added concrete examples and # prefix guidance to tag/category filter descriptions

#### UX Improvements (584b020)

- **Slider visibility**: Alarm slider hidden when notifications off; auto-sync slider hidden when periodic save off
- **CSS cleanup**: Removed unused .ical-pro-version class; scoped .setting-item override to plugin sections only (was affecting all Obsidian settings)
- **Link mode description**: Added explanation of Keep/Prefer/Remove modes to "Summary formatting" setting
- **Source rules hint**: Shows guidance when only default rule exists ("Currently scanning entire vault with no category...")

#### UX Improvements (4fa5557)

- **Collapse state persistence**: Section collapse/expand state survives display() re-renders (sync, add/remove rules)
- **Source rule names**: Show actual path and category (e.g. "Work → Work") instead of "Source path 1"
- **Excluded path names**: Show actual path instead of "Excluded path 1"
- **Smooth sync refresh**: Sync button refreshes only the status card, no full DOM rebuild or visual flash

#### UX Improvements (199279c)

- **Sync button feedback**: Shows "Synced!" (green) or "Failed" (red) for 1.5s before refreshing status card
- **Category autocomplete**: Source rule category field suggests existing categories from other rules
- **Add button icons**: "Add path" and "Add exclusion" buttons now have "+" icon
- **Diagnostics tooltip**: Button explains it copies settings, readiness, preview, and recent sync results
- **CSS cleanup**: Defined .ical-pro-header-title and .ical-url-placeholder classes that were used but unstyled

#### UX Improvements (031f307)

- **Support section moved to top**: Ko-fi section now appears right after status card
- **Header title fixed**: Uses manifest name "iCal Pro" instead of hardcoded "Calendar sync"
- **CSS cleanup**: Removed unused .ical-sync-error, merged duplicate .ical-pro-section-header selectors
- **Dark theme fix**: Status card box-shadow now uses CSS variable
- **Status class fix**: "Never synced" no longer produces invalid CSS class with space
- **Filter description**: Category exclusion filter now includes example

#### Bug Fixes (self-check 2026-05-27)

- **DestinationHealthService reuse**: `getRecommendedNextStep()` was creating a new instance on each call; now uses shared field
- **runAsync error handling**: Was silently discarding promise rejections with `void task()`; now logs and shows Notice on unexpected errors
- **Timer cleanup**: Added `hide()` override to clear pending update timers when settings tab closes
- **Dead CSS**: Removed `.ical-pro-conditional { transition: opacity }` that never animated (display:none can't transition)
- **Live rule names**: Source rule Setting name now updates in real-time as user types path/category fields
