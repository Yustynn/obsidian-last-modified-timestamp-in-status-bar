import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment
} from 'obsidian';


type LastModifiedimestampChangeHook = (isTimestampChanged: boolean) => void;
interface LastModifiedTimestampInStatusBarSettings {
	createdPrepend: string;
	createdTimestampFormat: string;
	lastModifiedPrepend: string;
	lastModifiedTimestampFormat: string;
	refreshIntervalSeconds: number;
}

const DEFAULT_SETTINGS: LastModifiedTimestampInStatusBarSettings = {
	lastModifiedTimestampFormat: 'YYYY-MM-DD H:mm:ss',
	createdTimestampFormat: 'YYYY-MM-DD H:mm:ss',
	lastModifiedPrepend: 'Last Modified: ',
	createdPrepend: 'Created: ',
	refreshIntervalSeconds: 2,
}

export default class LastModifiedTimestampInStatusBar extends Plugin {
	settings: LastModifiedTimestampInStatusBarSettings;

	createdTimestamp: string | null;
	lastModifiedTimestamp: string | null;
	lastModifiedRefreshInterval: number | null;
	
	lastModifiedStatusBarItemEl = this.addStatusBarItem();
	createdStatusBarItemEl = this.addStatusBarItem();

	updateLastModifiedDisplay(): void {
		if (this.lastModifiedTimestamp) {
			this.lastModifiedStatusBarItemEl.setText(this.settings.lastModifiedPrepend + this.lastModifiedTimestamp);
		}
	}

	updateCreatedDisplay(): void {
		if (this.createdTimestamp) {
			this.createdStatusBarItemEl.setText(this.settings.createdPrepend + this.createdTimestamp);
		}
	}

	updateCreatedTimestamp(): void {
		const file: TFile | null = this.app.workspace.getActiveFile()
		if (file) {
			const timestamp = moment(file.stat.ctime)
				.format(this.settings.createdTimestampFormat);

			this.createdTimestamp = timestamp;
		}
	}


	updateLastModifiedTimestamp(hook: LastModifiedimestampChangeHook | null = null): void {
		const file: TFile | null = this.app.workspace.getActiveFile()
		if (file) {
			const timestamp = moment(file.stat.mtime)
				.format(this.settings.lastModifiedTimestampFormat);

			const isTimestampChanged = timestamp != this.lastModifiedTimestamp;
			this.lastModifiedTimestamp = timestamp;

			if (hook) hook(isTimestampChanged)
		}
	}

	setLastModifiedRefreshInterval() {
		if (this.lastModifiedRefreshInterval !== null) {
			window.clearInterval(this.lastModifiedRefreshInterval);
		}

		this.lastModifiedRefreshInterval = window.setInterval(
			() => this.updateLastModifiedTimestamp((u) => {
				if (!u) return;
				this.updateLastModifiedDisplay();
			}),
			this.settings.refreshIntervalSeconds*1000,
		);

		this.registerInterval(this.lastModifiedRefreshInterval);
	}

	async onload() {
		await this.loadSettings();

		// last modified timestamp
		this.setLastModifiedRefreshInterval();
		this.updateLastModifiedTimestamp()
		this.updateLastModifiedDisplay()

		// created timestamp
		this.updateCreatedTimestamp();
		this.updateCreatedDisplay();

		this.app.workspace.on('active-leaf-change', () => {
			// last modified timestamp
			this.updateLastModifiedTimestamp();
			this.updateLastModifiedDisplay()

			// created timestamp
			this.updateCreatedTimestamp();
			this.updateCreatedDisplay();
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

		containerEl.createEl('h3', {text: 'Last Modified Timestamp'});

		new Setting(containerEl)
			.setName('Timestamp Format')
			.setDesc('Compatible with Moment.js formats, e.g. YYYY-MM-DD H:mm:ss')
			.addText(text => text
				.setPlaceholder('Enter format')
				.setValue(this.plugin.settings.lastModifiedTimestampFormat)
				.onChange(async (value) => {
					this.plugin.settings.lastModifiedTimestampFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateLastModifiedTimestamp();
					this.plugin.updateLastModifiedDisplay();
				})
			)

		new Setting(containerEl)
			.setName('Title in Status Bar')
			.addText(text => text
				.setPlaceholder('Last Modified: ')
				.setValue(this.plugin.settings.lastModifiedPrepend)
				.onChange(async (value) => {
					this.plugin.settings.lastModifiedPrepend = value;
					await this.plugin.saveSettings();
					this.plugin.updateLastModifiedTimestamp();
					this.plugin.updateLastModifiedDisplay();
				})
			);


		new Setting(containerEl)
			.setName('Timestamp Update Interval (in seconds)')
			.setDesc('Note: Effectively, the minimum update interval seems to be 2s.')
			.addText(text => text
				.setPlaceholder('2.0')
				.setValue(this.plugin.settings.refreshIntervalSeconds.toString())
				.onChange(async (value) => {
					try {
						this.plugin.settings.refreshIntervalSeconds = +value;
						await this.plugin.saveSettings();
						this.plugin.setLastModifiedRefreshInterval();
					}
					finally {}
				})
			);

		containerEl.createEl('h3', {text: 'Created Timestamp'});

		new Setting(containerEl)
			.setName('Timestamp Format')
			.setDesc('Compatible with Moment.js formats, e.g. YYYY-MM-DD H:mm:ss')
			.addText(text => text
				.setPlaceholder('Enter format')
				.setValue(this.plugin.settings.createdTimestampFormat)
				.onChange(async (value) => {
					this.plugin.settings.createdTimestampFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateCreatedTimestamp();
					this.plugin.updateCreatedDisplay();
				})
			)

		new Setting(containerEl)
			.setName('Title in Status Bar')
			.addText(text => text
				.setPlaceholder('Created: ')
				.setValue(this.plugin.settings.createdPrepend)
				.onChange(async (value) => {
					this.plugin.settings.createdPrepend = value;
					await this.plugin.saveSettings();
					this.plugin.updateCreatedTimestamp();
					this.plugin.updateCreatedDisplay();
				})
			);

	}
}
