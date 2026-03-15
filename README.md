# @magun/watch

MCP server that lets you tell Claude Code to play any YouTube video directly in your terminal.

Just say things like:

, "play the best tmkoc episode"
, "put on some lofi hip hop"
, "watch a funny cricket fails compilation"

and it finds the video on YouTube and plays it right there.

---

## Prerequisites

You need two system tools installed, mpv (video player) and yt-dlp (YouTube downloader).

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

, "play the best tmkoc episode"
, "play lofi hip hop"
, "show me a cricket highlights video"
, "watch something funny"

Claude will call the `play_video` tool, search YouTube, and start playing in your terminal.

Press `q` to quit the video at any time.

---

## Terminal quality

The video renders as colored blocks by default (`--vo=tct` mode), which works in every terminal.

If you are on a modern terminal like Kitty or WezTerm you can get much better quality. Open `src/index.ts`, find `--vo=tct` and change it to `--vo=kitty` or `--vo=sixel`, then run `npm run build` again.

---

## How it works

MCP servers communicate with Claude over stdin/stdout. If we piped raw video through that connection it would crash Claude Code instantly.

The trick is opening `/dev/tty` directly, which is a file descriptor pointing straight to your real terminal screen, completely bypassing the MCP pipe. So the video goes to your eyes, and only a short status message goes back to Claude.

---

## License

MIT
