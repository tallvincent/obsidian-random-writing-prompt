import { AbstractInputSuggest, App, TFile } from 'obsidian';

export class FileInputSuggest extends AbstractInputSuggest<TFile> {
	private filterFn?: (file: TFile) => boolean;
	private onChooseFn: (file: TFile) => void;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onChoose: (file: TFile) => void,
		filter?: (file: TFile) => boolean,
	) {
		super(app, inputEl);
		this.onChooseFn = onChoose;
		this.filterFn = filter;
	}

	getSuggestions(query: string): TFile[] {
		const files = this.app.vault.getFiles();
		const filtered = this.filterFn ? files.filter(this.filterFn) : files;
		const lower = query.toLowerCase();
		return filtered.filter((file) =>
			file.path.toLowerCase().includes(lower),
		);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createDiv({ text: file.path });
	}

	selectSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		this.setValue(file.path);
		this.onChooseFn(file);
	}
}
