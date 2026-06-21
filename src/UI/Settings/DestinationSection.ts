import { Notice, normalizePath } from "obsidian";
import type { SectionContext } from "./SectionContext";
import { Setting, createDescriptionWithLink } from "./SectionContext";
import { FolderSuggest } from "../FolderSuggest";
import { refreshSetupChecklist, updateUrlDisplay } from "./StatusCard";

export function renderDestinationSettings(ctx: SectionContext, containerEl: HTMLElement): void {
	const { plugin, scheduleUpdate, runAsync, addSection } = ctx;
	const sectionEl = addSection(containerEl, "destination", "cloud", "Sync and cloud connectivity");

	const body = sectionEl.createDiv({ cls: "ical-pro-section-body" });

	new Setting(body)
		.setName("Calendar filename")
		.setDesc("Used for both local storage and hosted gist sync, for example calendar.ics.")
		.addText((text) =>
			text.setPlaceholder("Calendar.ics").setValue(plugin.settings.filename).onChange((value) => {
				scheduleUpdate("filename", async () => {
					await plugin.updateSettings({ filename: value || "obsidian.ics" });
					updateUrlDisplay(ctx, containerEl);
				});
			}),
		);

	new Setting(body)
		.setName("Save to local file")
		.setDesc("Export the .ics file to your vault for local sync workflows.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isSaveToFileEnabled).onChange((value) => {
				runAsync(async () => {
					await plugin.updateSettings({ isSaveToFileEnabled: value });
					localFileDiv.classList.toggle("is-hidden", !value);
					updateUrlDisplay(ctx, containerEl);
					refreshSetupChecklist(ctx, containerEl);
				});
			}),
		);

	const localFileDiv = body.createDiv({
		cls: `ical-pro-conditional${plugin.settings.isSaveToFileEnabled ? "" : " is-hidden"}`,
	});

	new Setting(localFileDiv)
		.setName("Vault storage path")
		.setDesc("Specify the folder for the local .ics file relative to vault root.")
		.addText((text) => {
			new FolderSuggest(plugin.app, text.inputEl);
			text.setValue(plugin.settings.savePath).onChange((value) => {
				scheduleUpdate("savePath", async () => {
					await plugin.updateSettings({ savePath: normalizePath(value) || "/" });
					updateUrlDisplay(ctx, containerEl);
				});
			});
		});

	new Setting(body)
		.setName("Sync to hosted gist")
		.setDesc("Publish your calendar to a private gist for subscriptions across devices.")
		.addToggle((toggle) =>
			toggle.setValue(plugin.settings.isSaveToGistEnabled).onChange((value) => {
				runAsync(async () => {
					await plugin.updateSettings({ isSaveToGistEnabled: value });
					gistDiv.classList.toggle("is-hidden", !value);
					updateUrlDisplay(ctx, containerEl);
					refreshSetupChecklist(ctx, containerEl);
				});
			}),
		);

	const gistDiv = body.createDiv({
		cls: `ical-pro-conditional${plugin.settings.isSaveToGistEnabled ? "" : " is-hidden"}`,
	});

	new Setting(gistDiv)
		.setName("GitHub username")
		.setDesc("Used to build the raw subscription link for your hosted gist.")
		.addText((text) =>
			text.setValue(plugin.settings.githubUsername).onChange((value) => {
				scheduleUpdate("githubUsername", async () => {
					await plugin.updateSettings({ githubUsername: value });
					updateUrlDisplay(ctx, containerEl);
				});
			}),
		);

	new Setting(gistDiv)
		.setName("Gist ID")
		.setDesc(createDescriptionWithLink(
			"Enter the identifier from the gist link used as the sync target. ",
			"Open Gist",
			"https://gist.github.com/",
		))
		.addText((text) =>
			text.setValue(plugin.settings.githubGistId).onChange((value) => {
				scheduleUpdate("githubGistId", async () => {
					await plugin.updateSettings({ githubGistId: value });
					updateUrlDisplay(ctx, containerEl);
				});
			}),
		);

	new Setting(gistDiv)
		.setName("Personal access token")
		.setDesc(createDescriptionWithLink(
			"Stored locally by Obsidian plugin data. Only the gist scope is required — create a fine-grained PAT scoped to Gist only. ",
			"Create token",
			"https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token",
		))
		.addText((text) =>
			text.setPlaceholder("Paste access token").setValue(plugin.settings.githubPersonalAccessToken).onChange((value) => {
				scheduleUpdate("githubPersonalAccessToken", () =>
					plugin.updateSettings({ githubPersonalAccessToken: value }),
				);
			}).inputEl.setAttribute("type", "password"),
		);

	new Setting(gistDiv)
		.setName("Validate gist access")
		.setDesc("Check whether the configured token and identifier are reachable.")
		.addButton((button) =>
			button.setButtonText("Validate").onClick(() => {
				runAsync(async () => {
					button.setDisabled(true);
					button.setButtonText("Checking access...");
					const result = await plugin.validateConnection();
					new Notice(result.message);
					button.setDisabled(false);
					button.setButtonText("Validate");
				});
			}),
		);
}
