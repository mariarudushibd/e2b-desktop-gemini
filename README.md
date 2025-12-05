# E2B Desktop + Gemini 2.0 Flash Computer Use Agent

A computer use agent that combines E2B Desktop Sandbox with Google's Gemini 2.0 Flash model using Vercel AI SDK.

## Features

- **Secure Virtual Desktop** - Runs in E2B's isolated cloud sandbox
- **Gemini 2.0 Flash** - Uses Google's latest multimodal model with native computer use capabilities
- **AI SDK Integration** - Built with Vercel AI SDK for clean tool definitions
- **Full Desktop Control** - Click, type, scroll, hotkeys, and shell commands

## Prerequisites

- Node.js >= 20
- E2B API Key ([Get one here](https://e2b.dev/dashboard))
- Google AI API Key ([Get one here](https://aistudio.google.com/apikey))

## Installation

```bash
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Add your API keys to `.env`:
```env
E2B_API_KEY=your_e2b_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

## Usage

### Run with default task
```bash
npm start
```

### Run with custom task
```bash
npm start "Open Firefox and search for 'AI agents' on Google"
```

### Example tasks
```bash
# Web browsing
npm start "Open Firefox and navigate to github.com"

# File operations
npm start "Open the file manager and create a new folder called 'test'"

# Multi-step tasks
npm start "Open a terminal, create a Python file that prints 'Hello World', and run it"
```

## Available Tools

The agent can use these tools to interact with the desktop:

| Tool | Description |
|------|-------------|
| `screenshot` | Capture current screen state |
| `click` | Click at coordinates (left/right/middle) |
| `doubleClick` | Double-click at coordinates |
| `type` | Type text using keyboard |
| `hotkey` | Press keyboard shortcuts (e.g., 'ctrl+c') |
| `scroll` | Scroll up/down at coordinates |
| `moveMouse` | Move cursor to coordinates |
| `runCommand` | Execute shell commands |
| `openUrl` | Open URL in browser |

## Project Structure

```
e2b-desktop-gemini/
├── src/
│   └── index.ts      # Main agent implementation
├── .env.example      # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

1. Creates an E2B Desktop sandbox (1920x1080 resolution)
2. Takes a screenshot of the current state
3. Sends the screenshot + task to Gemini 2.0 Flash
4. Model decides which tools to use (click, type, etc.)
5. Executes tools and takes new screenshots
6. Repeats until task is complete

## License

MIT
