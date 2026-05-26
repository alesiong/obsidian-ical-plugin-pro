import { TFolder, AbstractInputSuggest, App, TAbstractFile } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    private readonly textInput: HTMLInputElement;

    constructor(app: App, textInputEl: HTMLInputElement) {
        super(app, textInputEl);
        this.textInput = textInputEl;
    }

    getSuggestions(inputStr: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (folder instanceof TFolder && folder.path.toLowerCase().includes(lowerCaseInputStr)) {
                folders.push(folder);
            }
        });

        return folders;
    }

    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.setText(folder.path);
    }

    selectSuggestion(folder: TFolder): void {
        this.textInput.value = folder.path;
        this.textInput.trigger("input");
        this.close();
    }
}

export class CategorySuggest extends AbstractInputSuggest<string> {
    private readonly textInput: HTMLInputElement;
    private readonly categories: string[];

    constructor(app: App, textInputEl: HTMLInputElement, categories: string[]) {
        super(app, textInputEl);
        this.textInput = textInputEl;
        this.categories = [...new Set(categories.filter((c) => c.trim()))];
    }

    getSuggestions(inputStr: string): string[] {
        const lower = inputStr.toLowerCase();
        return this.categories.filter((c) => c.toLowerCase().includes(lower));
    }

    renderSuggestion(category: string, el: HTMLElement): void {
        el.setText(category);
    }

    selectSuggestion(category: string): void {
        this.textInput.value = category;
        this.textInput.trigger("input");
        this.close();
    }
}
