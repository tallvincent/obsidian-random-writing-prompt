import { App, Modal, Notice, Setting, TFile } from 'obsidian';

export class AddPromptModal extends Modal {
	promptsFile: TFile;
	existingTitles: string[];

	constructor(
		app: App,
		promptsFile: TFile,
		existingTitles: string[],
	) {
		super(app);
		this.promptsFile = promptsFile;
		this.existingTitles = existingTitles;

		this.setTitle('Add a new prompt to the prompts file');

		let prompt = '';
		let isDuplicate = false;

		const warningEl = this.contentEl.createDiv({
			cls: 'setting-item-description',
			text: '',
		});
		warningEl.setCssProps({
			color: 'var(--text-error)',
			display: 'none',
		});

		new Setting(this.contentEl)
			.addText((text) => {
				text.inputEl.setCssProps({ width: '100%' });
				text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
					void (async () => {
						if (e.key === 'Enter') {
							e.preventDefault();
							const trimmed = prompt.trim();
							if (!trimmed) return;
							if (isDuplicate) {
								new Notice('This prompt already exists');
								return;
							}
						await this.app.vault.process(this.promptsFile, (data) => {
							return data.endsWith('\n') ? data + trimmed + '\n' : data + '\n' + trimmed + '\n';
						});
						this.close();
						}
					})();
				});
				text.onChange((value) => {
					prompt = value;
					const trimmed = value.trim();
					isDuplicate = trimmed.length > 0 && this.existingTitles.includes(trimmed.toLowerCase());
					if (isDuplicate) {
						warningEl.setText('This prompt already exists');
						warningEl.setCssProps({ display: '' });
					} else {
						warningEl.setText('');
						warningEl.setCssProps({ display: 'none' });
					}
				});
			});
	}
}
