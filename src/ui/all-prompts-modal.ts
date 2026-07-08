import { App, normalizePath, SuggestModal, TFile } from 'obsidian';
import { Prompt } from '../types';
import { wrapAsWikilink } from '../utils/helpers';

export class AllPromptsModal extends SuggestModal<Prompt> {
	prompts: Prompt[];
	promptsFile: TFile;
	promptsFolder: string;
	templateContent: string;

	constructor(
		app: App,
		prompts: Prompt[],
		promptsFile: TFile,
		promptsFolder: string,
		templateContent: string,
	) {
		super(app);
		this.prompts = prompts;
		this.promptsFile = promptsFile;
		this.promptsFolder = promptsFolder;
		this.templateContent = templateContent;
	}

	getSuggestions(query: string): Prompt[] {
		return this.prompts.filter((prompt) =>
			prompt.title.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(prompt: Prompt, el: HTMLElement) {
		el.createDiv({ text: prompt.title });
		el.createEl('small', { text: prompt.started ? 'Started' : '' });
	}

	onChooseSuggestion(prompt: Prompt, _evt: MouseEvent | KeyboardEvent) {
		const filePath = this.promptsFolder
			? normalizePath(`${this.promptsFolder}/${prompt.title}.md`)
			: prompt.title + '.md';

		void (async () => {
			if (!prompt.started) {
				const newFile = await this.app.vault.create(filePath, this.templateContent);
				await this.app.vault.process(this.promptsFile, (data) => {
					return wrapAsWikilink(data, prompt.title);
				});
				await this.app.workspace.getLeaf('tab').openFile(newFile);
			} else {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file instanceof TFile) {
					await this.app.workspace.getLeaf('tab').openFile(file);
				}
			}
		})();
	}
}
