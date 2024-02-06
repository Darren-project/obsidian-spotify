import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginManifest, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk';


declare global {
    interface Window {
        spotifysdk:SpotifyApi;
    }


}

class SharedStuff {
    constructor(private stuff: {[key: string]: any;}) {
        this.stuff = {}
    }

    set(name: string, value: any) {
        this.stuff[name] = value;
    }

    get(name: string) {
        return this.stuff[name];
    }

    delete(name: string) {
        delete this.stuff[name];
    }

    has(name: string) {
        return this.stuff.hasOwnProperty(name);
    }

    keys() {
        return Object.keys(this.stuff);
    }

    values() {
        return Object.values(this.stuff);
    }

    entries() {
        return Object.entries(this.stuff);
    }
}

const sharedstuff = new SharedStuff({})

interface ObsidianSpotifySettings {
	spotify_client_id: string;
	spotify_client_secret: string;
	spotify_access_token: AccessToken;
}

const DEFAULT_SETTINGS: ObsidianSpotifySettings = {
	spotify_client_id: '',
	spotify_client_secret: '',
	spotify_access_token: {
		access_token: "",
		token_type: "",
		expires_in: 0,
		refresh_token: ""

	},
}

export default class ObsidianSpotify extends Plugin {
	settings: ObsidianSpotifySettings;
	manifest: PluginManifest;

	async onload() {
		await this.loadSettings();
		sharedstuff.set("manifest", this.manifest)
        if(this.settings.spotify_access_token){
		   async function refreshspot(setting: ObsidianSpotifySettings, manifest: PluginManifest) {
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
			
			console.log("[" + manifest.name + "] Spotify Token Refreshed")
			window.spotifysdk = SpotifyApi.withAccessToken(setting.spotify_client_id, data);
		}
		var TIMEOUT = 9000;
		var lastTime = (new Date()).getTime();

		window.addEventListener("offline", async () => {
			// Handle online event here
			console.log("[" + this.manifest.name + "] Now offline, refreshing Spotify Token after online and restting timer")
		  });

		window.addEventListener("online", async () => {
			console.log("[" + this.manifest.name + "] Refreshing Spotify Token after online and restting timer")
			await refreshspot(this.settings, this.manifest)
			clearInterval(sharedstuff.get("spotifyrefreshtimer"))
			setTimeout( async () => {
			let spotifyrefreshtimer = setInterval( async () => {
				await refreshspot(this.settings, this.manifest)
			}, 3600000)
			sharedstuff.set("spotifyrefreshtimer", spotifyrefreshtimer)
		}, TIMEOUT)

		})

		await refreshspot(this.settings, this.manifest)
		let spotifyrefreshtimer = setInterval( async () => {
				await refreshspot(this.settings, this.manifest)
		}, 3600000)
		sharedstuff.set("spotifyrefreshtimer", spotifyrefreshtimer)
		
			
			


		} else {
			window.spotifysdk = SpotifyApi.withUserAuthorization(this.settings.spotify_client_id, "obsidian://spotify/auth", ['user-follow-modify', 'user-follow-read', 'user-read-playback-position', 'user-top-read', 'user-read-recently-played', 'user-library-modify', 'user-library-read', 'user-read-email', 'user-read-private', 'ugc-image-upload', 'app-remote-control', 'streaming', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public', 'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing', 'user-modify-playback-state', 'user-read-recently-played']);
		}
		function spotify_auth_login(spotify_client_id: string, manifest: PluginManifest) {
					let state = Math.random().toString(36).substring(2,10);
				    let scope = "user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private ugc-image-upload app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-modify-playback-state user-read-recently-played"
					let params =  {
						response_type: 'code',
						client_id: spotify_client_id,
						scope,
						redirect_uri: "obsidian://spotify/auth",
						state: state
					  }
					
					let endpoint = new URL('https://accounts.spotify.com/authorize');
					endpoint.search = new URLSearchParams(params).toString();
					window.location.assign(endpoint)
					sharedstuff.set("spotifystate", state)
					console.log("[" + manifest.name + "] Opening login page")
		}
		
		function spotify_auth_logout(manifest: PluginManifest){
			window.spotifysdk.logOut()
			console.log("[" + manifest.name + "] Logged out")
		}

		sharedstuff.set("spotify_auth_login_function",spotify_auth_login)
		sharedstuff.set("spotify_auth_logout_function",spotify_auth_logout)

		this.addCommand({
			id: "spotify-auth-login",
			name: "Login",
			callback: () => {
				sharedstuff.get("spotify_auth_login_function")(this.settings.spotify_client_id, this.manifest)
			}
		})
		this.addCommand({
			id: "spotify-auth-logout",
			name: "Logout",
			callback: () => {
				sharedstuff.get("spotify_auth_logout_function")(this.manifest)
			}
		})


		this.registerObsidianProtocolHandler("spotify/auth", async (e) => {
			console.log("[" + this.manifest.name + "] Spotify Auth Code Received From Callback")
			let correctstate = sharedstuff.get("spotifystate")
			let state = e.state
			if(!(state == correctstate)){
				console.log("[" + this.manifest.name + "] State mismatch")
				return
			}
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
			await this.saveSettings();
			window.spotifysdk = SpotifyApi.withAccessToken(this.settings.spotify_client_id, this.settings.spotify_access_token);
			console.log("[" + this.manifest.name + "] Authed successfuly")
		})

		

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianSpotifySettingsTab(this.app, this));	
	}

	onunload() {
		function destroyObject(obj: any){

			obj = undefined;
		  
		}
		destroyObject(window.spotifysdk)
		clearInterval(sharedstuff.get("spotifyrefreshtimer"))
		window.removeEventListener("offline", () => {})
		window.removeEventListener("online", () => {})
		console.log("[" + this.manifest.name + "] Both the spotify sdk and auto token refresher have been cleaned up")

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}



class ObsidianSpotifySettingsTab extends PluginSettingTab {
	plugin: ObsidianSpotify;

	constructor(app: App, plugin: ObsidianSpotify) {
		super(app, plugin);
		this.plugin = plugin;	
	}

	display(): void {
		const {containerEl} = this;
		let manifest = sharedstuff.get("manifest")

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
					
					sharedstuff.get("spotify_auth_login_function")(this.plugin.settings.spotify_client_id, manifest)

				}))
				new Setting(containerEl)
				.addButton((btn) => btn
				.setButtonText("Spotify logout")
				.setCta()	
				.onClick(async () => {
					
					sharedstuff.get("spotify_auth_logout_function")(manifest)

				}))
	}
}
