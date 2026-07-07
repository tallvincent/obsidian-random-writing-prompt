import {
	App,
	Modal,
	Notice,
	Plugin,
	Setting,
	SuggestModal,
	TFile,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	Settings,
	SettingTab,
} from './settings';

export default class RandomWritingPrompt extends Plugin {
	settings!: Settings;

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-random-prompt',
			name: 'Open random new prompt',
			callback: async () => {
				// Find the prompts file
				const fileName: string = this.settings.mainPromptsFile;
				const file = this.app.vault.getAbstractFileByPath(fileName);
				// TODO: return an error or notice if the file can't be found
				if (!(file instanceof TFile)) return [];

				// Find all prompts
				const possiblePrompts: Prompt[] = await this.getPromptsFromFile(file);

				if (possiblePrompts.length === 0) {
					return new Notice('Your prompts file is currently empty');
				}

				// Select random prompt
				const prompt: Prompt | undefined = this.getRandomElement(possiblePrompts.filter((p) => !p.started));

				if (!prompt) {
					return new Notice('Your prompts file is currently empty');
				}

				// Create a new file with that prompt as name
				// TODO: add in some metadata - could also allow user to specify template
				const newFile: TFile = await this.app.vault.create(this.getPromptFilePath(prompt.title), await this.getTemplateContent());

				// Create backlink in prompt file
				await this.app.vault.process(file, (data) => {
					return data.replace(prompt.title, `[[${prompt.title}]]`);
				})

				// Open newly created prompt
				return await this.app.workspace.getLeaf('tab').openFile(newFile);
			},
		});

		this.addCommand({
			id: 'open-main-prompts-file',
			name: 'Open main prompts file',
			callback: async () => {
				const fileName: string = this.settings.mainPromptsFile;
				const file = await this.getFileByName(fileName);
				if (!file) {
					return new Notice('You do not have a main prompts file');
				}
				return await this.app.workspace.getLeaf('tab').openFile(file);
			}
		})

		this.addCommand({
			id: 'show-all-prompts',
			name: 'Show all prompts',
			callback: async () => {
				const fileName = this.settings.mainPromptsFile;
				const file = await this.getFileByName(fileName);
				if (!file) {
					return new Notice(`Cannot find main prompts file ${fileName}`);
				}
				const prompts: Prompt[] = await this.getPromptsFromFile(file);
				const templateContent = await this.getTemplateContent();
				return new AllPromptsModal(this.app, prompts, file, this.settings.promptsFolder, templateContent).open();
			}
		})

		this.addCommand({
			id: 'add-prompt',
			name: 'Add new prompt to file',
			callback: async () => {
				const fileName = this.settings.mainPromptsFile;
				const file = await this.getFileByName(fileName);
				if (!file) {
					return new Notice(`Cannot find main prompts file ${fileName}`);
				}
				return new AddPromptModal(this.app, file).open();
			}
		})

		this.addCommand({
			id: 'open-random-started-prompt',
			name: 'Open random started prompt',
			callback: async () => {
				// Find the prompts file
				const fileName: string = this.settings.mainPromptsFile;
				const file = await this.getFileByName(fileName);

				if (!file) {
					return new Notice(`Cannot find main prompts file ${fileName}`);
				}

				// Find all prompts
				const possiblePrompts: Prompt[] = await this.getPromptsFromFile(file);

				if (!possiblePrompts) {
					return new Notice('Your prompts file is currently empty');
				}

				// Select random prompt
				const prompt: Prompt | undefined = this.getRandomElement(possiblePrompts.filter((p) => p.started));

				if (!prompt) {
					return new Notice('Your prompts file is currently empty');
				}

				const promptFile = this.app.vault.getAbstractFileByPath(this.getPromptFilePath(prompt.title));
				if (!(promptFile instanceof TFile)) return [];

				// Open newly created prompt
				return await this.app.workspace.getLeaf('tab').openFile(promptFile);
			}
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<Settings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getRandomElement<T>(arr: T[]): T | undefined {
		if (arr.length === 0) return undefined;

		const index = Math.floor(Math.random() * arr.length);
		return arr[index];
	}

	async getFileByName(fileName: string) {
		const file = this.app.vault.getAbstractFileByPath(fileName);
		if (!(file instanceof TFile)) return null;
		return file;
	}

	async getPromptsFromFile(file: TFile) {
		const content: string = await this.app.vault.read(file);
		if (!content) {
			return [];
		}
		const lines: string[] = content.split(/\r?\n/);
		const headingIndex = lines.findIndex((l) => l.trim() === '# Prompts');
		if (headingIndex === -1) return [];

		const promptLines: string[] = [];
		for (const line of lines.slice(headingIndex + 1)) {
			if (line.startsWith('#')) break;
			if (line.length > 0) promptLines.push(line);
		}

		const prompts: Prompt[] = [];

		for (const l of promptLines) {
			const title = l.replaceAll('[', '').replaceAll(']', '');
			const promptFile = this.app.vault.getAbstractFileByPath(this.getPromptFilePath(title));
			let started = false;
			if (promptFile instanceof TFile) {
				const fileContent = await this.app.vault.read(promptFile);
				const body = fileContent.replace(/^---[\s\S]*?---\n?/, '').trim();
				started = body.length > 0;
			}
			prompts.push({ title, started });
		}

		return prompts;
	}

	getPromptFilePath(title: string): string {
		const folder = this.settings.promptsFolder;
		const filename = title + '.md';
		return folder ? `${folder}/${filename}` : filename;
	}

	async getTemplateContent(): Promise<string> {
		const path = this.settings.templateFile;
		if (!path) return '';
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return '';
		return await this.app.vault.read(file);
	}
}

interface Prompt {
	title: string,
	started: boolean
}

class AllPromptsModal extends SuggestModal<Prompt> {
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

	// Returns all available suggestions.
	getSuggestions(query: string): Prompt[] {
		return this.prompts.filter((prompt) =>
			prompt.title.toLowerCase().includes(query.toLowerCase())
		);
	}

	// Renders each suggestion item.
	renderSuggestion(prompt: Prompt, el: HTMLElement) {
		el.createDiv({ text: prompt.title });
		el.createEl('small', { text: prompt.started ? 'Started' : '' });
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(prompt: Prompt, _evt: MouseEvent | KeyboardEvent) {
		const filePath = this.promptsFolder
			? `${this.promptsFolder}/${prompt.title}.md`
			: prompt.title + '.md';

		if (!prompt.started) {
			this.app.vault.create(filePath, this.templateContent).then((newFile) => {
				this.app.vault.process(this.promptsFile, (data) => {
					return data.replace(prompt.title, `[[${prompt.title}]]`);
				}).then(() => {
					this.app.workspace.getLeaf('tab').openFile(newFile);
				});
			});
		} else {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				this.app.workspace.getLeaf('tab').openFile(file);
			}
		}
	}
}

class AddPromptModal extends Modal {
	promptsFile: TFile;

	constructor(
		app: App,
		promptsFile: TFile
	) {
		super(app);
		this.promptsFile = promptsFile;

		this.setTitle('Add a new prompt to the prompts file');

		let prompt = '';
		new Setting(this.contentEl)
			.addText((text) => {
				text.inputEl.style.width = '100%';
				text.inputEl.addEventListener('keydown', async (e: KeyboardEvent) => {
					if (e.key === 'Enter' && prompt.trim()) {
						e.preventDefault();
						const content = await this.app.vault.read(this.promptsFile);
						const newLine = (content.endsWith('\n') ? '' : '\n') + prompt.trim() + '\n';
						await this.app.vault.modify(this.promptsFile, content + newLine);
						this.close();
					}
				});
				text.onChange((value) => {
					prompt = value;
				});
			});
	}
}
