import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment
} from 'obsidian';


type TimestampChangeHook = (isTimestampChanged: boolean) => void;
interface LastModifiedTimestampInStatusBarSettings {
	timestampFormat: string;
	statusBarTitle: string;
	refreshIntervalSeconds: number;
}

const DEFAULT_SETTINGS: LastModifiedTimestampInStatusBarSettings = {
	timestampFormat: 'YYYY-MM-DD H:mm:ss',
	statusBarTitle: 'Last Modified: ',
	refreshIntervalSeconds: 0.1,
}

export default class LastModifiedTimestampInStatusBar extends Plugin {
	settings: LastModifiedTimestampInStatusBarSettings;
	timestamp: string | null;
	refreshInterval: number | null;
	
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

	setRefreshInterval() {
		if (this.refreshInterval !== null) {
			window.clearInterval(this.refreshInterval);
		}

		this.refreshInterval = window.setInterval(
			() => this.updateTimestamp((u) => {
				if (!u) return;
				this.updateDisplay();
			}),
			this.settings.refreshIntervalSeconds*1000,
		);

		this.registerInterval(this.refreshInterval);
	}

	async onload() {
		await this.loadSettings();

		this.updateTimestamp()
		this.updateDisplay()
		this.setRefreshInterval();

		this.app.workspace.on('active-leaf-change', () => {
			this.updateTimestamp();
			this.updateDisplay()
		});

		this.addSettingTab(new LastModifiedTimestampInStatusBarSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LastModifiedTimestampInStatusBarSettingTab extends PluginSettingTab {
	plugin: LastModifiedTimestampInStatusBar;

	constructor(app: App, plugin: LastModifiedTimestampInStatusBar) {
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

		new Setting(containerEl)
			.setName('Timestamp Update Interval (in seconds)')
			.setDesc('Note: Effectively, the minimum update interval seems to be 2s.')
			.addText(text => text
				.setPlaceholder('2')
				.setValue(this.plugin.settings.refreshIntervalSeconds.toString())
				.onChange(async (value) => {
					try {
						this.plugin.settings.refreshIntervalSeconds = +value;
						await this.plugin.saveSettings();
						this.plugin.setRefreshInterval();
					}
					finally {}
				})
			);

	}
}
