#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync, spawn, spawnSync } from "child_process";
import { openSync, closeSync } from "fs";

const server = new Server(
  { name: "terminal-cinema", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

function isInstalled(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getMissingDepsMessage(missing: string[]): string {
  const ubuntu = `sudo apt install ${missing.join(" ")}`;
  const macos = `brew install ${missing.join(" ")}`;
  return (
    `Missing system dependencies: ${missing.join(", ")}\n\n` +
    `Install them:\n` +
    `  Ubuntu/Debian: ${ubuntu}\n` +
    `  macOS:         ${macos}`
  );
}

function getBestTerminalVo(): string {
  if (process.env.TERM_PROGRAM === "iTerm.app") return "sixel";
  if (process.env.TERM === "xterm-kitty") return "kitty";
  return "tct";
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "play_video",
      description:
        "Search YouTube and play a video directly in the terminal (default), or in a GUI window for full quality. " +
        "Use this when the user asks to play, watch, or show any video. " +
        "Use mode='gui' only when the user explicitly says 'open in GUI', 'open in window', or 'full quality'. " +
        "Otherwise always default to mode='terminal'. " +
        'Examples: "play the best tmkoc episode", "put on some lofi hip hop", "watch in gui".',
      inputSchema: {
        type: "object",
        properties: {
          search_query: {
            type: "string",
            description:
              'YouTube search query, e.g. "best tmkoc episode full", "lofi hip hop radio"',
          },
          mode: {
            type: "string",
            enum: ["terminal", "gui"],
            description:
              "Where to play the video. 'terminal' (default) plays inline in the terminal. 'gui' opens a full-quality mpv window.",
          },
        },
        required: ["search_query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "play_video") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { search_query, mode = "terminal" } = request.params.arguments as {
    search_query: string;
    mode?: "terminal" | "gui";
  };

  // Check system deps before doing anything
  const missing = ["yt-dlp", "mpv"].filter((d) => !isInstalled(d));
  if (missing.length > 0) {
    return {
      content: [{ type: "text", text: getMissingDepsMessage(missing) }],
    };
  }

  // Search YouTube via yt-dlp (no API key needed, uses actual YT search)
  // Using spawnSync with array args — no shell injection risk
  const searchResult = spawnSync(
    "yt-dlp",
    [
      `ytsearch1:${search_query}`,
      "--print", "webpage_url",
      "--no-warnings",
      "--cookies-from-browser", "chrome",
    ],
    { encoding: "utf8" }
  );

  if (searchResult.status !== 0 || !searchResult.stdout.trim()) {
    const detail = searchResult.stderr?.trim();
    return {
      content: [
        {
          type: "text",
          text:
            "Could not find a video for that query. Try rephrasing it." +
            (detail ? `\n\nyt-dlp error: ${detail}` : ""),
        },
      ],
    };
  }

  const url = searchResult.stdout.trim();

  // The trick: open /dev/tty directly so mpv's output goes to the real
  // terminal screen and NOT through the MCP stdio connection (which would crash Claude)
  let ttyFd: number;
  try {
    ttyFd = openSync("/dev/tty", "w");
  } catch {
    return {
      content: [
        {
          type: "text",
          text: "Cannot open /dev/tty. This only works in an interactive terminal session.",
        },
      ],
    };
  }

  if (mode === "gui") {
    closeSync(ttyFd);
    // Detached GUI window — full quality, no terminal tricks needed
    const child = spawn(
      "mpv",
      ["--really-quiet", `--ytdl-raw-options=cookies-from-browser=chrome`, url],
      { detached: true, stdio: "ignore" }
    );
    child.unref();
    return {
      content: [{ type: "text", text: `Opening in GUI player: ${url}` }],
    };
  }

  // Terminal mode — pick the best available output protocol
  const vo = getBestTerminalVo();
  const mpvArgs = [
    `--vo=${vo}`,
    "--really-quiet",
    "--ytdl-raw-options=cookies-from-browser=chrome",
    // Keep it a reasonable size in the terminal
    "--autofit=50%",
    url,
  ];

  try {
    spawnSync("mpv", mpvArgs, {
      stdio: ["ignore", ttyFd, "ignore"],
    });
  } finally {
    closeSync(ttyFd);
  }

  return {
    content: [{ type: "text", text: `Done playing: ${url}` }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
