import type { SectionContext } from "./SectionContext";
import { Setting } from "./SectionContext";

export function renderFilteringSettings(ctx: SectionContext, containerEl: HTMLElement): void {
	const { plugin, scheduleUpdate, runAsync, addSection } = ctx;
	const sectionEl = addSection(containerEl, "filtering", "filter", "Content and filters");

	const body = sectionEl.createDiv({ cls: "ical-pro-section-body" });

	const globalFilter = new Setting(body)
		.setName("Respect tasks global filter")
		.setDesc("Only treat checkboxes as tasks if they contain one of these tags. Matches the Obsidian Tasks plugin global filter.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.respectGlobalTaskFilter).onChange((value) => {
				runAsync(() => plugin.updateSettings({ respectGlobalTaskFilter: value }, { rebuildIndex: true }));
				globalFilter.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addText((text) =>
			text.setPlaceholder("#task").setValue(plugin.settings.globalTaskFilterTags).onChange((value) => {
				scheduleUpdate("globalTaskFilterTags", () =>
					plugin.updateSettings(
						{ globalTaskFilterTags: value || "#task" },
						{ rebuildIndex: true },
					),
				);
			}),
		);
	if (!plugin.settings.respectGlobalTaskFilter) globalFilter.settingEl.classList.add("is-off");
	globalFilter.settingEl.classList.add("ical-filter-row");

	const catInclude = new Setting(body)
		.setName("Category inclusion filter")
		.setDesc("Only export tasks in these categories. Separate multiple values with spaces (e.g. Work travel/asia).")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isIncludeCategoriesEnabled).onChange((value) => {
				runAsync(() => plugin.updateSettings({ isIncludeCategoriesEnabled: value }, { rebuildIndex: true }));
				catInclude.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addText((text) =>
			text.setPlaceholder("Work travel/asia").setValue(plugin.settings.includeCategories).onChange((value) => {
				scheduleUpdate("includeCategories", () =>
					plugin.updateSettings(
						{ includeCategories: value },
						{ rebuildIndex: true },
					),
				);
			}),
		);
	if (!plugin.settings.isIncludeCategoriesEnabled) catInclude.settingEl.classList.add("is-off");
	catInclude.settingEl.classList.add("ical-filter-row");

	const catExclude = new Setting(body)
		.setName("Category exclusion filter")
		.setDesc("Hide tasks whose derived categories match these values. Separate with spaces (e.g. Personal archive).")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isExcludeCategoriesEnabled).onChange((value) => {
				runAsync(() => plugin.updateSettings({ isExcludeCategoriesEnabled: value }, { rebuildIndex: true }));
				catExclude.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addText((text) =>
			text.setPlaceholder("Personal archive").setValue(plugin.settings.excludeCategories).onChange((value) => {
				scheduleUpdate("excludeCategories", () =>
					plugin.updateSettings(
						{ excludeCategories: value },
						{ rebuildIndex: true },
					),
				);
			}),
		);
	if (!plugin.settings.isExcludeCategoriesEnabled) catExclude.settingEl.classList.add("is-off");
	catExclude.settingEl.classList.add("ical-filter-row");

	const tagInclude = new Setting(body)
		.setName("Tag inclusion filter")
		.setDesc("Only sync tasks that have one of these tags. Use # prefix, separate with spaces (e.g. #work #sync).")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isIncludeTasksWithTags).onChange((value) => {
				runAsync(() => plugin.updateSettings(
					{ isIncludeTasksWithTags: value },
					{ rebuildIndex: true },
				));
				tagInclude.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addText((text) =>
			text.setPlaceholder("#work #sync").setValue(plugin.settings.includeTasksWithTags).onChange((value) => {
				scheduleUpdate("includeTasksWithTags", () =>
					plugin.updateSettings(
						{ includeTasksWithTags: value },
						{ rebuildIndex: true },
					),
				);
			}),
		);
	if (!plugin.settings.isIncludeTasksWithTags) tagInclude.settingEl.classList.add("is-off");
	tagInclude.settingEl.classList.add("ical-filter-row");

	const tagExclude = new Setting(body)
		.setName("Tag exclusion filter")
		.setDesc("Skip tasks that have any of these tags. Use # prefix (e.g. #private #draft).")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isExcludeTasksWithTags).onChange((value) => {
				runAsync(() => plugin.updateSettings(
					{ isExcludeTasksWithTags: value },
					{ rebuildIndex: true },
				));
				tagExclude.settingEl.classList.toggle("is-off", !value);
			}),
		)
		.addText((text) =>
			text.setPlaceholder("#private").setValue(plugin.settings.excludeTasksWithTags).onChange((value) => {
				scheduleUpdate("excludeTasksWithTags", () =>
					plugin.updateSettings(
						{ excludeTasksWithTags: value },
						{ rebuildIndex: true },
					),
				);
			}),
		);
	if (!plugin.settings.isExcludeTasksWithTags) tagExclude.settingEl.classList.add("is-off");
	tagExclude.settingEl.classList.add("ical-filter-row");

	new Setting(body)
		.setName("Ignore completed")
		.setDesc("Do not sync tasks that are already marked as done.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.ignoreCompletedTasks).onChange((value) => {
				runAsync(() => plugin.updateSettings({ ignoreCompletedTasks: value }, { rebuildIndex: true }));
			}),
		);
}
