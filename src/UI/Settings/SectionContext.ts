/* global activeDocument */
import { App, Notice, Setting, setIcon } from "obsidian";
import ObsidianIcalPlugin from "../../ObsidianIcalPlugin";

export interface SectionContext {
	app: App;
	plugin: ObsidianIcalPlugin;
	scheduleUpdate: (key: string, task: () => Promise<void>, delay?: number) => void;
	runAsync: (task: () => Promise<void>) => void;
	addSection: (el: HTMLElement, key: string, icon: string, text: string, defaultCollapsed?: boolean) => HTMLElement;
	rerender: () => void;
}

export function createDescriptionWithLink(prefix: string, linkText: string, href: string): DocumentFragment {
	const fragment = activeDocument.createDocumentFragment();
	fragment.append(prefix);

	const link = activeDocument.createElement("a");
	link.href = href;
	link.textContent = linkText;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	fragment.append(link);

	return fragment;
}

export { Setting, setIcon, Notice };
