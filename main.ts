import { Platform, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginManifest, PluginSettingTab, Setting, requestUrl, SettingTab } from 'obsidian';
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk';
import { RefreshClass } from './RefreshClass';

/**
 * Declares the global interface for the `window` object.
 */
declare global {
    interface Window {
        spotifysdk:SpotifyApi;
    }


}

/**
 * Represents a collection of shared data.
 */
export class SharedStuff {
	/**
	 * Creates a new instance of the SharedStuff class.
	 * @param stuff - The initial data to be stored in the SharedStuff instance.
	 */
	constructor(private stuff: {[key: string]: any;}) {
		this.stuff = stuff
	}

	/**
	 * Sets a value in the shared data collection.
	 * @param name - The name of the value to set.
	 * @param value - The value to set.
	 */
	set(name: string, value: any) {
		this.stuff[name] = value;
	}

	/**
	 * Retrieves a value from the shared data collection.
	 * @param name - The name of the value to retrieve.
	 * @returns The value associated with the specified name, or undefined if the name does not exist.
	 */
	get(name: string) {
		return this.stuff[name];
	}

	/**
	 * Deletes a value from the shared data collection.
	 * @param name - The name of the value to delete.
	 */
	delete(name: string) {
		delete this.stuff[name];
	}

	/**
	 * Checks if a value exists in the shared data collection.
	 * @param name - The name of the value to check.
	 * @returns True if the value exists, false otherwise.
	 */
	has(name: string) {
		return this.stuff.hasOwnProperty(name);
	}

	/**
	 * Retrieves an array of all the keys in the shared data collection.
	 * @returns An array of keys.
	 */
	keys() {
		return Object.keys(this.stuff);
	}

	/**
	 * Retrieves an array of all the values in the shared data collection.
	 * @returns An array of values.
	 */
	values() {
		return Object.values(this.stuff);
	}

	/**
	 * Retrieves an array of all the key-value pairs in the shared data collection.
	 * @returns An array of key-value pairs.
	 */
	entries() {
		return Object.entries(this.stuff);
	}
}

/**
 * Represents shared stuff.
 */
const sharedstuff = new SharedStuff({})

/**
 * Represents the settings for the Obsidian Spotify integration.
 */
export interface ObsidianSpotifySettings {
	/**
	 * The client ID for the Spotify API.
	 */
	spotify_client_id: string;

	/**
	 * The client secret for the Spotify API.
	 */
	spotify_client_secret: string;

	/**
	 * The access token for authenticating requests to the Spotify API.
	 */
	spotify_access_token: AccessToken;
}

/**
 * Default settings for the Obsidian Spotify integration.
 */
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

/**
 * Represents the ObsidianSpotify plugin.
 */
export default class ObsidianSpotify extends Plugin {
	settings: ObsidianSpotifySettings;
	manifest: PluginManifest;
	refreshtoken: any;

	/**
	 * Called when the plugin is loaded.
	 */
	async onload() {
        if(Platform.isMobileApp) {
		  sharedstuff.set("fakenetevents", async () => {
		   const checkConnection = async () => {
           try {
            const response = await requestUrl({
                 'url': 'https://accounts.spotify.com'
            });

               return response.status >= 200 && response.status < 300;
            } catch (error) {
               return false;
            }
           };
		   let online = await checkConnection()
		   if(online == sharedstuff.get("netstatus")) {
			   return
		   }
		   sharedstuff.set("netstatus", online)
		   if(online) {
			   let event = new CustomEvent("online")
               window.dispatchEvent(event)
		   } else {
			   let event = new CustomEvent("offline")
               window.dispatchEvent(event)
		   }
		  })
          let fakeneteventstimer = setInterval(sharedstuff.get("fakenetevents"),2000)
		  sharedstuff.set("fakeneteventstimer", fakeneteventstimer)
		}
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianSpotifySettingsTab(this.app, this));
		await this.loadSettings();
		sharedstuff.set("manifest", this.manifest);

		/**
		 * Refreshes the Spotify access token.
		 * @param setting - The ObsidianSpotifySettings object.
		 * @param manifest - The PluginManifest object.
		 */
		async function refreshspot(setting: ObsidianSpotifySettings, manifest: PluginManifest) {
			let json_spotify = setting.spotify_access_token;
			let refresh_token = json_spotify.refresh_token;
			let body = new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refresh_token,
				client_id: setting.spotify_client_id
			}).toString();
			try {
			let access_token = await requestUrl({
				"url": 'https://accounts.spotify.com/api/token',
				"method": "POST",
				"headers": {
					'content-type': 'application/x-www-form-urlencoded',
					'Authorization': 'Basic ' + (btoa(setting.spotify_client_id + ':' + setting.spotify_client_secret))
				},
				"body": body,
				"throw": false
			});
			let data = await access_token.json;

			console.log("[" + manifest.name + "] Spotify Token Refreshed");
			window.spotifysdk = SpotifyApi.withAccessToken(setting.spotify_client_id, data);
			window.spotifysdk['authenticationStrategy'].refreshTokenAction = async () => { return; };
					} catch {
				console.log("[" + manifest.name + "] Waiting for internet to update token")
				
			}
		}

		sharedstuff.set("refreshspot", refreshspot);

		

		if (this.settings.spotify_access_token.refresh_token) {
			RefreshClass.refreshInit({ sharedstuff, refreshspot, settings: this.settings, manifest: this.manifest });
		} else {
			(window.spotifysdk as any) = null;
		}

		/**
		 * Logs in the user with Spotify authentication.
		 * @param spotify_client_id - The Spotify client ID.
		 * @param manifest - The PluginManifest object.
		 */
		function spotify_auth_login(spotify_client_id: string, manifest: PluginManifest) {
			const generateRandomString = (length: number) => {
				const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
				const values = crypto.getRandomValues(new Uint8Array(length));
				return values.reduce((acc, x) => acc + possible[x % possible.length], "");
			}

			let state = generateRandomString(64);
			let scope = "user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read user-read-email user-read-private ugc-image-upload app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-modify-playback-state user-read-recently-played";
			let params = {
				response_type: 'code',
				client_id: spotify_client_id,
				scope,
				redirect_uri: "obsidian://spotify/auth",
				state: state
			};

			let endpoint = new URL('https://accounts.spotify.com/authorize');
			endpoint.search = new URLSearchParams(params).toString();
			window.location.assign(endpoint);
			sharedstuff.set("spotifystate", state);
			console.log("[" + manifest.name + "] Opening login page");
		}

		/**
		 * Logs out the user from Spotify authentication.
		 * @param manifest - The PluginManifest object.
		 * @param this2 - The ObsidianSpotify object.
		 */
		async function spotify_auth_logout(manifest: PluginManifest, this2: ObsidianSpotify) {
			try {
			window.spotifysdk.logOut();
			console.log(this2);
			this2.settings.spotify_access_token = {
				access_token: "",
				token_type: "",
				expires_in: 0,
				refresh_token: ""
			};
			await this2.saveSettings();
			RefreshClass.logoutOrunload({ sharedstuff, settings: this2.settings, manifest: manifest });
			console.log("[" + manifest.name + "] Logged out");
			try {
				sharedstuff.get("refreshname")(this2)
			} catch {}
		} catch {}
		}

		sharedstuff.set("spotify_auth_login_function", spotify_auth_login);
		sharedstuff.set("spotify_auth_logout_function", spotify_auth_logout);

		this.addCommand({
			id: "spotify-auth-login",
			name: "Login",
			callback: () => {
				sharedstuff.get("spotify_auth_login_function")(this.settings.spotify_client_id, this.manifest);
			}
		});
		this.addCommand({
			id: "spotify-auth-logout",
			name: "Logout",
			callback: async () => {
				let this2 = this;
				await sharedstuff.get("spotify_auth_logout_function")(this.manifest, this2);
			}
		});

		async function refreshname(settings: ObsidianSpotifySettings) {
			try {
				if(settings.spotify_access_token.access_token) {
					
						let data = await window.spotifysdk.currentUser.profile()
						sharedstuff.get("usernametext").setText(data.display_name + " (" + data.id + ")")
								} else {
					sharedstuff.get("usernametext").setText("Not logged in")
				}
			} catch(e) {
				sharedstuff.get("usernametext").setText("Error getting username")
			}
		}

		sharedstuff.set("refreshname", refreshname);

		this.registerObsidianProtocolHandler("spotify/auth", async (e) => {
			console.log("[" + this.manifest.name + "] Spotify Auth Code Received From Callback");
			let correctstate = sharedstuff.get("spotifystate");
			let state = e.state;
			if (!(state == correctstate)) {
				console.log("[" + this.manifest.name + "] State mismatch");
				return;
			}
			let code = e.code;
			let body = new URLSearchParams({
				client_id: this.settings.spotify_client_id,
				grant_type: 'authorization_code',
				code,
				redirect_uri: "obsidian://spotify/auth",
			}).toString();
			let access_token = await requestUrl({
				"url": 'https://accounts.spotify.com/api/token',
				"method": "POST",
				"headers": {
					'content-type': 'application/x-www-form-urlencoded',
					'Authorization': 'Basic ' + (btoa(this.settings.spotify_client_id + ':' + this.settings.spotify_client_secret))
				},
				"body": body,
				"throw": false
			});
			let data = await access_token.json;
			this.settings.spotify_access_token = data;
			await this.saveSettings();
			window.spotifysdk = SpotifyApi.withAccessToken(this.settings.spotify_client_id, this.settings.spotify_access_token);
			window.spotifysdk['authenticationStrategy'].refreshTokenAction = async () => { return; };
			console.log("[" + this.manifest.name + "] Authed successfuly");
			RefreshClass.refreshInit({ sharedstuff, refreshspot, settings: this.settings, manifest: this.manifest });
			try {
				sharedstuff.get("refreshname")(this.settings)
			} catch {}
		});
	}

	/**
	 * Called when the plugin is unloaded.
	 */
	onunload() {
		RefreshClass.logoutOrunload({ sharedstuff, settings: this.settings, manifest: this.manifest });
		if(sharedstuff.get("fakeneteventstimer")) {
			clearInterval(sharedstuff.get("fakeneteventstimer"));
		}
	}

	/**
	 * Loads the plugin settings.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Saves the plugin settings.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}



class ObsidianSpotifySettingsTab extends PluginSettingTab {
	plugin: ObsidianSpotify;
	static display: any;

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
			.setDesc('Find it in your spotify developer dashboard')
			.addText(text => text
				.setPlaceholder('Enter your client ID')
				.setValue(this.plugin.settings.spotify_client_id)
				.onChange(async (value) => {
					this.plugin.settings.spotify_client_id = value;
					await this.plugin.saveSettings();
				}));

				new Setting(containerEl)
				.setName('Spotify Client secret')
				.setDesc('Find it in your spotify developer dashboard')
				.addText(text => text
					.setPlaceholder('Enter your client secret')
					.setValue(this.plugin.settings.spotify_client_secret)
					.onChange(async (value) => {
						this.plugin.settings.spotify_client_secret = value;
						await this.plugin.saveSettings();
					}));
				new Setting(containerEl)
				.setName('Spotify Authentification')
				.setDesc('Login or logout from spotify')
				.addButton((btn) => btn
				.setButtonText("Login")
				.setCta()
				.onClick(async () => {
					
					sharedstuff.get("spotify_auth_login_function")(this.plugin.settings.spotify_client_id, manifest)

				}))
				.addButton((btn) => btn
				.setButtonText("Logout")
				.setCta()	
				.onClick(async () => {
					
					sharedstuff.get("spotify_auth_logout_function")(manifest, this.plugin)

				}))

				const usernamecontainer = new Setting(containerEl)
				.setName('Logged in as')
				.setDesc('The current logged in user')

				const usernamewrapcontainer = usernamecontainer.controlEl.createDiv("spotify-api-refresh-token");
				const usernametext = usernamewrapcontainer.createSpan()

				sharedstuff.set("usernametext", usernametext)
				sharedstuff.get("refreshname")(this.plugin.settings)
				

				
	}
}
