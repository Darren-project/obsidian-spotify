Spotify Plugin for Obsidian

This project uses the official Spotify TS  Api

The Spotify Plugin for Obsidian allows you to integrate Spotify functionality into your Obsidian notes. With this plugin, you can access your Spotify account, search for songs, albums, and artists, and retrieve information about playlists, tracks, and more.
Installation

To install the Spotify Plugin for Obsidian, follow these steps:

1. Open Obsidian and navigate to the "Community Plugins" tab in the settings.
2. Search for "Spotify api" in the plugin search bar.
3. Click on the "Install" button next to the Spotify api Plugin.
4. Once installed, enable the plugin.

Configuration

Before you can use the Spotify Plugin, you need to configure it with your Spotify API credentials. Here's how:

1. Go to the Spotify Developer Dashboard and create a new application.
2. Copy the "Client ID" and "Client Secret" values from your Spotify application.
3. Open the Obsidian settings and navigate to the "Spotify" tab.
4. Paste the "Client ID" and "Client Secret" values into the respective fields.
5. Next follow the Authorization steps

Authentication



To authenticate with Spotify, follow these steps:

1. Open the Obsidian settings and navigate to the "Spotify" tab.
2. Enter your client and secret id
3. Click the "Spotify login" button.
4. Follow the on-screen instructions to complete the authentication process.

Usage

Once authenticated, you can use the Spotify Plugin to interact with the Spotify API. Here are some examples of what you can do:

1. Search for songs, albums, and artists.
2. Retrieve information about playlists, tracks, and albums.
3. Control playback on Spotify devices.
4. Get recommendations based on your listening history.
5. Access user-specific data, such as top tracks and recently played tracks.

To use the Spotify Plugin in your Obsidian notes, you can use the provided JavaScript code examples. Here's an example of how to search for tracks:


```js
// Search for tracks
const searchResults = await window.spotifysdk.search("track", "Believer");
console.log(searchResults);
```

Conclusion

The Spotify Plugin for Obsidian allows you to integrate Spotify functionality into your Obsidian notes. With this plugin, you can search for songs, retrieve information about playlists and tracks, and control playback on Spotify devices. Start using the Spotify Plugin today and enhance your note-taking experience with music integration!
