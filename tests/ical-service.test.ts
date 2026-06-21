import test from "node:test";
import assert from "node:assert/strict";
import { createTaskFromLine } from "../src/Service/TaskFactory";
import { IcalService } from "../src/Service/IcalService";
import { DEFAULT_SETTINGS } from "../src/Model/Settings";
import { Task } from "../src/Model/Task";
import { TaskStatus } from "../src/Model/TaskStatus";
import { PLUGIN_VERSION } from "../src/version";

const encoder = new TextEncoder();
const FILE_URI = "obsidian://open?vault=Demo&file=Test.md";

function makeTask(line: string, dateOverride?: Date | null, body?: string, settings = DEFAULT_SETTINGS) {
	return createTaskFromLine(line, FILE_URI, `Test.md:0:${line}`, dateOverride ?? null, body ?? "", settings);
}

function ical(tasks: Task[], settings = DEFAULT_SETTINGS) {
	return new IcalService().getCalendar(tasks, settings);
}

// ─── VEVENT vs VTODO ──────────────────────────────────────────────────────────

test("VEVENT: timed task emits VEVENT with DTSTART;TZID", () => {
	const task = makeTask("- [ ] 09:00 Meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsAndTodos" });
	assert.match(cal, /BEGIN:VEVENT/);
	assert.match(cal, /DTSTART;TZID=/);
	assert.doesNotMatch(cal, /BEGIN:VTODO/);
});

test("VEVENT: untimed dated task in EventsOnly mode emits VEVENT", () => {
	// Use dateOverride (local midnight) to ensure date-only format regardless of timezone
	const task = makeTask("- [ ] Report", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /BEGIN:VEVENT/);
	assert.match(cal, /DTSTART;VALUE=DATE:20260615/);
});

test("VEVENT: date override produces date-only DTSTART in EventsOnly mode", () => {
	const task = makeTask("- [ ] Report", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /BEGIN:VEVENT/);
	assert.match(cal, /DTSTART;VALUE=DATE:20260615/);
});

test("VTODO: untimed dated task in EventsAndTodos mode emits VTODO", () => {
	// Use dateOverride (local midnight) for predictable date-only format
	const task = makeTask("- [ ] Report", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsAndTodos" });
	assert.match(cal, /BEGIN:VTODO/);
	assert.match(cal, /DUE;VALUE=DATE:20260615/);
});

test("VTODO: floating task emits VTODO with no DUE", () => {
	const task = makeTask("- [ ] Floating task");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsAndTodos" });
	assert.match(cal, /BEGIN:VTODO/);
	assert.doesNotMatch(cal, /DUE:/);
});

test("VTODO: in TodosOnly mode with isOnlyTasksWithoutDatesAreTodos false, dated tasks become VTODO", () => {
	const task = makeTask("- [ ] Report", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], {
		...DEFAULT_SETTINGS,
		includeEventsOrTodos: "TodosOnly",
		isOnlyTasksWithoutDatesAreTodos: false,
	});
	assert.match(cal, /BEGIN:VTODO/);
	assert.match(cal, /DUE;VALUE=DATE:20260615/);
});

test("VTODO: in TodosOnly mode with isOnlyTasksWithoutDatesAreTodos true, only floating tasks emitted", () => {
	const datedTask = makeTask("- [ ] Report 📅 2026-06-15");
	const floatingTask = makeTask("- [ ] Floating task");
	assert.ok(datedTask);
	assert.ok(floatingTask);
	const cal = ical([datedTask, floatingTask], {
		...DEFAULT_SETTINGS,
		includeEventsOrTodos: "TodosOnly",
		isOnlyTasksWithoutDatesAreTodos: true,
	});
	// Dated task excluded, only floating task emitted
	assert.doesNotMatch(cal, /SUMMARY:Report/);
	assert.match(cal, /SUMMARY:Floating task/);
});

// ─── DTSTART / DTEND ─────────────────────────────────────────────────────────

test("DTSTART: date-only for untimed task", () => {
	const task = makeTask("- [ ] All day", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /DTSTART;VALUE=DATE:20260615/);
	assert.doesNotMatch(cal, /DTSTART;TZID=/);
});

test("DTSTART: datetime for timed task", () => {
	const task = makeTask("- [ ] 09:00 Meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /DTSTART;TZID=[^:]+:20260615T090000/);
});

test("DTEND: computed from duration for timed task with time range", () => {
	const task = makeTask("- [ ] 09:00-10:30 Workshop", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /DTEND;TZID=[^:]+:20260615T103000/);
});

test("DTEND: no DTEND when no duration", () => {
	const task = makeTask("- [ ] 09:00 Meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.doesNotMatch(cal, /DTEND/);
});

// ─── DUE (VTODO) ─────────────────────────────────────────────────────────────

test("DUE: date-only for untimed VTODO", () => {
	const task = makeTask("- [ ] Report", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsAndTodos" });
	assert.match(cal, /DUE;VALUE=DATE:20260615/);
});

test("DUE: datetime for timed task in TodosOnly mode", () => {
	const task = makeTask("- [ ] 14:00 Report", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /BEGIN:VTODO/);
	assert.match(cal, /DUE:20260615T140000/);
});

// ─── STATUS ───────────────────────────────────────────────────────────────────

test("STATUS: NEEDS-ACTION for todo", () => {
	const task = makeTask("- [ ] Open");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /STATUS:NEEDS-ACTION/);
});

test("STATUS: IN-PROCESS for in-progress", () => {
	const task = makeTask("- [/] Working");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /STATUS:IN-PROCESS/);
});

test("STATUS: CANCELLED for cancelled task", () => {
	const task = makeTask("- [-] Dropped");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /STATUS:CANCELLED/);
});

test("STATUS: COMPLETED for done task", () => {
	const task = makeTask("- [x] Done");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /STATUS:COMPLETED/);
});

test("STATUS: CANCELLED on VEVENT for cancelled timed task", () => {
	const task = makeTask("- [-] 09:00 Cancelled meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /STATUS:CANCELLED/);
});

test("STATUS: no COMPLETED on VEVENT for done timed task", () => {
	const task = makeTask("- [x] 09:00 Done meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /BEGIN:VEVENT/);
	assert.doesNotMatch(cal, /STATUS:COMPLETED/);
	assert.doesNotMatch(cal, /COMPLETED:/);
});

// ─── PRIORITY ─────────────────────────────────────────────────────────────────

test("PRIORITY: high (1) for ⏫", () => {
	const task = makeTask("- [ ] ⏫ Urgent");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /PRIORITY:1/);
});

test("PRIORITY: medium (5) for 🔼", () => {
	const task = makeTask("- [ ] 🔼 Medium");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /PRIORITY:5/);
});

test("PRIORITY: low (9) for 🔽", () => {
	const task = makeTask("- [ ] 🔽 Low");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /PRIORITY:9/);
});

test("PRIORITY: not emitted for normal tasks", () => {
	const task = makeTask("- [ ] Normal");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.doesNotMatch(cal, /PRIORITY:/);
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

test("CATEGORIES: emitted when tags present", () => {
	const task = makeTask("- [ ] Task #work #ops");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /CATEGORIES:work,ops/);
});

test("CATEGORIES: not emitted when no tags", () => {
	const task = makeTask("- [ ] Plain task");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.doesNotMatch(cal, /CATEGORIES:/);
});

// ─── VALARM ───────────────────────────────────────────────────────────────────

test("VALARM: emitted on VEVENT when alarm offset set", () => {
	// VALARM is only added to VEVENT, not VTODO
	const task = makeTask("- [ ] 09:00 Meeting ⏰ 30", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly", enableAlarms: true });
	assert.match(cal, /BEGIN:VALARM/);
	assert.match(cal, /TRIGGER:-PT30M/);
	assert.match(cal, /ACTION:DISPLAY/);
	assert.match(cal, /END:VALARM/);
});

test("VALARM: not emitted when alarms disabled in settings", () => {
	const task = makeTask("- [ ] 09:00 Meeting ⏰ 30", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly", enableAlarms: false });
	assert.doesNotMatch(cal, /BEGIN:VALARM/);
});

test("VALARM: not emitted when no alarm offset", () => {
	const task = makeTask("- [ ] 09:00 Meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly", enableAlarms: true });
	assert.doesNotMatch(cal, /BEGIN:VALARM/);
});

// ─── DESCRIPTION escaping ─────────────────────────────────────────────────────

test("DESCRIPTION: commas escaped", () => {
	const task = new Task(TaskStatus.Todo, [], "Task", FILE_URI, "test:0", "Line with, comma");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false, linkPlacement: "Description" });
	assert.match(cal, /DESCRIPTION:Line with\\, comma/);
});

test("DESCRIPTION: semicolons escaped", () => {
	const task = new Task(TaskStatus.Todo, [], "Task", FILE_URI, "test:0", "Line with; semicolon");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false, linkPlacement: "Description" });
	assert.match(cal, /DESCRIPTION:Line with\\; semicolon/);
});

test("DESCRIPTION: newlines escaped", () => {
	const task = new Task(TaskStatus.Todo, [], "Task", FILE_URI, "test:0", "Line 1\nLine 2");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false, linkPlacement: "Description" });
	assert.match(cal, /DESCRIPTION:Line 1\\nLine 2/);
});

test("DESCRIPTION: HTML comments stripped", () => {
	const task = new Task(TaskStatus.Todo, [], "Task", FILE_URI, "test:0", "Visible <!-- hidden --> text");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false, linkPlacement: "Description" });
	assert.doesNotMatch(cal, /<!--/);
	// After stripping comments and normalizing whitespace, double spaces collapse to single
	assert.match(cal, /DESCRIPTION:Visible text/);
});

test("DESCRIPTION: wikilinks resolved", () => {
	const task = new Task(TaskStatus.Todo, [], "Task", FILE_URI, "test:0", "See [[Note|display]] for details");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false, linkPlacement: "Description" });
	assert.doesNotMatch(cal, /\[\[/);
	assert.match(/DESCRIPTION:.*See display for details/.test(cal) ? cal : "fail", /See display for details/);
});

test("DESCRIPTION: tags stripped from body", () => {
	const task = new Task(TaskStatus.Todo, [], "Task", FILE_URI, "test:0", "Body text #internal-tag");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false, linkPlacement: "Description" });
	assert.doesNotMatch(cal, /#internal-tag/);
});

// ─── Line folding ─────────────────────────────────────────────────────────────

test("line folding: lines over 75 octets are folded", () => {
	const longSummary = "This is a very long task summary that should definitely exceed the seventy-five octet limit for iCalendar lines";
	const task = new Task(TaskStatus.Todo, [], longSummary, FILE_URI, "test:0", "");
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });

	for (const line of cal.split("\r\n")) {
		assert.ok(encoder.encode(line).length <= 75, `line exceeds 75 octets: ${line}`);
	}
});

test("line folding: UTF-8 multi-byte characters handled correctly", () => {
	const task = makeTask("- [ ] 宝丰能源与华鲁恒升买入提醒这是一个很长的中文任务标题用于验证UTF8折行");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });

	for (const line of cal.split("\r\n")) {
		assert.ok(encoder.encode(line).length <= 75, `line exceeds 75 octets: ${line}`);
	}
});

// ─── RRULE ────────────────────────────────────────────────────────────────────

test("RRULE: emitted for recurring task", () => {
	const task = makeTask("- [ ] Standup every weekday");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR/);
});

test("RRULE: not emitted for non-recurring task", () => {
	const task = makeTask("- [ ] One-off");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.doesNotMatch(cal, /RRULE:/);
});

// ─── PRODID ───────────────────────────────────────────────────────────────────

test("PRODID: contains current version", () => {
	const cal = ical([], DEFAULT_SETTINGS);
	assert.match(cal, new RegExp(`PRODID:-//liuh886//obsidian-ical-plugin-pro v${PLUGIN_VERSION}//EN`));
});

// ─── Calendar structure ───────────────────────────────────────────────────────

test("structure: begins with VCALENDAR and ends with VCALENDAR", () => {
	const cal = ical([], DEFAULT_SETTINGS);
	assert.match(cal, /^BEGIN:VCALENDAR\r\n/);
	assert.match(cal, /\r\nEND:VCALENDAR\r\n$/);
});

test("structure: contains VERSION and CALSCALE", () => {
	const cal = ical([], DEFAULT_SETTINGS);
	assert.match(cal, /VERSION:2\.0/);
	assert.match(cal, /CALSCALE:GREGORIAN/);
});

test("structure: contains X-WR-TIMEZONE", () => {
	const cal = ical([], DEFAULT_SETTINGS);
	assert.match(cal, /X-WR-TIMEZONE:/);
});

test("structure: empty calendar has no VEVENT or VTODO", () => {
	const cal = ical([], DEFAULT_SETTINGS);
	assert.doesNotMatch(cal, /BEGIN:VEVENT/);
	assert.doesNotMatch(cal, /BEGIN:VTODO/);
});

// ─── Summary sanitization ─────────────────────────────────────────────────────

test("SUMMARY: tags stripped", () => {
	const task = makeTask("- [ ] Meeting #work");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /SUMMARY:Meeting/);
	assert.doesNotMatch(cal, /SUMMARY:.*#work/);
});

test("SUMMARY: bold markers stripped", () => {
	const task = makeTask("- [ ] **Important** task");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.match(cal, /SUMMARY:Important task/);
	assert.doesNotMatch(cal, /\*\*/);
});

test("SUMMARY: HTML comments stripped", () => {
	const task = makeTask("- [ ] Task <!-- hidden --> visible");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly", isOnlyTasksWithoutDatesAreTodos: false });
	assert.doesNotMatch(cal, /<!--/);
	// After stripping comments and normalizing whitespace
	assert.match(cal, /SUMMARY:Task visible/);
});

test("SUMMARY: hidden-only task produces no VTODO", () => {
	const task = makeTask("- [ ] <!-- hidden-only -->");
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "TodosOnly" });
	assert.doesNotMatch(cal, /BEGIN:VTODO/);
	assert.doesNotMatch(cal, /SUMMARY:/);
});

// ─── UID / DTSTAMP ────────────────────────────────────────────────────────────

test("UID: emitted for every VEVENT", () => {
	const task = makeTask("- [ ] 09:00 Meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /UID:obsidian-ical-/);
});

test("DTSTAMP: emitted for VEVENT", () => {
	const task = makeTask("- [ ] 09:00 Meeting", new Date("2026-06-15T00:00:00"));
	assert.ok(task);
	const cal = ical([task], { ...DEFAULT_SETTINGS, includeEventsOrTodos: "EventsOnly" });
	assert.match(cal, /DTSTAMP:\d{8}T\d{6}Z/);
});

// ─── Multiple date modes ──────────────────────────────────────────────────────

test("multiple dates: PreferDueDate uses Due", () => {
	const task = makeTask("- [ ] 09:00 Task 🛫 2026-06-01 📅 2026-06-15");
	assert.ok(task);
	const cal = ical([task], {
		...DEFAULT_SETTINGS,
		includeEventsOrTodos: "EventsOnly",
		howToProcessMultipleDates: "PreferDueDate",
	});
	// The Due date is used as the primary DTSTART
	assert.match(cal, /DTSTART;TZID=[^:]+:20260615T\d{6}/);
});

test("multiple dates: PreferStartDate uses Start", () => {
	const task = makeTask("- [ ] 09:00 Task 🛫 2026-06-01 📅 2026-06-15");
	assert.ok(task);
	const cal = ical([task], {
		...DEFAULT_SETTINGS,
		includeEventsOrTodos: "EventsOnly",
		howToProcessMultipleDates: "PreferStartDate",
	});
	// The Start date is used as the primary DTSTART
	assert.match(cal, /DTSTART;TZID=[^:]+:20260601T\d{6}/);
});

test("multiple dates: CreateMultipleEvents creates one VEVENT per date", () => {
	const task = makeTask("- [ ] 09:00 Task 🛫 2026-06-01 📅 2026-06-15");
	assert.ok(task);
	const cal = ical([task], {
		...DEFAULT_SETTINGS,
		includeEventsOrTodos: "EventsOnly",
		howToProcessMultipleDates: "CreateMultipleEvents",
	});
	// Both dates appear as separate DTSTART entries
	assert.match(cal, /DTSTART;TZID=[^:]+:20260601T\d{6}/);
	assert.match(cal, /DTSTART;TZID=[^:]+:20260615T\d{6}/);
});

// ─── COMPLETED timestamp ──────────────────────────────────────────────────────

test("COMPLETED: emitted for done VTODO with completion date", () => {
	const task = makeTask("- [x] Done ✅ 2026-04-03");
	assert.ok(task);
	const cal = ical([task], {
		...DEFAULT_SETTINGS,
		includeEventsOrTodos: "TodosOnly",
		isOnlyTasksWithoutDatesAreTodos: false,
	});
	assert.match(cal, /COMPLETED:20260403T000000Z/);
});
