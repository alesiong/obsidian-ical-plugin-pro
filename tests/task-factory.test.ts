import test from "node:test";
import assert from "node:assert/strict";
import { createTaskFromLine } from "../src/Service/TaskFactory";
import { DEFAULT_SETTINGS } from "../src/Model/Settings";

const FILE_URI = "obsidian://open?vault=Demo&file=Test.md";

function makeTask(line: string, dateOverride?: Date | null, body?: string, settings = DEFAULT_SETTINGS) {
	return createTaskFromLine(line, FILE_URI, `Test.md:0:${line}`, dateOverride ?? null, body ?? "", settings);
}

// ─── Plain tasks ──────────────────────────────────────────────────────────────

test("plain task: no metadata", () => {
	const task = makeTask("- [ ] Buy groceries");
	assert.ok(task);
	assert.equal(task.getSummary(), "Buy groceries");
	assert.equal(task.hasAnyDate(), false);
	assert.equal(task.getRecurrenceRule(), null);
	assert.equal(task.getPriority(), null);
	assert.equal(task.alarmOffset, null);
	assert.deepEqual(task.categories, []);
});

test("plain task: star bullet", () => {
	const task = makeTask("* [ ] Star task");
	assert.ok(task);
	assert.equal(task.getSummary(), "Star task");
});

test("plain task: plus bullet", () => {
	const task = makeTask("+ [ ] Plus task");
	assert.ok(task);
	assert.equal(task.getSummary(), "Plus task");
});

test("plain task: empty string returns null", () => {
	const task = makeTask("");
	assert.equal(task, null);
});

test("plain task: non-task line returns null", () => {
	const task = makeTask("This is just a paragraph");
	assert.equal(task, null);
});

// ─── Dated tasks ──────────────────────────────────────────────────────────────

test("dated task: explicit ISO date in summary", () => {
	const task = makeTask("- [ ] Report due 2026-07-01");
	assert.ok(task);
	assert.equal(task.hasAnyDate(), true);
	assert.equal(task.getDate("Due", "YYYYMMDD"), "20260701");
});

test("dated task: emoji due", () => {
	const task = makeTask("- [ ] Report 📅 2026-07-01");
	assert.ok(task);
	assert.equal(task.hasA("Due"), true);
	assert.equal(task.getDate("Due", "YYYYMMDD"), "20260701");
});

test("dated task: emoji scheduled", () => {
	const task = makeTask("- [ ] Report ⏳ 2026-07-01");
	assert.ok(task);
	assert.equal(task.hasA("Scheduled"), true);
	assert.equal(task.getDate("Scheduled", "YYYYMMDD"), "20260701");
});

test("dated task: emoji start", () => {
	const task = makeTask("- [ ] Report 🛫 2026-07-01");
	assert.ok(task);
	assert.equal(task.hasA("Start"), true);
	assert.equal(task.getDate("Start", "YYYYMMDD"), "20260701");
});

test("dated task: emoji completion", () => {
	const task = makeTask("- [x] Done ✅ 2026-07-01");
	assert.ok(task);
	assert.ok(task.getCompletedAt());
});

test("dated task: date override from daily note", () => {
	const task = makeTask("- [ ] Daily planning", new Date("2026-03-15T00:00:00"));
	assert.ok(task);
	assert.equal(task.getDate("Due", "YYYYMMDD"), "20260315");
});

test("dated task: multiple emoji dates", () => {
	const task = makeTask("- [ ] Project 🛫 2026-06-01 📅 2026-06-15");
	assert.ok(task);
	assert.equal(task.hasA("Start"), true);
	assert.equal(task.hasA("Due"), true);
	assert.equal(task.getDate("Start", "YYYYMMDD"), "20260601");
	assert.equal(task.getDate("Due", "YYYYMMDD"), "20260615");
});

// ─── Timed tasks ──────────────────────────────────────────────────────────────

test("timed task: simple time", () => {
	const task = makeTask("- [ ] 09:00 Team sync", new Date("2026-04-03T00:00:00"));
	assert.ok(task);
	assert.equal(task.hasTimedDate(), true);
	assert.equal(task.getDate("Due", "YYYYMMDD[T]HHmmss"), "20260403T090000");
	assert.equal(task.getSummary(), "Team sync");
});

test("timed task: 12-hour format", () => {
	const task = makeTask("- [ ] 2:30pm Meeting", new Date("2026-04-03T00:00:00"));
	assert.ok(task);
	assert.equal(task.hasTimedDate(), true);
	assert.equal(task.getDate("Due", "YYYYMMDD[T]HHmmss"), "20260403T143000");
});

test("timed task: midnight edge case", () => {
	const task = makeTask("- [ ] 12:00am Midnight task", new Date("2026-04-03T00:00:00"));
	assert.ok(task);
	assert.equal(task.getDate("Due", "YYYYMMDD[T]HHmmss"), "20260403T000000");
});

// ─── Time range ───────────────────────────────────────────────────────────────

test("time range: start-end produces duration", () => {
	const task = makeTask("- [ ] 09:00-10:30 Workshop", new Date("2026-04-03T00:00:00"));
	assert.ok(task);
	assert.equal(task.hasTimedDate(), true);
	assert.equal(task.getDurationMinutes(), 90);
	assert.equal(task.getSummary(), "Workshop");
});

test("time range: single-digit hours", () => {
	const task = makeTask("- [ ] 9:00-10:00 Quick meet", new Date("2026-04-03T00:00:00"));
	assert.ok(task);
	assert.equal(task.getDurationMinutes(), 60);
});

test("date is not parsed as a bare-hour time range", () => {
	const task = makeTask("- [ ] Event 🔁 every day ⏳ 2026-08-19");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=DAILY");
	assert.equal(task.hasA("Scheduled"), true);
	assert.equal(task.hasTimedDate(), false);
	assert.equal(task.getDurationMinutes(), null);
	assert.equal(task.getDate("Scheduled", "YYYYMMDD"), "20260819");
});

test("date before explicit time range still parses the time range", () => {
	const task = makeTask("- [ ] 2026-08-19 09:00-10:00 Meeting");
	assert.ok(task);
	assert.equal(task.hasTimedDate(), true);
	assert.equal(task.getDurationMinutes(), 60);
	assert.equal(task.getDate("Due", "YYYYMMDD[T]HHmmss"), "20260819T090000");
});

// ─── Recurrence ───────────────────────────────────────────────────────────────

test("recurrence: every day", () => {
	const task = makeTask("- [ ] Standup every day");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=DAILY");
	assert.equal(task.getSummary(), "Standup");
});

test("recurrence: every week", () => {
	const task = makeTask("- [ ] Review every week");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY");
});

test("recurrence: every week on specific day", () => {
	const task = makeTask("- [ ] Planning every week on Monday");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;BYDAY=MO");
});

test("recurrence: every weekday", () => {
	const task = makeTask("- [ ] Standup every weekday");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
});

test("recurrence: every weekend", () => {
	const task = makeTask("- [ ] Rest every weekend");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;BYDAY=SA,SU");
});

test("recurrence: every N days", () => {
	const task = makeTask("- [ ] Water plants every 3 days");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=DAILY;INTERVAL=3");
});

test("recurrence: every N weeks on day", () => {
	const task = makeTask("- [ ] Payroll every 2 weeks on Monday and Thursday");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH");
});

test("recurrence: every month", () => {
	const task = makeTask("- [ ] Report every month");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=MONTHLY");
});

test("recurrence: every N months", () => {
	const task = makeTask("- [ ] Review every 3 months");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=MONTHLY;INTERVAL=3");
});

test("recurrence: every year", () => {
	const task = makeTask("- [ ] Anniversary every year");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=YEARLY");
});

test("recurrence: unknown weekday produces null RRULE", () => {
	const task = makeTask("- [ ] Meeting every week on Funday");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), null);
});

test("recurrence: mixed valid and invalid weekdays filters invalid", () => {
	const task = makeTask("- [ ] Meeting every week on Monday and Funday");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;BYDAY=MO");
});

test("recurrence: duplicate weekdays are deduplicated", () => {
	const task = makeTask("- [ ] Meeting every week on Monday, Monday");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;BYDAY=MO");
});

test("recurrence: no recurrence produces null", () => {
	const task = makeTask("- [ ] One-off task");
	assert.ok(task);
	assert.equal(task.getRecurrenceRule(), null);
});

// ─── Alarm ────────────────────────────────────────────────────────────────────

test("alarm: emoji with offset", () => {
	const task = makeTask("- [ ] Meeting ⏰ 30");
	assert.ok(task);
	assert.equal(task.alarmOffset, 30);
	assert.equal(task.getSummary(), "Meeting");
});

test("alarm: emoji without offset uses default", () => {
	const task = makeTask("- [ ] Meeting ⏰");
	assert.ok(task);
	assert.equal(task.alarmOffset, DEFAULT_SETTINGS.defaultAlarmOffset);
});

test("alarm: no alarm emoji", () => {
	const task = makeTask("- [ ] Meeting");
	assert.ok(task);
	assert.equal(task.alarmOffset, null);
});

// ─── Priority ─────────────────────────────────────────────────────────────────

test("priority: high (⏫)", () => {
	const task = makeTask("- [ ] ⏫ Urgent fix");
	assert.ok(task);
	assert.equal(task.priority, 1);
	assert.equal(task.getSummary(), "Urgent fix");
});

test("priority: medium (🔼)", () => {
	const task = makeTask("- [ ] 🔼 Important task");
	assert.ok(task);
	assert.equal(task.priority, 5);
});

test("priority: low (🔽)", () => {
	const task = makeTask("- [ ] 🔽 Nice to have");
	assert.ok(task);
	assert.equal(task.priority, 9);
});

test("priority: no priority emoji", () => {
	const task = makeTask("- [ ] Normal task");
	assert.ok(task);
	assert.equal(task.priority, null);
});

// ─── Internal links ───────────────────────────────────────────────────────────

test("internal links: wikilink kept by default", () => {
	const task = makeTask("- [ ] Review [[Project Plan]]");
	assert.ok(task);
	assert.match(task.getSummary(), /\[\[Project Plan\]\]/);
});

test("internal links: aliased wikilink", () => {
	const task = makeTask("- [ ] Check [[Project Plan|plan]]", null, "", {
		...DEFAULT_SETTINGS,
		howToParseInternalLinks: "KeepTitle",
	});
	assert.ok(task);
	assert.equal(task.getSummary(), "Check plan");
});

test("internal links: removed when mode is RemoveThem", () => {
	const task = makeTask("- [ ] Review [[Project Plan]] notes", null, "", {
		...DEFAULT_SETTINGS,
		howToParseInternalLinks: "RemoveThem",
	});
	assert.ok(task);
	assert.equal(task.getSummary(), "Review notes");
});

// ─── Tags / categories ────────────────────────────────────────────────────────

test("tags: extracted from summary", () => {
	const task = makeTask("- [ ] Meeting #work #ops");
	assert.ok(task);
	assert.deepEqual(task.categories, ["work", "ops"]);
	assert.equal(task.getSummary(), "Meeting");
});

test("tags: extracted from body", () => {
	const task = makeTask("- [ ] Meeting", null, "Related to #project");
	assert.ok(task);
	assert.deepEqual(task.categories, ["project"]);
});

test("tags: combined from summary and body", () => {
	const task = makeTask("- [ ] Meeting #work", null, "See also #project");
	assert.ok(task);
	assert.deepEqual(task.categories, ["work", "project"]);
});

test("tags: no tags", () => {
	const task = makeTask("- [ ] Simple task");
	assert.ok(task);
	assert.deepEqual(task.categories, []);
});

// ─── Body / description ───────────────────────────────────────────────────────

test("body: passed through", () => {
	const task = makeTask("- [ ] Task", null, "Line 1\nLine 2");
	assert.ok(task);
	assert.equal(task.getBody(), "Line 1\nLine 2");
});

test("body: empty body", () => {
	const task = makeTask("- [ ] Task");
	assert.ok(task);
	assert.equal(task.getBody(), "");
});

// ─── Callout task ─────────────────────────────────────────────────────────────

test("callout: blockquote prefix stripped", () => {
	const task = makeTask("> - [ ] Callout task");
	assert.ok(task);
	assert.equal(task.getSummary(), "Callout task");
});

test("callout: nested blockquote", () => {
	const task = makeTask("> > - [ ] Deep callout");
	assert.ok(task);
	assert.equal(task.getSummary(), "Deep callout");
});

// ─── Status ───────────────────────────────────────────────────────────────────

test("status: todo (space)", () => {
	const task = makeTask("- [ ] Open task");
	assert.ok(task);
	assert.equal(task.status, "Todo");
});

test("status: done (x)", () => {
	const task = makeTask("- [x] Completed");
	assert.ok(task);
	assert.equal(task.status, "Done");
});

test("status: in progress (/)", () => {
	const task = makeTask("- [/] In progress");
	assert.ok(task);
	assert.equal(task.status, "InProgress");
});

test("status: cancelled (-)", () => {
	const task = makeTask("- [-] Cancelled");
	assert.ok(task);
	assert.equal(task.status, "Cancelled");
});

test("status: important (!)", () => {
	const task = makeTask("- [!] Important");
	assert.ok(task);
	assert.equal(task.status, "Important");
	assert.equal(task.priority, 1);
});

// ─── Malformed input ──────────────────────────────────────────────────────────

test("malformed: incomplete checkbox returns null", () => {
	const task = makeTask("- [Incomplete");
	assert.equal(task, null);
});

test("malformed: plain text returns null", () => {
	const task = makeTask("Just a sentence, not a task");
	assert.equal(task, null);
});

test("malformed: valid task with garbled emoji dates", () => {
	const task = makeTask("- [ ] Task 📅 not-a-date");
	assert.ok(task);
	assert.equal(task.hasAnyDate(), false);
});

test("malformed: completed task with no completion date uses now", () => {
	const task = makeTask("- [x] Done task");
	assert.ok(task);
	assert.ok(task.getCompletedAt());
});

test("malformed: done tasks ignored when setting enabled", () => {
	const task = makeTask("- [x] Old task", null, "", {
		...DEFAULT_SETTINGS,
		ignoreCompletedTasks: true,
	});
	assert.equal(task, null);
});

// ─── Combined features ────────────────────────────────────────────────────────

test("combined: priority + date + recurrence + alarm + tags", () => {
	const task = makeTask("- [ ] ⏫ Weekly sync 📅 2026-06-15 every week on Monday ⏰ 15 #ops #team");
	assert.ok(task);
	assert.equal(task.priority, 1);
	assert.equal(task.hasA("Due"), true);
	assert.equal(task.getDate("Due", "YYYYMMDD"), "20260615");
	assert.equal(task.getRecurrenceRule(), "FREQ=WEEKLY;BYDAY=MO");
	assert.equal(task.alarmOffset, 15);
	assert.deepEqual(task.categories, ["ops", "team"]);
	assert.equal(task.getSummary(), "Weekly sync");
});

test("combined: time range + date + duration", () => {
	const task = makeTask("- [ ] 09:00-10:30 Workshop 📅 2026-06-15", null, "", DEFAULT_SETTINGS);
	assert.ok(task);
	assert.equal(task.getDurationMinutes(), 90);
	assert.equal(task.getDate("Due", "YYYYMMDD[T]HHmmss"), "20260615T090000");
});
