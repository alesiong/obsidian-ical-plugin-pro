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
	const { plugin, runAsync, addSection } = ctx;
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
					void plugin.updateSettings({ includeEventsOrTodos: value });
				}
			});
		});

	new Setting(body)
		.setName("Multiple date handling")
		.setDesc("How to handle tasks that contain multiple start, scheduled, or due dates.")
		.addDropdown((dropdown) => {
			Object.entries(HOW_TO_PROCESS_MULTIPLE_DATES).forEach(([value, label]) => {
				dropdown.addOption(value, label);
			});
			dropdown.setValue(plugin.settings.howToProcessMultipleDates).onChange((value) => {
				if (isMultipleDateMode(value)) {
					void plugin.updateSettings({ howToProcessMultipleDates: value });
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
				.setDynamicTooltip()
				.setValue(plugin.settings.defaultAlarmOffset)
				.onChange((value) => {
					runAsync(() => plugin.updateSettings({ defaultAlarmOffset: value }));
				}),
		);
	if (!plugin.settings.enableAlarms) alarmSetting.settingEl.classList.add("is-off");
	alarmSetting.settingEl.classList.add("ical-slider-row");
}
