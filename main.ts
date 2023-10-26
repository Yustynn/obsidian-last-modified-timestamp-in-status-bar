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
	createdEnabled: boolean;
	createdPrepend: string;
	createdTimestampFormat: string;
	lastModifiedEnabled: boolean;
	lastModifiedPrepend: string;
	lastModifiedTimestampFormat: string;
	refreshIntervalSeconds: number;
}

const DEFAULT_SETTINGS: LastModifiedTimestampInStatusBarSettings = {
	createdPrepend: 'Created: ',
	createdTimestampFormat: 'YYYY-MM-DD H:mm:ss',
	createdEnabled: true,
	lastModifiedEnabled: true,
	lastModifiedPrepend: 'Last Modified: ',
	lastModifiedTimestampFormat: 'YYYY-MM-DD H:mm:ss',
	refreshIntervalSeconds: 2,
}

export default class LastModifiedTimestampInStatusBar extends Plugin {
	settings: LastModifiedTimestampInStatusBarSettings;

	createdTimestamp: string | null;
	lastModifiedTimestamp: string | null;
	lastModifiedRefreshInterval: number | null;
	
	lastModifiedStatusBarItemEl: HTMLElement | null = this.addStatusBarItem();
	createdStatusBarItemEl : HTMLElement | null = this.addStatusBarItem();

	cycleDisplayedStatus(): void {
		if (this.settings.lastModifiedEnabled && this.settings.createdEnabled) {
			this.settings.lastModifiedEnabled = true;
			this.settings.createdEnabled = false;
		}
		else if (this.settings.lastModifiedEnabled && !this.settings.createdEnabled) {
			this.settings.lastModifiedEnabled = false;
			this.settings.createdEnabled = true;
		}
		else if (!this.settings.lastModifiedEnabled && this.settings.createdEnabled) {
			this.settings.lastModifiedEnabled = true;
			this.settings.createdEnabled = true;
		}
		else {
			this.settings.lastModifiedEnabled = true;
			this.settings.createdEnabled = false;
		}

		this.updateLastModified();
		this.updateCreated();
		this.saveSettings();
	}
	updateLastModifiedDisplay(): void {
		if (this.lastModifiedTimestamp && this.settings.lastModifiedEnabled) {
			if (this.lastModifiedStatusBarItemEl === null) {
				this.lastModifiedStatusBarItemEl = this.addStatusBarItem();
			}
			this.lastModifiedStatusBarItemEl.setText(this.settings.lastModifiedPrepend + this.lastModifiedTimestamp);
			this.lastModifiedStatusBarItemEl.onclick = () => {
				this.cycleDisplayedStatus();
			}
			if(this.settings.lastModifiedEnabled)
				this.lastModifiedStatusBarItemEl.show()
		}
		if (this.lastModifiedStatusBarItemEl !== null && !this.settings.lastModifiedEnabled) {
			this.lastModifiedStatusBarItemEl.hide()
		}
	}

	updateCreatedDisplay(): void {
		if (this.createdTimestamp && this.settings.createdEnabled) {
			if (this.createdStatusBarItemEl === null) {
				this.createdStatusBarItemEl = this.addStatusBarItem();
			}
			this.createdStatusBarItemEl.setText(this.settings.createdPrepend + this.createdTimestamp);
			this.createdStatusBarItemEl.onclick = () => {
				this.cycleDisplayedStatus();
			}
			if(this.settings.createdEnabled)
				this.createdStatusBarItemEl.show()
		}
		if(this.createdStatusBarItemEl !== null && !this.settings.createdEnabled){
			this.createdStatusBarItemEl.hide()
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

	updateCreated(): void {
		this.updateCreatedTimestamp();
		this.updateCreatedDisplay();
	}

	updateLastModified(): void {
		this.updateLastModifiedTimestamp();
		this.updateLastModifiedDisplay();
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

	removeLastModifiedRefreshInterval() {
		if (this.lastModifiedRefreshInterval !== null) {
			window.clearInterval(this.lastModifiedRefreshInterval);
		}
	}

	updateLastModifiedRefreshInterval() {
		this.removeLastModifiedRefreshInterval();
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
		if (this.settings.lastModifiedEnabled) {
			this.updateLastModifiedRefreshInterval();
			this.updateLastModified();
		}

		// created timestamp
		if (this.settings.createdEnabled) {
			this.updateCreated();
		}

		this.app.workspace.on('active-leaf-change', () => {
			// last modified timestamp
			if (this.settings.lastModifiedEnabled) {
				this.updateLastModifiedTimestamp();
				this.updateLastModifiedDisplay()
			}

			// created timestamp
			if (this.settings.createdEnabled) {
				this.updateCreatedTimestamp();
				this.updateCreatedDisplay();
			}
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
			.setName('Enabled')
			.setDesc('Turn the display on or off in your status bar.')
			.addToggle(bool => bool
				.setValue(this.plugin.settings.lastModifiedEnabled)
				.onChange(async (value) => {
					this.plugin.settings.lastModifiedEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.updateLastModified();

					if (!value) {
						this.plugin.removeLastModifiedRefreshInterval();
					}
					else {
						this.plugin.updateLastModifiedRefreshInterval();
					}
				})
			)

		new Setting(containerEl)
			.setName('Timestamp Format')
			.setDesc('Compatible with Moment.js formats, e.g. YYYY-MM-DD H:mm:ss')
			.addText(text => text
				.setPlaceholder('Enter format')
				.setValue(this.plugin.settings.lastModifiedTimestampFormat)
				.onChange(async (value) => {
					this.plugin.settings.lastModifiedTimestampFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateLastModified();
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
					this.plugin.updateLastModified();
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
						if (this.plugin.settings.lastModifiedEnabled) {
							this.plugin.updateLastModifiedRefreshInterval();
						}
					}
					finally {}
				})
			);

		containerEl.createEl('h3', {text: 'Created Timestamp'});

		new Setting(containerEl)
			.setName('Enabled')
			.setDesc('Turn the display on or off in your status bar.')
			.addToggle(bool => bool
				.setValue(this.plugin.settings.createdEnabled)
				.onChange(async (value) => {
					this.plugin.settings.createdEnabled = value;
					await this.plugin.saveSettings();
					this.plugin.updateCreated();
				})
			)


		new Setting(containerEl)
			.setName('Timestamp Format')
			.setDesc('Compatible with Moment.js formats, e.g. YYYY-MM-DD H:mm:ss')
			.addText(text => text
				.setPlaceholder('Enter format')
				.setValue(this.plugin.settings.createdTimestampFormat)
				.onChange(async (value) => {
					this.plugin.settings.createdTimestampFormat = value;
					await this.plugin.saveSettings();
					this.plugin.updateCreated();
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
					this.plugin.updateCreated();
				})
			);

	}
}
