import { App, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import RandomWritingPrompt from './main';
import { FileInputSuggest } from './gui/file-input-suggest';
import { FolderInputSuggest } from './gui/folder-input-suggest';

export interface Settings {
	mainPromptsFile: string;
	promptsFolder: string;
}

export const DEFAULT_SETTINGS: Settings = {
	mainPromptsFile: 'Random Writing Prompts.md',
	promptsFolder: '',
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
			}
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
						this.plugin.settings.mainPromptsFile = file.path;
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
						this.plugin.settings.promptsFolder = folder.path;
						void this.plugin.saveSettings();
					},
				);
			});
	}
}
