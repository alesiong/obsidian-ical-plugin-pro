import type { SectionContext } from "./SectionContext";
import { Setting } from "./SectionContext";
import {
	HOW_TO_PROCESS_MULTIPLE_DATES,
	INCLUDE_EVENTS_OR_TODOS,
	type CalendarEntryMode,
	type MultipleDateMode,
} from "../../Model/Settings";

function isCalendarEntryMode(value: string): value is CalendarEntryMode {
	return Object.prototype.hasOwnProperty.call(INCLUDE_EVENTS_OR_TODOS, value);
}

function isMultipleDateMode(value: string): value is MultipleDateMode {
	return Object.prototype.hasOwnProperty.call(HOW_TO_PROCESS_MULTIPLE_DATES, value);
}

export function renderDateSettings(ctx: SectionContext, containerEl: HTMLElement): void {
	const { plugin, runAsync, rerender, addSection } = ctx;
	const sectionEl = addSection(containerEl, "scheduling", "calendar-days", "Scheduling and alarms");

	const body = sectionEl.createDiv({ cls: "ical-pro-section-body" });

	new Setting(body)
		.setName("Time-block logic (day planner)")
		.setDesc("If enabled, treats daily note headings as dates and task times as event start points.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isDayPlannerPluginFormatEnabled).onChange((value) => {
				runAsync(() => plugin.updateSettings(
					{ isDayPlannerPluginFormatEnabled: value },
					{ rebuildIndex: true },
				));
			}),
		);

	new Setting(body)
		.setName("Sync strategy")
		.setDesc("Define how dated tasks are mapped. Events are time-boxed; to-dos are status-tracked.")
		.addDropdown((dropdown) => {
			Object.entries(INCLUDE_EVENTS_OR_TODOS).forEach(([value, label]) => {
				dropdown.addOption(value, label);
			});
			dropdown.setValue(plugin.settings.includeEventsOrTodos).onChange((value) => {
				if (isCalendarEntryMode(value)) {
					runAsync(async () => {
						await plugin.updateSettings({ includeEventsOrTodos: value });
						rerender();
					});
				}
			});
		});

	new Setting(body)
		.setName("Show dated tasks as all-day events")
		.setDesc("Export date-only tasks as all-day events instead of to-dos. Recommended for Google Calendar users because Google Calendar does not display VTODO.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.datedTasksAsAllDayEvents).onChange((value) => {
				runAsync(async () => {
					await plugin.updateSettings({ datedTasksAsAllDayEvents: value });
					rerender();
				});
			}),
		);

	new Setting(body)
		.setName("Multiple date handling")
		.setDesc("How to handle tasks that contain multiple start, scheduled, or due dates.")
		.addDropdown((dropdown) => {
			Object.entries(HOW_TO_PROCESS_MULTIPLE_DATES).forEach(([value, label]) => {
				dropdown.addOption(value, label);
			});
			dropdown.setValue(plugin.settings.howToProcessMultipleDates).onChange((value) => {
				if (isMultipleDateMode(value)) {
					runAsync(async () => {
						await plugin.updateSettings({ howToProcessMultipleDates: value });
						rerender();
					});
				}
			});
		});

	const alarmSetting = new Setting(body)
		.setName("Enable native notifications")
		.setDesc("Include alerts in your calendar app. Use the alarm emoji with a minute offset to set a custom reminder.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.enableAlarms).onChange((value) => {
				runAsync(() => plugin.updateSettings({ enableAlarms: value }));
				alarmSetting.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addSlider((slider) =>
			slider
				.setLimits(5, 180, 5)
				.setValue(plugin.settings.defaultAlarmOffset)
				.onChange((value) => {
					runAsync(() => plugin.updateSettings({ defaultAlarmOffset: value }));
				}),
		);
	if (!plugin.settings.enableAlarms) alarmSetting.settingEl.classList.add("is-off");
	alarmSetting.settingEl.classList.add("ical-slider-row");
}
