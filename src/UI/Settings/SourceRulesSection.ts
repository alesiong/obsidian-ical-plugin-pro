import { normalizePath } from "obsidian";
import type { SectionContext } from "./SectionContext";
import { Setting } from "./SectionContext";
import { FolderSuggest, CategorySuggest } from "../FolderSuggest";
import type { TaskSourceRule } from "../../Model/Settings";

export function renderTaskSourceSettings(ctx: SectionContext, containerEl: HTMLElement): void {
	const { plugin, runAsync, addSection, rerender } = ctx;
	const sectionEl = addSection(containerEl, "scope", "search", "Scope and discovery");

	const body = sectionEl.createDiv({ cls: "ical-pro-section-body" });

	body.createEl("p", {
		text: "Bind one source path to one category. Use multiple rules when you want different folders exported as different calendar categories.",
		cls: "setting-item-description",
	});

	const rulesContainer = body.createDiv({ cls: "ical-pro-source-rules" });
	plugin.settings.sourceRules.forEach((rule, index) => {
		renderSourceRuleSetting(ctx, rulesContainer, rule, index);
	});

	if (plugin.settings.sourceRules.length === 1 && !plugin.settings.sourceRules[0].category) {
		body.createEl("p", {
			text: "Currently scanning entire vault with no category. Add rules to assign categories to specific folders for calendar filtering.",
			cls: "setting-item-description ical-pro-hint",
		});
	}

	new Setting(body)
		.setName("Add source path")
		.setDesc("Add another path/category rule.")
		.addButton((button) =>
			button.setIcon("plus").setButtonText("Add path").onClick(() => {
				runAsync(async () => {
					await plugin.updateSettings(
						{ sourceRules: [...plugin.settings.sourceRules, { path: "/", category: "" }] },
						{ rebuildIndex: true },
					);
					rerender();
				});
			}),
		);

	body.createEl("p", {
		text: "Specify folders or files to explicitly ignore. Tasks in these paths will never be indexed.",
		cls: "setting-item-description",
	});

	const excludedContainer = body.createDiv({ cls: "ical-pro-excluded-paths" });
	plugin.settings.excludedPaths.forEach((path, index) => {
		renderExcludedPathSetting(ctx, excludedContainer, path, index);
	});

	new Setting(body)
		.setName("Add excluded path")
		.setDesc("Add another folder or file to ignore.")
		.addButton((button) =>
			button.setIcon("plus").setButtonText("Add exclusion").onClick(() => {
				runAsync(async () => {
					await plugin.updateSettings(
						{ excludedPaths: [...plugin.settings.excludedPaths, "/"] },
						{ rebuildIndex: true },
					);
					rerender();
				});
			}),
		);
}

function renderSourceRuleSetting(ctx: SectionContext, containerEl: HTMLElement, rule: TaskSourceRule, index: number): void {
	const { plugin, runAsync, rerender } = ctx;
	const ruleName = rule.category
		? `${rule.path}  →  ${rule.category}`
		: rule.path || `Source path ${index + 1}`;
	const setting = new Setting(containerEl)
		.setName(ruleName)
		.setDesc("Tasks in this path inherit the configured category.")
		.addText((text) => {
			new FolderSuggest(plugin.app, text.inputEl);
			text
				.setPlaceholder("/")
				.setValue(rule.path)
				.onChange((value) => {
					scheduleSourceRuleUpdate(ctx, index, { path: normalizePath(value) || "/" });
				});
		})
		.addText((text) => {
			const existingCategories = plugin.settings.sourceRules.map((r) => r.category);
			new CategorySuggest(plugin.app, text.inputEl, existingCategories);
			text
				.setPlaceholder("Work")
				.setValue(rule.category)
				.onChange((value) => {
					scheduleSourceRuleUpdate(ctx, index, { category: value });
				});
		});

	const nameEl = setting.settingEl.querySelector(".setting-item-name") as HTMLElement | null;
	const inputs = setting.settingEl.querySelectorAll<HTMLInputElement>("input[type='text'], input:not([type])");
	if (nameEl && inputs.length >= 2) {
		const updateName = () => {
			const path = inputs[0].value;
			const category = inputs[1].value;
			nameEl.textContent = category ? `${path}  →  ${category}` : path || `Source path ${index + 1}`;
		};
		inputs[0].addEventListener("input", updateName);
		inputs[1].addEventListener("input", updateName);
	}
	setting
		.addExtraButton((button) =>
			button
				.setIcon("trash")
				.setTooltip("Remove path rule")
				.onClick(() => {
					runAsync(async () => {
						const sourceRules = plugin.settings.sourceRules.filter((_, ruleIndex) => ruleIndex !== index);
						await plugin.updateSettings(
							{ sourceRules: sourceRules.length > 0 ? sourceRules : [{ path: "/", category: "" }] },
							{ rebuildIndex: true },
						);
						rerender();
					});
				}),
		);
}

function renderExcludedPathSetting(ctx: SectionContext, containerEl: HTMLElement, path: string, index: number): void {
	const { plugin, runAsync, rerender } = ctx;
	new Setting(containerEl)
		.setName(path || `Excluded path ${index + 1}`)
		.addText((text) => {
			new FolderSuggest(plugin.app, text.inputEl);
			text
				.setPlaceholder("/")
				.setValue(path)
				.onChange((value) => {
					scheduleExcludedPathUpdate(ctx, index, normalizePath(value) || "/");
				});
		})
		.addExtraButton((button) =>
			button
				.setIcon("trash")
				.setTooltip("Remove exclusion")
				.onClick(() => {
					runAsync(async () => {
						const excludedPaths = plugin.settings.excludedPaths.filter((_, pathIndex) => pathIndex !== index);
						await plugin.updateSettings({ excludedPaths }, { rebuildIndex: true });
						rerender();
					});
				}),
		);
}

function scheduleExcludedPathUpdate(ctx: SectionContext, index: number, path: string): void {
	ctx.scheduleUpdate(`excluded-path-${index}`, async () => {
		const excludedPaths = ctx.plugin.settings.excludedPaths.map((p, pIndex) =>
			pIndex === index ? path : p,
		);
		await ctx.plugin.updateSettings({ excludedPaths }, { rebuildIndex: true });
	});
}

function scheduleSourceRuleUpdate(ctx: SectionContext, index: number, patch: Partial<TaskSourceRule>): void {
	ctx.scheduleUpdate(`source-rule-${index}`, async () => {
		const sourceRules = ctx.plugin.settings.sourceRules.map((rule, ruleIndex) =>
			ruleIndex === index
				? {
					path: patch.path !== undefined ? patch.path : rule.path,
					category: patch.category !== undefined ? patch.category : rule.category,
				}
				: rule,
		);
		await ctx.plugin.updateSettings({ sourceRules }, { rebuildIndex: true });
	});
}
