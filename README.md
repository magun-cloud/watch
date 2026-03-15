# @magun/watch

MCP server that lets you tell Claude Code to play any YouTube video — in your terminal or in a full HD GUI window.

Just say things like:

- "play the best tmkoc episode"
- "put on some lofi hip hop"
- "watch a funny cricket fails compilation"
- "play bhide seeti episode in hd" ← opens a full-quality GUI window

---

## Prerequisites

You need two system tools installed: **mpv** (video player) and **yt-dlp** (YouTube downloader).

**Ubuntu / Debian**
```bash
sudo apt install mpv yt-dlp
```

**macOS**
```bash
brew install mpv yt-dlp
```

---

## Setup

**Option 1 — via npx (recommended, no cloning needed)**

```bash
claude mcp add yt-play -s user -- npx @magun/watch
```

**Option 2 — run locally after cloning**

```bash
git clone https://github.com/magun-cloud/watch.git
cd watch
npm install
npm run build
claude mcp add yt-play -s user -- node /absolute/path/to/watch/dist/index.js
```

After adding the server, restart Claude Code.

---

## Usage

Just talk to Claude Code naturally:

- "play the best tmkoc episode"
- "play lofi hip hop"
- "show me a cricket highlights video"
- "watch something funny"
- "open in gui" / "watch in full quality" → opens mpv as a GUI window

Claude calls the `play_video` tool, searches YouTube, and plays it.

Press `q` to quit the video at any time.

---

## Playback modes

| Mode | How to trigger | Quality |
|------|---------------|---------|
| **Terminal** (default) | Just ask normally | Colored blocks in your terminal |
| **GUI** | Say "in HD", "open in window", "full quality" | Full HD in an mpv window |

### Terminal quality

The server auto-detects your terminal and picks the best renderer:

- **iTerm2** → `sixel` (good pixel quality)
- **Kitty** → `kitty` protocol (best quality)
- **Everything else** → `tct` (colored block fallback, works everywhere)

No manual config needed.

---

## How it works

MCP servers communicate with Claude over stdin/stdout. If we piped raw video through that connection it would crash Claude Code instantly.

The trick is opening `/dev/tty` directly — a file descriptor pointing straight to your real terminal screen, completely bypassing the MCP pipe. So the video goes to your eyes, and only a short status message goes back to Claude.

For GUI mode, mpv is spawned as a detached process so it runs independently of the MCP server.

---

## License

MIT
