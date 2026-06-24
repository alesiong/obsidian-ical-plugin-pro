# v2.2 Technical Design Proposal

## Context

iCal Pro v2.1.9 is a stable release with a clean layered architecture, 138 passing tests, and full Obsidian reviewer compliance. The core parser/export pipeline is mature. Two candidate features are proposed for v2.2 that add real user value without destabilizing that core.

---

## Feature 1: Google Calendar Grid Mode

### Problem

Google Calendar does not support `VTODO`. Users who rely on Google Calendar see only their timed tasks (`VEVENT`) — all date-only tasks are invisible. The current workaround ("add a time to every task") defeats the purpose of having both events and to-dos.

### Design

Add a new boolean setting: `googleCalendarMode` (default: `false`).

When enabled, the `IcalService` rendering pipeline converts dated-but-untimed tasks from `VTODO` to all-day `VEVENT` instead. The classification buckets (`getTaskBuckets()`) remain unchanged — only the rendering decision in `getCalendar()` is affected.

**Behavioral matrix:**

| Task type | Default mode | Google Calendar mode |
|---|---|---|
| Timed task (has HH:MM) | `VEVENT` | `VEVENT` (no change) |
| Dated task (date only) | `VTODO` | `VEVENT` (all-day, `VALUE=DATE`) |
| Floating task (no date) | `VTODO` | `VTODO` (no change — can't become an event without a date) |

**Rendering change in `getCalendar()`:**

```
// Current (EventsAndTodos mode):
timedTasks    → renderEvent()
untimedTasks  → renderTodo()
floatingTasks → renderTodo()

// With googleCalendarMode=true (EventsAndTodos mode):
timedTasks    → renderEvent()
untimedTasks  → renderEvent()   // ← promoted to all-day VEVENT
floatingTasks → renderTodo()    // ← stays VTODO (no date to anchor)
```

**All-day VEVENT format:**

```
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260401
DTEND;VALUE=DATE:20260402
SUMMARY:Task text
UID:...
DTSTAMP:...
STATUS:NEEDS-ACTION
END:VEVENT
```

Key differences from timed VEVENT:
- `DTSTART;VALUE=DATE:YYYYMMDD` (no time component, no TZID)
- `DTEND;VALUE=DATE:YYYYMMDD` (next day, per RFC 5545 all-day convention)
- `STATUS:NEEDS-ACTION` instead of `CONFIRMED` (preserves task semantics)

**Settings model change (`Settings.ts`):**

```typescript
interface Settings {
    // ... existing fields ...
    googleCalendarMode: boolean;  // default: false
}
```

**Migration:** `migrateSettings()` defaults the new field to `false`. No breaking change.

### Scope of change

| Layer | File | Change |
|---|---|---|
| Model | `Settings.ts` | Add `googleCalendarMode: boolean` |
| Migration | `Settings.ts` | Default to `false` in `migrateSettings()` |
| Service | `IcalService.ts` | Branch rendering in `getCalendar()` when flag is set |
| Service | `IcalBuilder.ts` | No change (already supports `VALUE=DATE`) |
| Service | `ICalService.test.ts` | New test cases |
| UI | `SchedulingSection.ts` | Add toggle with description |
| UI | `StatusCard.ts` | No change |
| Docs | `README.md` / `README_zh.md` | Document the mode |

### Risk assessment

**Low risk.** The change is isolated to one rendering branch in `getCalendar()`. The classification logic (`getTaskBuckets()`) is untouched. The `ICalBuilder` already handles `VALUE=DATE` correctly (used by `EventsOnly` mode for date-only events). The flag defaults to off, so zero behavioral change for existing users.

### Testing scope

| Test | Input | Expected output |
|---|---|---|
| Timed task unchanged | `- [ ] 2026-04-01 13:00 Meeting` | `VEVENT` with `DTSTART;TZID=...:20260401T130000` |
| Dated task promoted | `- [ ] 2026-04-01 Report` | `VEVENT` with `DTSTART;VALUE=DATE:20260401` |
| Floating task stays VTODO | `- [ ] Buy milk` | `VTODO` with no `DUE` |
| Default mode unaffected | Same inputs, `googleCalendarMode=false` | Original behavior: dated → `VTODO` |
| Recurring dated task | `- [ ] 2026-04-01 🔁 every week Report` | `VEVENT` with `RRULE` + `VALUE=DATE` |
| Priority preserved | `- [ ] 2026-04-01 ⏫ Urgent` | `VEVENT` with `PRIORITY:1` |
| Status mapping | Completed dated task | `VEVENT` with `STATUS:COMPLETED` |

---

## Feature 2: Calendar Preview & Explain

### Problem

Users cannot see *why* a specific task did or did not appear in their calendar. The current sync preview shows aggregate counts ("12 events, 8 todos, 5 filtered") but not per-task decisions. When a task is missing from the calendar, the user must guess which filter or classification rule excluded it.

### Design

Add a per-task decision table to the settings UI, rendered below the existing aggregate preview in the status card. Each row shows:

| Column | Source | Example |
|---|---|---|
| Task | `task.summary` (truncated) | `Buy groceries` |
| Source file | `task.fileUri` | `Daily/2026-04-01.md` |
| Type | Classification result | `VEVENT` / `VTODO` / `Filtered` |
| Date/Time | `task.dates` | `2026-04-01 13:00` / `2026-04-01` / `—` |
| Category | `task.categories` | `#work` |
| Reason | Decision explanation | `Has time → VEVENT` / `Date-only → VTODO` / `Excluded tag: #ignore` |

**Data model — new interface:**

```typescript
interface TaskDecision {
    summary: string;
    fileUri: string;
    type: "VEVENT" | "VTODO" | "Filtered";
    dateDisplay: string;       // formatted date/time or "—"
    categories: string;
    reason: string;            // human-readable explanation
}
```

**New service method — `IcalService.getTaskDecisions()`:**

This method reuses `getTaskBuckets()` internally but returns per-task decisions instead of aggregate counts. It runs the same classification pipeline but annotates each task with its outcome and reason.

```
Input:  Task[], Settings
Output: TaskDecision[]

Logic:
1. Run getTaskBuckets() to classify all tasks
2. For each timed task:
   → { type: "VEVENT", reason: "Has time → event" }
3. For each untimed task:
   → if googleCalendarMode: { type: "VEVENT", reason: "All-day event (Google Calendar mode)" }
   → else: { type: "VTODO", reason: "Date-only → to-do" }
4. For each floating task:
   → { type: "VTODO", reason: "No date → floating to-do" }
```

**Filtered tasks come from `TaskFilterPolicy`:**

The filter policy already produces reason strings via `getFirstFailureReason()`. To expose per-task filter decisions, `applyWithReport()` needs a small extension:

```typescript
interface TaskFilterReport {
    tasks: Task[];
    reasons: ReasonCount[];
    decisions: TaskFilterDecision[];  // NEW: per-task filter results
}

interface TaskFilterDecision {
    task: Task;
    passed: boolean;
    reason: string | null;  // null if passed
}
```

**UI integration:**

The preview table renders inside the existing status card area, below the aggregate counts. It uses a collapsible section (consistent with the existing section pattern) to avoid overwhelming the settings page.

```
[12 to export (8 events, 4 todos)]  ← existing
[▼ Show task details]               ← new collapsible
  ┌─────────────────────────────────────────────────────────┐
  │ Task            │ Type   │ Date       │ Reason          │
  │ Buy groceries   │ VEVENT │ 04-01 13:00│ Has time        │
  │ Write report    │ VTODO  │ 04-01      │ Date-only       │
  │ Random thought  │ VTODO  │ —          │ No date         │
  │ Old task        │ Filter │ —          │ Excluded: #ignore│
  └─────────────────────────────────────────────────────────┘
```

**Performance consideration:** The decision table only renders when the user expands it. The `getTaskDecisions()` call runs on-demand, not on every settings refresh. For vaults with hundreds of tasks, a reasonable cap (e.g., show first 200 with a "showing 200 of N" note) prevents UI lag.

### Scope of change

| Layer | File | Change |
|---|---|---|
| Model | New `TaskDecision` interface | In `SyncPreviewService.ts` or new file |
| Service | `IcalService.ts` | Add `getTaskDecisions()` method |
| Service | `TaskFilterPolicy.ts` | Extend `TaskFilterReport` with per-task decisions |
| Service | `SyncPreviewService.ts` | Build full decision list (filtered + classified) |
| UI | `StatusCard.ts` | Add collapsible decision table below aggregate preview |
| UI | `styles.css` | Table styling |
| Test | New test file or extend `ical-service.test.ts` | Decision accuracy tests |
| Test | Extend `application-services.test.ts` | Filter decision tests |

### Risk assessment

**Medium risk.** The core classification logic is unchanged — `getTaskBuckets()` is reused as-is. The risk is in the UI layer: rendering a table of potentially hundreds of tasks requires performance care. The filter policy extension is additive (new field, no changed behavior). The main concern is that `getTaskDecisions()` must produce results consistent with `getCalendar()` — if they diverge, the preview would lie.

**Mitigation:** `getTaskDecisions()` should call the same `getTaskBuckets()` that `getCalendar()` calls. The decision logic is a thin annotation layer on top of the existing bucket assignment, not a parallel implementation.

### Testing scope

| Test | Input | Expected |
|---|---|---|
| Timed task decision | Task with time | `type: "VEVENT"`, reason matches |
| Untimed task decision | Task with date only | `type: "VTODO"`, reason matches |
| Floating task decision | Task with no date | `type: "VTODO"`, reason matches |
| Filtered task decision | Task with excluded tag | `type: "Filtered"`, reason names the tag |
| Mixed file | File with 5 tasks of different types | 5 decisions, all correct |
| Consistency check | Same tasks → `getTaskDecisions()` vs `getCalendar()` | Event/todo counts match |
| Large vault | 500 tasks | Renders without error, capped at 200 display |

---

## Comparison

| Dimension | Google Calendar Grid Mode | Calendar Preview & Explain |
|---|---|---|
| **User value** | **High.** Unlocks Google Calendar for an entire class of tasks (date-only). The #1 compatibility complaint. | **Medium-high.** Solves the "where did my task go?" debugging problem. Reduces support burden. |
| **Implementation risk** | **Low.** Single rendering branch, isolated to `getCalendar()`. No new interfaces. No UI complexity. | **Medium.** New service method, extended filter report, table UI with performance considerations. |
| **Testing scope** | **Small.** 7 focused tests covering the mode toggle and edge cases. | **Medium.** 7+ tests for decisions, plus consistency checks between preview and actual output. |
| **UI impact** | **Minimal.** One toggle in Scheduling section. | **Moderate.** New collapsible table in status card. CSS additions. |
| **Data model change** | One boolean field. | New interfaces, extended filter report. |
| **Risk of regression** | **Very low.** Default is off. Existing behavior untouched. | **Low.** Additive only. But consistency between preview and output is critical. |
| **Documentation effort** | Short section in README. | Short section in README. |

---

## Recommendation

**Implement Google Calendar Grid Mode first.**

Rationale:

1. **Highest user impact per line of code.** A single boolean flag and one rendering branch unlock the entire Google Calendar use case. This is the most-requested compatibility improvement.

2. **Near-zero risk.** The change is isolated, defaults to off, and touches no existing behavior. It can ship with high confidence.

3. **Natural stepping stone for Preview.** Once `googleCalendarMode` exists, the preview/explain feature becomes more valuable — users can see *how* the mode changes their task exports. Shipping Preview after Grid Mode means the preview can explain the Grid Mode behavior from day one.

4. **Testing is straightforward.** The test matrix is small and the expected outputs are unambiguous (all-day VEVENT format is well-defined in RFC 5545).

Calendar Preview & Explain should follow in a subsequent minor release (v2.2.1 or v2.3). It benefits from Grid Mode being in place so the decision table can explain "promoted to all-day event (Google Calendar mode)" as a reason.

---

## Proposed Implementation Order

### Phase A: Google Calendar Grid Mode (v2.2.0)

1. Add `googleCalendarMode` to `Settings` interface with default `false`
2. Add migration default in `migrateSettings()`
3. Modify `IcalService.getCalendar()` to render untimed dated tasks as all-day VEVENT when flag is set
4. Add toggle to `SchedulingSection.ts` with description: "Export dated tasks as all-day events instead of to-dos. Recommended for Google Calendar users."
5. Add 7 tests to `ical-service.test.ts`
6. Update README compatibility section

### Phase B: Calendar Preview & Explain (v2.2.1 or v2.3)

1. Add `TaskDecision` and `TaskFilterDecision` interfaces
2. Extend `TaskFilterPolicy.applyWithReport()` to include per-task decisions
3. Add `IcalService.getTaskDecisions()` method
4. Extend `SyncPreviewService.build()` to merge filter and classification decisions
5. Add collapsible decision table to `StatusCard.ts`
6. Add table CSS to `styles.css`
7. Add consistency tests (decision counts match actual output counts)
8. Cap display at 200 rows with overflow note

---

## Appendix: Data Model Changes

### Settings.ts additions

```typescript
// Phase A
googleCalendarMode: boolean;  // default: false
```

### New interfaces (Phase B)

```typescript
// In SyncPreviewService.ts or new Application/TaskDecision.ts
interface TaskDecision {
    summary: string;
    fileUri: string;
    type: "VEVENT" | "VTODO" | "Filtered";
    dateDisplay: string;
    categories: string;
    reason: string;
}

// Extension to existing TaskFilterPolicy.ts
interface TaskFilterDecision {
    task: Task;
    passed: boolean;
    reason: string | null;
}
```

### Existing interfaces — no changes needed

- `CalendarProjection` — unchanged, still provides aggregate counts
- `SyncPreview` — unchanged, still provides aggregate preview
- `Task` — unchanged, all needed fields already exist
- `ReasonCount` — unchanged, still used for aggregate histograms
