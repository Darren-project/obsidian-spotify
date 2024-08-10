import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginManifest, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import { SharedStuff, ObsidianSpotifySettings } from './main';

/**
 * Class responsible for refreshing the Spotify token and managing event listeners.
 */
export class RefreshClass {
	/**
	 * Refreshes the Spotify token and sets up event listeners for online and offline events.
	 * @param args - The arguments required for refreshing the token and managing event listeners.
	 * @param args.sharedstuff - An object for storing shared data.
	 * @param args.refreshspot - A function for refreshing the Spotify token.
	 * @param args.settings - The settings for the Obsidian Spotify plugin.
	 * @param args.manifest - The plugin manifest.
	 */
	static async refreshInit(args: {
		sharedstuff: SharedStuff;
		refreshspot: Function;
		settings: ObsidianSpotifySettings;
		manifest: PluginManifest;
	}) {
		const sharedstuff = args.sharedstuff;
		const refreshspot = args.refreshspot;
		const settings = args.settings;
		const manifest = args.manifest;
		var TIMEOUT = 3000;

		sharedstuff.set("offlinerefresh", async () => {
			console.log("[" + manifest.name + "] Now offline, refreshing Spotify Token after online and resetting timer");
			sharedstuff.get("refreshname")(this.plugin)
		});

		window.addEventListener("offline", sharedstuff.get("offlinerefresh"));
		window.addEventListener("offline-custom", sharedstuff.get("offlinerefresh"));

		sharedstuff.set("onlinerefresh", async () => {
			console.log("[" + manifest.name + "] Refreshing Spotify Token after online and resetting timer");
			await refreshspot(settings, manifest);
			sharedstuff.get("refreshname")(this.plugin)
			clearInterval(sharedstuff.get("spotifyrefreshtimer"));
			setTimeout(async () => {
				let spotifyrefreshtimer = setInterval(async () => {
					await refreshspot(settings, manifest);
				}, 3600000);
				sharedstuff.set("spotifyrefreshtimer", spotifyrefreshtimer);
			}, TIMEOUT);
		});

		window.addEventListener("online", sharedstuff.get("onlinerefresh"));
		window.addEventListener("online-custom", sharedstuff.get("onlinerefresh"));

		
		let spotifyrefreshtimer = setInterval(async () => {
			await refreshspot(settings, manifest);
		}, 3600000);
		sharedstuff.set("spotifyrefreshtimer", spotifyrefreshtimer);
		await refreshspot(settings, manifest);
	}

	/**
	 * Cleans up the Spotify SDK and auto token refresher.
	 * @param args - The arguments required for cleaning up.
	 * @param args.sharedstuff - An object for storing shared data.
	 * @param args.settings - The settings for the Obsidian Spotify plugin.
	 * @param args.manifest - The plugin manifest.
	 */
	static async logoutOrunload(args: {
		sharedstuff: SharedStuff;
		settings: ObsidianSpotifySettings;
		manifest: PluginManifest;
	}) {
		const sharedstuff = args.sharedstuff;
		const settings = args.settings;
		const manifest = args.manifest;
		(window.spotifysdk as any) = null;
		clearInterval(sharedstuff.get("spotifyrefreshtimer"));
		window.removeEventListener("offline", sharedstuff.get("offlinerefresh"));
		window.removeEventListener("offline-custom", sharedstuff.get("offlinerefresh"));
		window.removeEventListener("online", sharedstuff.get("onlinerefresh"));
		window.removeEventListener("online-custom", sharedstuff.get("onlinerefresh"));
		console.log("[" + manifest.name + "] Both the Spotify SDK and auto token refresher have been cleaned up");
	}
}
