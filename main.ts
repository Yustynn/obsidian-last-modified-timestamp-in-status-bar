import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, moment } from 'obsidian';

// Remember to rename these classes and interfaces!

type TimestampChangeHook = (isTimestampChanged: boolean) => void;

interface MyPluginSettings {
	timestampFormat: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	timestampFormat: 'YYYY-MM-DD H:mm:ss'
}

export default class DynamicLastModifiedTimestamp extends Plugin {
	settings: MyPluginSettings;
	timestamp: string | null;
	statusBarItemEl = this.addStatusBarItem();


	myFunc() {

	}

	updateDisplay(): void {
		if (this.timestamp) {
			this.statusBarItemEl.setText(`Last Modified: ${this.timestamp}`);
		}
	}

	updateTimestamp(hook: TimestampChangeHook | null = null): void {
		const file: TFile | null = this.app.workspace.getActiveFile()
		if (file) {
			const timestamp = moment(file.stat.mtime).format(this.settings.timestampFormat);

			const isTimestampChanged = timestamp != this.timestamp;
			this.timestamp = timestamp;

			if (hook) hook(isTimestampChanged)
		}
	}

	async onload() {
		console.log('Loaded.')

		await this.loadSettings();

		this.updateTimestamp()
		this.updateDisplay()

		this.registerInterval(window.setInterval(
			() => this.updateTimestamp((u) => {
				if (!u) return;
				this.updateTimestamp();
			}),
			2000,
		))

		this.app.workspace.on('active-leaf-change', () => {
			this.updateTimestamp();
			this.updateDisplay()
		});

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah! Lol');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: DynamicLastModifiedTimestamp;

	constructor(app: App, plugin: DynamicLastModifiedTimestamp) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Timestamp Format')
			.setDesc('E.g. YYYY-MM-DD')
			.addText(text => text
				.setPlaceholder('Enter format')
				.setValue(this.plugin.settings.timestampFormat)
				.onChange(async (value) => {
					this.plugin.settings.timestampFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateTimestamp();
					this.plugin.updateDisplay();
				}));
	}
}
