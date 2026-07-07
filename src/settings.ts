import { App, PluginSettingTab, Setting, TFile } from 'obsidian';
import RandomWritingPrompt from './main';
import { FileInputSuggest } from './gui/file-input-suggest';

export interface Settings {
	mainPromptsFile: string;
}

export const DEFAULT_SETTINGS: Settings = {
	mainPromptsFile: 'Random Writing Prompts.md',
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
					.setPlaceholder('Random Writing Prompts.md')
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
	}
}
