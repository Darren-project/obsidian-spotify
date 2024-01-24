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
			window.spotifysdk = SpotifyApi.withAccessToken(this.settings.spotify_client_id, this.settings.spotify_access_token);
		} else {
			window.spotifysdk = SpotifyApi.withUserAuthorization(this.settings.spotify_client_id, "obsidian://spotify/auth", ['user-follow-modify', 'user-follow-read', 'user-read-playback-position', 'user-top-read', 'user-read-recently-played', 'user-library-modify', 'user-library-read', 'user-read-email', 'user-read-private', 'ugc-image-upload', 'app-remote-control', 'streaming', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public', 'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing', 'user-modify-playback-state', 'user-read-recently-played']);
		}
		
		
		this.registerObsidianProtocolHandler("spotify/auth", async (e) => {
			let code = e.code
			let body = querystring.stringify(
				{
					client_id: this.settings.spotify_client_id,
					grant_type: 'authorization_code',
					code,
					redirect_uri: "obsidian://spotify/auth",
					code_verifier: window.codeVerifier,
				  }
			)
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
			await this.saveSettings();
			window.spotifysdk = SpotifyApi.withAccessToken(this.settings.spotify_client_id, this.settings.spotify_access_token);
		})

		

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

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
					const generateRandomString = (length) => {
						const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
						const values = crypto.getRandomValues(new Uint8Array(length));
						return values.reduce((acc, x) => acc + possible[x % possible.length], "");
					  }
					  
					window.codeVerifier  = generateRandomString(64);

					const sha256 = async (plain) => {
						const encoder = new TextEncoder()
						const data = encoder.encode(plain)
						return window.crypto.subtle.digest('SHA-256', data)
					  }

					  const base64encode = (input) => {
						return btoa(String.fromCharCode(...new Uint8Array(input)))
						  .replace(/=/g, '')
						  .replace(/\+/g, '-')
						  .replace(/\//g, '_');
					  }

					
					  const hashed = await sha256(codeVerifier)
					  window.codeChallenge = base64encode(hashed);

				    let scope = "user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private ugc-image-upload app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-modify-playback-state user-read-recently-played "
					let params =  {
						response_type: 'code',
						client_id: this.plugin.settings.spotify_client_id,
						scope,
						code_challenge_method: 'S256',
						code_challenge: window.codeChallenge,
						redirect_uri: "obsidian://spotify/auth",
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
