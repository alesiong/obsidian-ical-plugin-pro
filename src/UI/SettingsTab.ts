import { App, Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import ObsidianIcalPlugin from "../ObsidianIcalPlugin";
import type { SectionContext } from "./Settings/SectionContext";
import { renderStatusCard } from "./Settings/StatusCard";
import { renderDestinationSettings } from "./Settings/DestinationSection";
import { renderTaskSourceSettings } from "./Settings/SourceRulesSection";
import { renderDateSettings } from "./Settings/SchedulingSection";
import { renderFilteringSettings } from "./Settings/FilteringSection";
import { renderAdvancedSettings } from "./Settings/AdvancedSection";
import { renderSupportSection } from "./Settings/SupportSection";

export class SettingsTab extends PluginSettingTab {
	private readonly pendingUpdates = new Map<string, number>();
	private readonly collapsedSections = new Set<string>();

	constructor(app: App, private readonly plugin: ObsidianIcalPlugin) {
		super(app, plugin);
	}

	hide(): void {
		for (const timeoutId of this.pendingUpdates.values()) {
			window.clearTimeout(timeoutId);
		}
		this.pendingUpdates.clear();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const header = containerEl.createDiv({ cls: "ical-pro-header" });
		const headerText = header.createDiv({ cls: "ical-pro-header-title" });
		new Setting(headerText).setHeading().setName(this.plugin.manifest.name).setDesc("v" + this.plugin.manifest.version);

		const authorInfo = header.createDiv({ cls: "ical-pro-author" });
		authorInfo.createSpan({ text: "by " });
		authorInfo.createEl("a", {
			text: "Liuh886",
			href: "https://github.com/liuh886",
			cls: "ical-pro-author-link",
		});
		authorInfo.createSpan({ text: " | " });
		authorInfo.createEl("a", {
			text: "GitHub repository",
			href: "https://github.com/liuh886/obsidian-ical-plugin-pro",
			cls: "ical-pro-repo-link",
		});

		const ctx: SectionContext = {
			app: this.app,
			plugin: this.plugin,
			scheduleUpdate: (key, task, delay) => this.scheduleUpdate(key, task, delay),
			runAsync: (task) => this.runAsync(task),
			addSection: (el, key, icon, text, defaultCollapsed) => this.addSection(el, key, icon, text, defaultCollapsed),
			rerender: () => this.display(),
		};

		renderStatusCard(ctx, containerEl);
		renderDestinationSettings(ctx, containerEl);
		renderTaskSourceSettings(ctx, containerEl);
		renderDateSettings(ctx, containerEl);
		renderFilteringSettings(ctx, containerEl);
		renderAdvancedSettings(ctx, containerEl);
		renderSupportSection(ctx, containerEl);
	}

	private addSection(el: HTMLElement, key: string, icon: string, text: string, defaultCollapsed = false): HTMLElement {
		const isCollapsed = this.collapsedSections.has(key) || (defaultCollapsed && !this.collapsedSections.has(`_${key}`));
		const group = el.createDiv({ cls: `ical-pro-section-group${isCollapsed ? " is-collapsed" : ""}` });
		const header = group.createDiv({ cls: "ical-pro-section-header" });
		const iconEl = header.createDiv({ cls: "ical-pro-section-icon" });
		setIcon(iconEl, icon);
		header.createEl("h3", { text, cls: "ical-pro-section-title" });
		const indicator = header.createSpan({ cls: "collapse-indicator" });
		setIcon(indicator, "chevron-down");
		header.onClickEvent((e) => {
			if ((e.target as HTMLElement).closest(".setting-item-control")) return;
			const nowCollapsed = group.classList.toggle("is-collapsed");
			if (nowCollapsed) {
				this.collapsedSections.add(key);
				this.collapsedSections.delete(`_${key}`);
			} else {
				this.collapsedSections.delete(key);
				this.collapsedSections.add(`_${key}`);
			}
		});
		return group;
	}

	private scheduleUpdate(key: string, task: () => Promise<void>, delay = 250): void {
		const existing = this.pendingUpdates.get(key);
		if (existing !== undefined) {
			window.clearTimeout(existing);
		}

		const timeoutId = window.setTimeout(() => {
			this.pendingUpdates.delete(key);
			void task();
		}, delay);

		this.pendingUpdates.set(key, timeoutId);
	}

	private runAsync(task: () => Promise<void>): void {
		task().catch((error) => {
			console.error("iCal Pro settings error:", error);
			new Notice(`iCal Pro: ${error instanceof Error ? error.message : "Unexpected error"}`);
		});
	}
}
