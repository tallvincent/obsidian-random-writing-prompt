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

		// This creates an icon in the left ribbon.
		// TODO: not sure this will be needed but maybe to show all the prompts that have been filled / not filled
		this.addRibbonIcon('dice', 'Sample', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-random-prompt',
			name: 'Open random prompt',
			callback: async () => {
				// Find the prompts file
				// TODO: can get this from settings
				const fileName: string = 'Random Writing Prompts.md';
				const file = this.app.vault.getAbstractFileByPath(fileName);
				if (!(file instanceof TFile)) return [];

				// Find all prompts (lines) without links
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
				const newFile: TFile = await this.app.vault.create(prompt.title + '.md', '');

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
				const fileName: string = 'Random Writing Prompts.md';
				const file = await this.getMainPromptsFile(fileName);
				if (file) {
					return await this.app.workspace.getLeaf('tab').openFile(file);
				} else {
					new Notice('You do not have a main prompts file');
				}
			}
		})

		this.addCommand({
			id: 'show-all-prompts',
			name: 'Show all prompts',
			callback: async () => {
				const file = await this.getMainPromptsFile('Random Writing Prompts.md');
				if (!(file instanceof TFile)) return [];
				const prompts: Prompt[] = await this.getPromptsFromFile(file);
				return new AllPromptsModal(this.app, prompts, file).open();
			}
		})

		this.addCommand({
			id: 'add-prompt',
			name: 'Add new prompt to file',
			callback: async () => {
				const file = await this.getMainPromptsFile('Random Writing Prompts.md');
				if (!(file instanceof TFile)) return [];
				return new AddPromptModal(this.app, file).open();
			}
		})

		this.addCommand({
			id: 'open-random-started-prompt',
			name: 'Open random started prompt',
			callback: async () => {
				// Find the prompts file
				// TODO: can get this from settings
				const fileName: string = 'Random Writing Prompts.md';
				const file = this.app.vault.getAbstractFileByPath(fileName);
				if (!(file instanceof TFile)) return [];

				// Find all prompts (lines) without links
				const possiblePrompts: Prompt[] = await this.getPromptsFromFile(file);

				if (!possiblePrompts) {
					return new Notice('Your prompts file is currently empty');
				}

				// Select random prompt
				const prompt: Prompt | undefined = this.getRandomElement(possiblePrompts.filter((p) => p.started));

				if (!prompt) {
					return new Notice('Your prompts file is currently empty');
				}

				const promptFile = this.app.vault.getAbstractFileByPath(prompt.title + '.md');
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

	isBacklinkLine(line: string) {
		// Only matches regular links: [[target]] or [[target|alias]] (NOT embeds ![[...]])
		return /\[\[[^\]]+\]\]/.test(line) && !/!\[\[[^\]]+\]\]/.test(line);
	}

	getRandomElement<T>(arr: T[]): T | undefined {
		if (arr.length === 0) return undefined;

		const index = Math.floor(Math.random() * arr.length);
		return arr[index];
	}

	async getMainPromptsFile(fileName: string) {
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
		return lines.filter((l) => !!l).map((l) => {
			return {
				title: l.replaceAll('[', '').replaceAll(']', ''),
				started: this.isBacklinkLine(l)
			}
		})
	}
}

interface Prompt {
	title: string,
	started: boolean
}

class AllPromptsModal extends SuggestModal<Prompt> {
	prompts: Prompt[];
	promptsFile: TFile;

	constructor(
		app: App,
		prompts: Prompt[],
		promptsFile: TFile,
	) {
		super(app);
		this.prompts = prompts;
		this.promptsFile = promptsFile;
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
		if (!prompt.started) {
			this.app.vault.create(prompt.title + '.md', '').then((newFile) => {
				this.app.vault.process(this.promptsFile, (data) => {
					return data.replace(prompt.title, `[[${prompt.title}]]`);
				}).then(() => {
					this.app.workspace.getLeaf('tab').openFile(newFile);
				});
			});
		} else {
			const file = this.app.vault.getAbstractFileByPath(prompt.title + '.md');
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
