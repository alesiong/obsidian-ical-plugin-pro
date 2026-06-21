import type { SectionContext } from "./SectionContext";

export function renderSupportSection(ctx: SectionContext, containerEl: HTMLElement): void {
	const sectionEl = ctx.addSection(containerEl, "support", "heart", "Support the project", true);

	const body = sectionEl.createDiv({ cls: "ical-pro-section-body" });

	const supportDiv = body.createDiv({ cls: "ical-pro-support" });
	supportDiv.createEl("p", {
		text: "If this plugin helps you stay organized, consider supporting its development.",
		cls: "setting-item-description",
	});

	const kofiLink = supportDiv.createEl("a", {
		href: "https://ko-fi.com/F1F7WYJ6B",
	});
	kofiLink.createEl("img", {
		attr: {
			src: "https://ko-fi.com/img/githubbutton_sm.svg",
			alt: "ko-fi",
		},
		cls: "ical-pro-kofi-img",
	});
}
