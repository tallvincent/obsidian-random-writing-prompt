import { AbstractInputSuggest, App, TFolder } from 'obsidian';

export class FolderInputSuggest extends AbstractInputSuggest<TFolder> {
	private onChooseFn: (folder: TFolder) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onChoose: (folder: TFolder) => void,
	) {
		super(app, inputEl);
		this.onChooseFn = onChoose;
	}

	getSuggestions(query: string): TFolder[] {
		const folders = this.app.vault
			.getAllLoadedFiles()
			.filter((f): f is TFolder => f instanceof TFolder);
		const lower = query.toLowerCase();
		return folders.filter((folder) =>
			folder.path.toLowerCase().includes(lower),
		);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.createDiv({ text: folder.path || '/' });
	}

	selectSuggestion(folder: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.setValue(folder.path);
		this.onChooseFn(folder);
		this.close();
	}
}
