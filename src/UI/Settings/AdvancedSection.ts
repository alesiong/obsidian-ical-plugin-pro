import type { SectionContext } from "./SectionContext";
import { Setting } from "./SectionContext";
import {
	HOW_TO_PARSE_INTERNAL_LINKS,
	LINK_PLACEMENT,
	type InternalLinkMode,
	type LinkPlacement,
} from "../../Model/Settings";

function isInternalLinkMode(value: string): value is InternalLinkMode {
	return Object.prototype.hasOwnProperty.call(HOW_TO_PARSE_INTERNAL_LINKS, value);
}

function isLinkPlacement(value: string): value is LinkPlacement {
	return Object.prototype.hasOwnProperty.call(LINK_PLACEMENT, value);
}

export function renderAdvancedSettings(ctx: SectionContext, containerEl: HTMLElement): void {
	const { plugin, runAsync, addSection } = ctx;
	const sectionEl = addSection(containerEl, "advanced", "sliders", "Advanced and diagnostics", true);

	const body = sectionEl.createDiv({ cls: "ical-pro-section-body" });

	new Setting(body)
		.setName("Summary formatting")
		.setDesc("How [[wikilinks]] in task text appear in the calendar summary. Keep: use explicit display name if set. Prefer: always use note title. Remove: strip links, keep text only.")
		.addDropdown((dropdown) => {
			Object.entries(HOW_TO_PARSE_INTERNAL_LINKS).forEach(([value, label]) => {
				dropdown.addOption(value, label);
			});
			dropdown.setValue(plugin.settings.howToParseInternalLinks).onChange((value) => {
				if (isInternalLinkMode(value)) {
					void plugin.updateSettings(
						{ howToParseInternalLinks: value },
						{ rebuildIndex: true },
					);
				}
			});
		});

	new Setting(body)
		.setName("Obsidian link placement")
		.setDesc("Where to place the app callback link in calendar entries.")
		.addDropdown((dropdown) => {
			Object.entries(LINK_PLACEMENT).forEach(([value, label]) => {
				dropdown.addOption(value, label);
			});
			dropdown.setValue(plugin.settings.linkPlacement).onChange((value) => {
				if (isLinkPlacement(value)) {
					void plugin.updateSettings({ linkPlacement: value });
				}
			});
		});

	const autoSyncSetting = new Setting(body)
		.setName("Auto-sync interval")
		.setDesc("Frequency (in minutes) at which the calendar is regenerated and pushed.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isPeriodicSaveEnabled).onChange((value) => {
				runAsync(() => plugin.updateSettings({ isPeriodicSaveEnabled: value }, { rescheduleSync: true }));
				autoSyncSetting.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addSlider((slider) =>
			slider
				.setLimits(5, 120, 5)
				.setValue(plugin.settings.periodicSaveInterval)
				.onChange((value) => {
					runAsync(() => plugin.updateSettings({ periodicSaveInterval: value }, { rescheduleSync: true }));
				}),
		);
	if (!plugin.settings.isPeriodicSaveEnabled) autoSyncSetting.settingEl.classList.add("is-off");
	autoSyncSetting.settingEl.classList.add("ical-slider-row");

	new Setting(body)
		.setName("Debug mode")
		.setDesc("Enable verbose logging in the console (Ctrl+Shift+I).")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isDebug).onChange((value) => {
				runAsync(() => plugin.updateSettings({ isDebug: value }));
			}),
		);

	// Hidden settings exposed
	body.createEl("p", {
		text: "These settings were previously only accessible by editing data.json manually.",
		cls: "setting-item-description ical-pro-hint",
	});

	new Setting(body)
		.setName("Dateless tasks as todos")
		.setDesc("When using 'Todo items only' mode, only tasks without any date are exported as VTODO. When off, all tasks (including dated) become VTODO. This setting has no effect in 'Events and todo items' mode.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isOnlyTasksWithoutDatesAreTodos).onChange((value) => {
				runAsync(() => plugin.updateSettings({ isOnlyTasksWithoutDatesAreTodos: value }));
			}),
		);

	const ignoreOldSetting = new Setting(body)
		.setName("Ignore old tasks")
		.setDesc("Skip tasks whose dates are older than the threshold below.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.ignoreOldTasks).onChange((value) => {
				runAsync(() => plugin.updateSettings({ ignoreOldTasks: value }, { rebuildIndex: true }));
				ignoreOldSetting.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addSlider((slider) =>
			slider
				.setLimits(7, 730, 1)
				.setValue(plugin.settings.oldTaskInDays)
				.onChange((value) => {
					runAsync(() => plugin.updateSettings({ oldTaskInDays: value }, { rebuildIndex: true }));
				}),
		);
	if (!plugin.settings.ignoreOldTasks) ignoreOldSetting.settingEl.classList.add("is-off");
	ignoreOldSetting.settingEl.classList.add("ical-slider-row");

	body.createEl("p", {
		text: "The status card above also provides a live sync preview, per-destination result report, and a copyable diagnostics bundle for issue reports.",
		cls: "setting-item-description",
	});
}
