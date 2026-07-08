import { App, normalizePath, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import RandomWritingPrompt from './main';
import { FileInputSuggest } from './ui/file-input-suggest';
import { FolderInputSuggest } from './ui/folder-input-suggest';

export interface Settings {
	mainPromptsFile: string;
	promptsFolder: string;
	templateFile: string;
}

export const DEFAULT_SETTINGS: Settings = {
	mainPromptsFile: 'Random Writing Prompts.md',
	promptsFolder: '',
	templateFile: '',
};

export class SettingTab extends PluginSettingTab {
	plugin: RandomWritingPrompt;

	constructor(app: App, plugin: RandomWritingPrompt) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions() {
		return [
			{
				name: 'Main prompt file',
				description: 'The file that will store all your prompts',
				control: {
					type: 'file',
					key: 'mainPromptsFile',
					filter: (file: TFile) => file.extension === 'md',
				},
			},
			{
				name: 'Prompts folder',
				description: 'Where to store the prompt files',
				control: {
					type: 'folder',
					key: 'promptsFolder',
					includeRoot: true
				}
			},
			{
				name: 'Template file',
				description: 'A file whose content will be used as the template for new prompts',
				control: {
					type: 'file',
					key: 'templateFile',
					filter: (file: TFile) => file.extension === 'md',
				},
			},
		];
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Main prompt file')
			.setDesc('The file that will store all your prompts')
			.addText((text) => {
				text
					.setValue(this.plugin.settings.mainPromptsFile)
					.onChange(async (value) => {
						this.plugin.settings.mainPromptsFile = value;
						await this.plugin.saveSettings();
					});

			new FileInputSuggest(
				this.app,
				text.inputEl,
				(file: TFile) => {
					this.plugin.settings.mainPromptsFile = normalizePath(file.path);
					void this.plugin.saveSettings();
				},
				(file: TFile) => file.extension === 'md',
			);
			});

		new Setting(containerEl)
			.setName('Prompts folder')
			.setDesc('Where to store the prompt files')
			.addText((text) => {
				text
					.setPlaceholder('Root folder')
					.setValue(this.plugin.settings.promptsFolder)
					.onChange(async (value) => {
						this.plugin.settings.promptsFolder = value;
						await this.plugin.saveSettings();
					});

			new FolderInputSuggest(
				this.app,
				text.inputEl,
				(folder: TFolder) => {
					this.plugin.settings.promptsFolder = normalizePath(folder.path);
					void this.plugin.saveSettings();
				},
			);
			});

		new Setting(containerEl)
			.setName('Template file')
			.setDesc('A file whose content will be used as the template for new prompts')
			.addText((text) => {
				text
					.setPlaceholder('No template')
					.setValue(this.plugin.settings.templateFile)
					.onChange(async (value) => {
						this.plugin.settings.templateFile = value;
						await this.plugin.saveSettings();
					});

			new FileInputSuggest(
				this.app,
				text.inputEl,
				(file: TFile) => {
					this.plugin.settings.templateFile = normalizePath(file.path);
					void this.plugin.saveSettings();
				},
				(file: TFile) => file.extension === 'md',
			);
			});
	}
}
