import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginManifest, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import { SharedStuff, ObsidianSpotifySettings } from './main';
import ObsidianSpotify from './main';

export class RefreshClass {
static async refreshInit(args: {sharedstuff: SharedStuff, refreshspot: Function, settings: ObsidianSpotifySettings, manifest: PluginManifest}) {
    const sharedstuff = args.sharedstuff;
    const refreshspot = args.refreshspot;
    const settings = args.settings;
    const manifest = args.manifest;
    var TIMEOUT = 3000;

		sharedstuff.set("offlinerefresh", async () => {
			console.log("[" + manifest.name + "] Now offline, refreshing Spotify Token after online and restting timer")
		})

		window.addEventListener("offline", sharedstuff.get("offlinerefresh"));
        
		
		sharedstuff.set("onlinerefresh", async () => {
			console.log("[" + manifest.name + "] Refreshing Spotify Token after online and restting timer")
			await refreshspot(settings, manifest)
			clearInterval(sharedstuff.get("spotifyrefreshtimer"))
			setTimeout( async () => {
			let spotifyrefreshtimer = setInterval( async () => {
				await refreshspot(settings, manifest)
			}, 3600000)
			sharedstuff.set("spotifyrefreshtimer", spotifyrefreshtimer)
		}, TIMEOUT)
		}
		)

		window.addEventListener("online", sharedstuff.get("onlinerefresh"))

		await refreshspot(settings, manifest)
		let spotifyrefreshtimer = setInterval( async () => {
				await refreshspot(settings, manifest)
		}, 3600000)
		sharedstuff.set("spotifyrefreshtimer", spotifyrefreshtimer)
  }

  static async logoutOrunload(args: {sharedstuff: SharedStuff, settings: ObsidianSpotifySettings, manifest: PluginManifest}) {
    const sharedstuff = args.sharedstuff;
    const settings = args.settings;
    const manifest = args.manifest;
    (window.spotifysdk as any) = null
	clearInterval(sharedstuff.get("spotifyrefreshtimer"))
	window.removeEventListener("offline", sharedstuff.get("offlinerefresh"))
	window.removeEventListener("online", sharedstuff.get("onlinerefresh"))
	console.log("[" + manifest.name + "] Both the spotify sdk and auto token refresher have been cleaned up")
  }
}