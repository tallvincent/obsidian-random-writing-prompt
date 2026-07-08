import {
	normalizePath,
	Notice,
	Plugin,
	TFile,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	Settings,
	SettingTab,
} from './settings';
import { Prompt } from './types';
import { wrapAsWikilink } from './utils/helpers';
import { AllPromptsModal } from './ui/all-prompts-modal';
import { AddPromptModal } from './ui/add-prompt-modal';

export default class RandomWritingPrompt extends Plugin {
	settings!: Settings;

	async onload() {
		await this.loadSettings();
		await this.ensurePromptsFile();

		this.addCommand({
			id: 'open-random-prompt',
			name: 'Open random new prompt',
			callback: async () => {
				const promptsFileName: string = this.settings.mainPromptsFile;
				const promptsFile = await this.getFileByName(promptsFileName);
				if (!promptsFile) {
					return this.noMainPromptsFileNotice();
				}

				const possiblePrompts: Prompt[] = await this.getPromptsFromFile(promptsFile);
				if (possiblePrompts.length === 0) {
					return this.noPromptsNotice();
				}

				const prompt: Prompt | undefined = this.getRandomElement(possiblePrompts.filter((p) => !p.started));

				if (!prompt) {
					return this.noNotStartedPromptsNotice();
				}

				const maybeFile = await this.getFileByName(this.getPromptFilePath(prompt.title));
				if (maybeFile && maybeFile instanceof TFile) {
					return await this.app.workspace.getLeaf('tab').openFile(maybeFile);
				}

				const newFile: TFile = await this.app.vault.create(this.getPromptFilePath(prompt.title), await this.getTemplateContent());

				await this.app.vault.process(promptsFile, (data) => {
					return wrapAsWikilink(data, prompt.title);
				})

				return await this.app.workspace.getLeaf('tab').openFile(newFile);
			},
		});

		this.addCommand({
			id: 'open-main-prompts-file',
			name: 'Open main prompts file',
			callback: async () => {
				const promptsFileName: string = this.settings.mainPromptsFile;
				const promptsFile = await this.getFileByName(promptsFileName);
				if (!promptsFile) {
					return this.noMainPromptsFileNotice();
				}
				return await this.app.workspace.getLeaf('tab').openFile(promptsFile);
			}
		})

		this.addCommand({
			id: 'show-all-prompts',
			name: 'Show all prompts',
			callback: async () => {
				const promptsFileName = this.settings.mainPromptsFile;
				const promptsFile = await this.getFileByName(promptsFileName);
				if (!promptsFile) {
					return this.noMainPromptsFileNotice();
				}
				const prompts: Prompt[] = await this.getPromptsFromFile(promptsFile);
				const templateContent = await this.getTemplateContent();
				return new AllPromptsModal(this.app, prompts, promptsFile, this.settings.promptsFolder, templateContent).open();
			}
		})

		this.addCommand({
			id: 'add-prompt',
			name: 'Add new prompt to file',
			callback: async () => {
				const promptsFileName = this.settings.mainPromptsFile;
				const promptsFile = await this.getFileByName(promptsFileName);
				if (!promptsFile) {
					return this.noMainPromptsFileNotice();
				}
				const prompts = await this.getPromptsFromFile(promptsFile);
				const existingTitles = prompts.map((p) => p.title.toLowerCase());
				return new AddPromptModal(this.app, promptsFile, existingTitles).open();
			}
		})

		this.addCommand({
			id: 'open-random-started-prompt',
			name: 'Open random started prompt',
			callback: async () => {
				const promptsFileName = this.settings.mainPromptsFile;
				const promptsFile = await this.getFileByName(promptsFileName);
				if (!promptsFile) {
					return this.noMainPromptsFileNotice();
				}

				const possiblePrompts: Prompt[] = await this.getPromptsFromFile(promptsFile);
				if (!possiblePrompts) {
					return this.noPromptsNotice();
				}

				const prompt: Prompt | undefined = this.getRandomElement(possiblePrompts.filter((p) => p.started));

				if (!prompt) {
					return this.noStartedPromptsNotice();
				}

				const promptFile = await this.getFileByName(this.getPromptFilePath(prompt.title));
				if (!promptFile) {
					return new Notice(`Could not open file ${prompt.title}`);
				}

				return await this.app.workspace.getLeaf('tab').openFile(promptFile);
			}
		})

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
		const file = this.app.vault.getAbstractFileByPath(normalizePath(fileName));
		if (file instanceof TFile) return file;
		const basename = fileName.split('/').pop();
		if (!basename) return null;
		const match = this.app.vault.getFiles().find((f) => f.name === basename);
		return match ?? null;
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
				const templateContent = await this.getTemplateContent();
				started = body.length > 0 && fileContent !== templateContent;
			}
			prompts.push({ title, started });
		}

		return prompts;
	}

	getPromptFilePath(title: string): string {
		const folder = this.settings.promptsFolder;
		const filename = title + '.md';
		return folder ? normalizePath(`${folder}/${filename}`) : filename;
	}

	async getTemplateContent(): Promise<string> {
		const path = normalizePath(this.settings.templateFile);
		if (!path) return '';
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return '';
		return await this.app.vault.read(file);
	}

	async ensurePromptsFile(): Promise<void> {
		const path = normalizePath(this.settings.mainPromptsFile);
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) return;

		const dir = path.split('/').slice(0, -1).join('/');
		if (dir) {
			const folder = this.app.vault.getAbstractFileByPath(dir);
			if (!folder) {
				await this.app.vault.createFolder(dir);
			}
		}

		await this.app.vault.create(path, '# Prompts\n');
	}

	noMainPromptsFileNotice() {
		return new Notice(`The main prompts file ${this.settings.mainPromptsFile} was not able to be found`);
	}

	noPromptsNotice() {
		return new Notice(`There were no prompts found in the main prompts file ${this.settings.mainPromptsFile}`);
	}

	noNotStartedPromptsNotice() {
		return new Notice(`Did not find any new prompts that have not been started, please add some more prompts to ${this.settings.mainPromptsFile}`);
	}

	noStartedPromptsNotice() {
		return new Notice('Did not find any prompts that have already been started')
	}
}

