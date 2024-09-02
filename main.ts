import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment
} from 'obsidian';


interface LastModifiedTimestampInStatusBarSettings {
	createdEnabled: boolean;
	createdPrepend: string;
	createdTimestampFormat: string;
	lastModifiedEnabled: boolean;
	lastModifiedPrepend: string;
	lastModifiedTimestampFormat: string;
	cycleOnClickEnabled: boolean;
}

const DEFAULT_SETTINGS: LastModifiedTimestampInStatusBarSettings = {
	createdPrepend: 'Created: ',
	createdTimestampFormat: 'YYYY-MM-DD H:mm:ss',
	createdEnabled: true,
	lastModifiedEnabled: true,
	lastModifiedPrepend: 'Last Modified: ',
	lastModifiedTimestampFormat: 'YYYY-MM-DD H:mm:ss',
	cycleOnClickEnabled: false,
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
				if (this.settings.cycleOnClickEnabled)
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
				if (this.settings.cycleOnClickEnabled)
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

	updateLastModifiedTimestamp(): void {
		const file: TFile | null = this.app.workspace.getActiveFile()
		if (file) {
			this.lastModifiedTimestamp = moment(file.stat.mtime)
				.format(this.settings.lastModifiedTimestampFormat);
		}
	}

	async onload() {
		await this.loadSettings();
		this.registerEvent(this.app.vault.on("modify", file => {
			if (this.settings.lastModifiedEnabled && file === this.app.workspace.getActiveFile()) {
				this.updateLastModified();
			}
		}));

		// last modified timestamp
		if (this.settings.lastModifiedEnabled) {
			this.updateLastModified();
		}

		// created timestamp
		if (this.settings.createdEnabled) {
			this.updateCreated();
		}

		this.app.workspace.on('active-leaf-change', () => {
			// last modified timestamp
			if (this.settings.lastModifiedEnabled) {
				this.updateLastModified()
			}

			// created timestamp
			if (this.settings.createdEnabled) {
				this.updateCreated();
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
				
		containerEl.createEl('h3', {text: 'Cycle Displayed Timestamp On Click'});

		new Setting(containerEl)
			.setName('Enabled')
			.setDesc('Enable cycling between the last modified and created timestamp on click in status bar.')
			.addToggle(bool => bool
				.setValue(this.plugin.settings.cycleOnClickEnabled)
				.onChange(async (value) => {
					this.plugin.settings.cycleOnClickEnabled = value;
					await this.plugin.saveSettings();
				})
			)
	}
}
