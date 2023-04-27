import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment
} from 'obsidian';

type TimestampChangeHook = (isTimestampChanged: boolean) => void;

interface DynamicLastModifiedTimestampSettings {
	timestampFormat: string;
	statusBarTitle: string;
}

const DEFAULT_SETTINGS: DynamicLastModifiedTimestampSettings = {
	timestampFormat: 'YYYY-MM-DD H:mm:ss',
	statusBarTitle: 'Last Modified: ',
}

export default class DynamicLastModifiedTimestamp extends Plugin {
	settings: DynamicLastModifiedTimestampSettings;
	timestamp: string | null;
	statusBarItemEl = this.addStatusBarItem();

	updateDisplay(): void {
		if (this.timestamp) {
			this.statusBarItemEl.setText(this.settings.statusBarTitle + this.timestamp);
		}
	}

	updateTimestamp(hook: TimestampChangeHook | null = null): void {
		const file: TFile | null = this.app.workspace.getActiveFile()
		if (file) {
			const timestamp = moment(file.stat.mtime)
				.format(this.settings.timestampFormat);

			const isTimestampChanged = timestamp != this.timestamp;
			this.timestamp = timestamp;

			if (hook) hook(isTimestampChanged)
		}
	}

	async onload() {
		await this.loadSettings();

		this.updateTimestamp()
		this.updateDisplay()

		this.registerInterval(window.setInterval(
			() => this.updateTimestamp((u) => {
				if (!u) return;
				this.updateDisplay();
			}),
			2000,
		))

		this.app.workspace.on('active-leaf-change', () => {
			this.updateTimestamp();
			this.updateDisplay()
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: DynamicLastModifiedTimestamp;

	constructor(app: App, plugin: DynamicLastModifiedTimestamp) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings'});

		new Setting(containerEl)
			.setName('Timestamp Format')
			.setDesc('Compatible with Moment.js formats, e.g. YYYY-MM-DD')
			.addText(text => text
				.setPlaceholder('Enter format')
				.setValue(this.plugin.settings.timestampFormat)
				.onChange(async (value) => {
					this.plugin.settings.timestampFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateTimestamp();
					this.plugin.updateDisplay();
				})
			)

		new Setting(containerEl)
			.setName('Title in Status Bar')
			.addText(text => text
				.setPlaceholder('Last Modified:')
				.setValue(this.plugin.settings.statusBarTitle)
				.onChange(async (value) => {
					this.plugin.settings.statusBarTitle = value;
					await this.plugin.saveSettings();
					this.plugin.updateTimestamp();
					this.plugin.updateDisplay();
				})
			);
			;
	}
}
