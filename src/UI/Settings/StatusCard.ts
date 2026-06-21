import { Notice, setIcon } from "obsidian";
import type { SectionContext } from "./SectionContext";

export function renderSetupChecklist(ctx: SectionContext, containerEl: HTMLElement): void {
	// Remove any existing checklist before rendering a fresh one
	const existing = containerEl.querySelector(".ical-pro-checklist");
	if (existing) existing.remove();

	const { plugin } = ctx;
	const s = plugin.settings;

	const hasDestination = s.isSaveToFileEnabled || (s.isSaveToGistEnabled && !!s.githubUsername && !!s.githubGistId && !!s.githubPersonalAccessToken);
	const hasSource = s.sourceRules.length > 0 && s.sourceRules.some(r => r.path !== "/" || r.category);
	const readiness = plugin.getSyncReadiness();

	const steps: { label: string; done: boolean }[] = [
		{ label: "Choose destination", done: hasDestination },
		{ label: "Add source path", done: hasSource },
		{ label: "Validate connection", done: readiness.ready },
		{ label: "Sync now", done: plugin.syncHistory.length > 0 },
	];

	const allDone = steps.every(s => s.done);
	if (allDone) return; // Hide checklist once setup is complete

	const card = containerEl.createDiv({ cls: "ical-pro-checklist" });
	card.createEl("div", { text: "Getting started", cls: "ical-pro-checklist-title" });

	steps.forEach(step => {
		const row = card.createDiv({ cls: `ical-pro-checklist-item${step.done ? " is-done" : ""}` });
		setIcon(row, step.done ? "check-circle" : "circle");
		row.createSpan({ text: step.label, cls: step.done ? "ical-pro-checklist-done" : "" });
	});
}

export function refreshSetupChecklist(ctx: SectionContext, containerEl: HTMLElement): void {
	renderSetupChecklist(ctx, containerEl);
}

export function renderStatusCard(ctx: SectionContext, containerEl: HTMLElement): void {
	const statusCard = containerEl.createDiv({ cls: "ical-pro-status-card" });
	renderStatusCardContent(ctx, statusCard, containerEl);
}

export function refreshStatusCard(ctx: SectionContext, containerEl: HTMLElement): void {
	const existing = containerEl.querySelector(".ical-pro-status-card");
	if (!existing) return;
	existing.empty();
	renderStatusCardContent(ctx, existing as HTMLElement, containerEl);
}

function renderStatusCardContent(ctx: SectionContext, statusCard: HTMLElement, outerContainer: HTMLElement): void {
	const { plugin, runAsync } = ctx;
	const statusGrid = statusCard.createDiv({ cls: "ical-pro-status-grid" });

	const urlCol = statusGrid.createDiv({ cls: "ical-pro-status-col" });
	const statusTitle = urlCol.createDiv({ cls: "ical-pro-card-title" });
	setIcon(statusTitle, "link");
	statusTitle.createSpan({ text: " Subscription url" });
	const urlContainer = urlCol.createDiv({ cls: "ical-url-container" });
	renderUrl(ctx, urlContainer);

	const syncCol = statusGrid.createDiv({ cls: "ical-pro-status-col" });
	const syncTitle = syncCol.createDiv({ cls: "ical-pro-card-title" });
	setIcon(syncTitle, "refresh-cw");
	syncTitle.createSpan({ text: " Sync status" });
	const syncInfo = syncCol.createDiv({ cls: "ical-sync-info" });

	const resultRow = syncInfo.createDiv({ cls: "ical-sync-result" });
	const statusClass = `ical-status-${plugin.lastSyncStatus.toLowerCase().replace(/\s+/g, "-")}`;
	resultRow.createSpan({ text: plugin.lastSyncStatus, cls: statusClass });
	resultRow.createSpan({ text: plugin.lastSyncTime, cls: "ical-sync-time" });
	if (plugin.lastSyncMessage) {
		syncInfo.createEl("div", { text: plugin.lastSyncMessage, cls: "ical-sync-detail" });
	}

	const readiness = plugin.getSyncReadiness();
	if (readiness.ready) {
		syncInfo.createEl("div", { text: `Ready: ${readiness.activeDestinations.join(", ")}`, cls: "ical-sync-detail" });
	} else {
		readiness.issues.forEach((issue) => {
			syncInfo.createEl("div", { text: issue, cls: "ical-sync-detail ical-sync-issue" });
		});
		const guidance = plugin.getRecommendedNextStep();
		if (guidance && guidance !== "No destination issues detected.") {
			const guidanceEl = syncCol.createDiv({ cls: "ical-pro-guidance" });
			setIcon(guidanceEl, "lightbulb");
			guidanceEl.createSpan({ text: guidance });
		}
	}

	const preview = plugin.getSyncPreview();
	const previewRow = syncInfo.createDiv({ cls: "ical-sync-preview" });
	previewRow.createSpan({ text: `${preview.exportedTaskCount}`, cls: "ical-preview-count" });
	previewRow.createSpan({ text: ` to export ` });
	previewRow.createSpan({ text: `(${preview.eventCount} events, ${preview.todoCount} todos)`, cls: "ical-sync-time" });
	if (preview.filteredTaskCount > 0) {
		const filteredRow = syncInfo.createDiv({ cls: "ical-sync-detail" });
		filteredRow.createSpan({ text: `${preview.filteredTaskCount} filtered` });
		preview.filteredReasons.forEach((entry) => {
			syncInfo.createEl("div", { text: `${entry.reason} (${entry.count})`, cls: "ical-sync-sub" });
		});
	}

	const recentResult = plugin.syncHistory[0];
	if (recentResult?.destinationResults.length) {
		syncInfo.createDiv({ cls: "ical-sync-divider" });
		recentResult.destinationResults.forEach((result) => {
			const row = syncInfo.createDiv({ cls: `ical-sync-dest ical-dest-${result.status}` });
			row.createSpan({ text: result.name, cls: "ical-dest-name" });
			row.createSpan({ text: result.status });
			if (result.message) {
				row.createSpan({ text: ` — ${result.message}`, cls: "ical-sync-time" });
			}
		});
	}

	const syncBtn = syncCol.createEl("button", { text: "Sync now", cls: "mod-cta ical-sync-button" });
	syncBtn.onClickEvent(() => {
		runAsync(async () => {
			syncBtn.disabled = true;
			syncBtn.setText("Syncing...");
			syncBtn.removeClass("ical-sync-success", "ical-sync-fail");
			try {
				await plugin.saveCalendar();
				syncBtn.setText("Synced!");
				syncBtn.addClass("ical-sync-success");
			} catch {
				syncBtn.setText("Failed");
				syncBtn.addClass("ical-sync-fail");
			} finally {
				window.setTimeout(() => {
					syncBtn.disabled = false;
					syncBtn.setText("Sync now");
					syncBtn.removeClass("ical-sync-success", "ical-sync-fail");
					refreshStatusCard(ctx, outerContainer);
					refreshSetupChecklist(ctx, outerContainer);
				}, 1500);
			}
		});
	});

	const diagnosticsBtn = syncCol.createEl("button", { text: "Copy diagnostics", cls: "ical-sync-button" });
	diagnosticsBtn.title = "Copies settings, readiness, preview, and recent sync results for issue reports.";
	diagnosticsBtn.onClickEvent(async () => {
		try {
			await navigator.clipboard.writeText(plugin.getDiagnosticsBundle());
			new Notice("Diagnostics copied.");
		} catch {
			new Notice("Copy failed — please copy manually.");
		}
	});
}

function renderUrl(ctx: SectionContext, container: HTMLElement): void {
	const { plugin } = ctx;
	const username = plugin.settings.githubUsername;
	const gistId = plugin.settings.githubGistId;
	const filename = plugin.settings.filename || "obsidian.ics";
	const localPath = plugin.settings.savePath === "/"
		? filename
		: `${plugin.settings.savePath}/${filename}`;

	if (plugin.settings.isSaveToGistEnabled && username && gistId) {
		const url = `https://gist.githubusercontent.com/${username}/${gistId}/raw/${filename}`;
		const statusRow = container.createDiv({ cls: "ical-url-status" });
		const readiness = plugin.getSyncReadiness();
		if (readiness.ready) {
			statusRow.createSpan({ text: "Gist URL ready", cls: "ical-url-status-ready" });
		} else {
			statusRow.createSpan({ text: "Not validated", cls: "ical-url-status-warn" });
		}
		container.createEl("code", { text: url, cls: "ical-url-text" });
		const copyBtn = container.createEl("button", { text: "Copy link", cls: "mod-cta" });
		copyBtn.onClickEvent(async () => {
			try {
				await navigator.clipboard.writeText(url);
				copyBtn.setText("Copied.");
				window.setTimeout(() => copyBtn.setText("Copy link"), 2000);
			} catch {
				new Notice("Copy failed — please copy manually.");
			}
		});
		return;
	}

	if (plugin.settings.isSaveToFileEnabled) {
		const statusRow = container.createDiv({ cls: "ical-url-status" });
		statusRow.createSpan({ text: "Local path ready", cls: "ical-url-status-ready" });
		container.createEl("code", { text: localPath, cls: "ical-url-text" });
		container.createEl("p", { text: "Local file export is enabled. Subscribe to this file from your calendar app.", cls: "ical-url-placeholder" });
		return;
	}

	const statusRow = container.createDiv({ cls: "ical-url-status" });
	statusRow.createSpan({ text: "Not ready", cls: "ical-url-status-warn" });
	container.createEl("p", { text: "No active calendar destination. Enable hosted gist sync or local file export.", cls: "ical-url-placeholder" });
}

export function updateUrlDisplay(ctx: SectionContext, containerEl: HTMLElement): void {
	const container = containerEl.querySelector(".ical-url-container");
	if (!container) return;
	container.empty();
	renderUrl(ctx, container as HTMLElement);
}
