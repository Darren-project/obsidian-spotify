import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
const querystring = require('querystring');



// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	spotify_client_id: string;
	spotify_client_secret: string;
	spotify_access_token: object;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	spotify_client_id: '',
	spotify_client_secret: '',
	spotify_access_token: {},
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
        if(this.settings.spotify_access_token){
		   async function refreshspot(setting) {
			let json_spotify = setting.spotify_access_token
			let refresh_token = json_spotify.refresh_token
			let body = new URLSearchParams(
				{
					grant_type: 'refresh_token',
      				refresh_token: refresh_token,
      				client_id: setting.spotify_client_id
				  }
			).toString()
			let access_token = await requestUrl({
				"url": 'https://accounts.spotify.com/api/token',
				"method": "POST",
				"headers": {
					'content-type': 'application/x-www-form-urlencoded',
					'Authorization': 'Basic ' + (btoa(setting.spotify_client_id + ':' + setting.spotify_client_secret))
				  },
				"body": body,
				"throw": false
			})
			let data = await access_token.json
			console.log(pl)
			window.spotifysdk = SpotifyApi.withAccessToken(setting.spotify_client_id, data);
		}
		await refreshspot(this.settings)
			setInterval( async () => {
				await refreshspot(this.settings)
		}, "3600000")
			
			


		} else {
			window.spotifysdk = SpotifyApi.withUserAuthorization(this.settings.spotify_client_id, "obsidian://spotify/auth", ['user-follow-modify', 'user-follow-read', 'user-read-playback-position', 'user-top-read', 'user-read-recently-played', 'user-library-modify', 'user-library-read', 'user-read-email', 'user-read-private', 'ugc-image-upload', 'app-remote-control', 'streaming', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public', 'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing', 'user-modify-playback-state', 'user-read-recently-played']);
		}
		
		
		this.registerObsidianProtocolHandler("spotify/auth", async (e) => {
			let code = e.code
			let body = new URLSearchParams(
				{
					client_id: this.settings.spotify_client_id,
					grant_type: 'authorization_code',
					code,
					redirect_uri: "obsidian://spotify/auth",
				  }
			).toString()
			let access_token = await requestUrl({
				"url": 'https://accounts.spotify.com/api/token',
				"method": "POST",
				"headers": {
					'content-type': 'application/x-www-form-urlencoded',
					'Authorization': 'Basic ' + (Buffer.from(this.settings.spotify_client_id + ':' + this.settings.spotify_client_secret).toString('base64'))
				  },
				"body": body,
				"throw": false
			})
			let data = await access_token.json
			this.settings.spotify_access_token = data
			console.log(data)
			await this.saveSettings();
			window.spotifysdk = SpotifyApi.withAccessToken(this.settings.spotify_client_id, this.settings.spotify_access_token);
		})

		

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));


		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		
	}

	onunload() {
		window.spotifysdk = null
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
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		new Setting(containerEl)
			.setName('Spotify Client ID')
			.setDesc('Find it in your spotify dev')
			.addText(text => text
				.setPlaceholder('Enter your client ID')
				.setValue(this.plugin.settings.spotify_client_id)
				.onChange(async (value) => {
					this.plugin.settings.spotify_client_id = value;
					await this.plugin.saveSettings();
				}));

				new Setting(containerEl)
				.setName('Spotify Client secret')
				.setDesc('Find it in your spotify dev')
				.addText(text => text
					.setPlaceholder('Enter your client secret')
					.setValue(this.plugin.settings.spotify_client_secret)
					.onChange(async (value) => {
						this.plugin.settings.spotify_client_secret = value;
						await this.plugin.saveSettings();
					}));
				new Setting(containerEl)
				.addButton((btn) => btn
				.setButtonText("Spotify auth")
				.setCta()
				.onClick(async () => {
				    let scope = "user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private ugc-image-upload app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-modify-playback-state user-read-recently-played "
					let params =  {
						response_type: 'code',
						client_id: this.plugin.settings.spotify_client_id,
						scope,
						redirect_uri: "obsidian://spotify/auth",
						state: 'lanjiao'
					  }

					  let endpoint = new URL('https://accounts.spotify.com/authorize');
					  endpoint.search = new URLSearchParams(params);
					window.location.assign(endpoint.toString())
					

				}))
				new Setting(containerEl)
				.addButton((btn) => btn
				.setButtonText("Spotify logout")
				.setCta()
				.onClick(async () => {
					window.spotifysdk.logOut()
					

				}))
	}
}
