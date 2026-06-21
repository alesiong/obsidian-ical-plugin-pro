## Phase 4: Parser Test Matrix

Split monolithic `scripts/smoke-tests.ts` into focused test files under `tests/` and expanded from 41 to 138 tests.

### File structure

| File | Tests | Coverage |
|------|-------|----------|
| `tests/task-factory.test.ts` | 61 | All TaskFactory parsing features |
| `tests/ical-service.test.ts` | 53 | ICS output fields and modes |
| `tests/application-services.test.ts` | 24 | Integration layer (sync, indexing, identity, diagnostics) |

### TaskFactory test matrix (61 tests)

- **Plain**: no metadata, star/plus/dash bullets, empty/non-task input
- **Dated**: explicit ISO, emoji due/scheduled/start/completion, date override, multiple dates
- **Timed**: simple time, 12-hour format, midnight edge case
- **Time range**: start-end with duration, single-digit hours
- **Recurrence**: daily, weekly, monthly, yearly, weekday list, intervals, unknown weekday (null RRULE), mixed valid/invalid, deduplication
- **Alarm**: with offset, default offset, no alarm
- **Priority**: high/medium/low/none
- **Internal links**: default (kept), aliased wikilink, removed
- **Tags/categories**: summary, body, combined, none
- **Body**: passed through, empty
- **Callout**: blockquote prefix stripped, nested blockquote
- **Status**: todo, done, in-progress, cancelled, important
- **Malformed**: incomplete checkbox, non-task text, garbled emoji dates, done-without-completion-date, ignore-completed setting
- **Combined**: priority + date + recurrence + alarm + tags; time range + date + duration

### IcalService output matrix (53 tests)

- **VEVENT vs VTODO**: EventsOnly, TodosOnly, EventsAndTodos modes; timed vs untimed vs floating
- **DTSTART/DTEND**: date-only, datetime, duration-based DTEND, no DTEND without duration
- **DUE**: date-only, datetime
- **STATUS**: NEEDS-ACTION, IN-PROCESS, CANCELLED, COMPLETED; no COMPLETED on VEVENT
- **PRIORITY**: 1/5/9/absent
- **CATEGORIES**: present/absent
- **VALARM**: on VEVENT when alarm set, not when disabled, not when no offset
- **DESCRIPTION escaping**: commas, semicolons, newlines, HTML comments, wikilinks, tags
- **Line folding**: 75-octet limit, UTF-8 multi-byte characters
- **RRULE, PRODID, UID, DTSTAMP**: present/absent/correct format
- **Multiple date modes**: PreferDueDate, PreferStartDate, CreateMultipleEvents
- **COMPLETED timestamp**: on done VTODO

### package.json change

`test:smoke` and `validate` now run `tests/*.test.ts` instead of `scripts/smoke-tests.ts`.

## Verification

- `npm run validate` passes (typecheck + lint + 138 tests + build)
- 0 failures, 0 skipped
