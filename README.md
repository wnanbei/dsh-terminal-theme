# dsh-terminal-theme

English | [中文](README.zh.md)

Color themes for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) terminal panel: choose a built-in palette, or import your own from JSON. The colors apply to the terminal only — the rest of DSH keeps the active theme.

## Features

- **Terminal-only colors.** Every rule is scoped to the terminal panel, so the sidebar, the conversation, and Settings still read the DSH theme tokens.
- **Independent of light and dark.** A terminal theme keeps its colors when the application switches scheme.
- **Importable palettes.** Paste JSON or load a `.json` file; themes are validated, normalized, and stored in the browser.
- **Fully reversible.** Pick "Follow app theme" and the terminal returns to the stock DSH appearance; nothing else is touched.

## Install

Clone the repository, then install that directory as a local bundle from the DSH plugin manager:

```bash
git clone https://github.com/wnanbei/dsh-terminal-theme.git
```

DSH links the directory into the active profile (`~/.dsh/profiles/<profile>/node_modules/dsh-terminal-theme`), so later edits in the repository take effect on the next page reload without repacking.

> Once published to npm, `pnpm add dsh-terminal-theme` works the same way; enable the bundle afterwards.

## Usage

1. Open the terminal panel in the right sidebar, then go to **Settings → Terminal colors**.
2. Pick a card under **Color themes**; the terminal repaints immediately.
3. Pick **Follow app theme** to restore the default, including the light/dark switch.

Importing a theme:

- Paste JSON into **Import a theme** and press **Import and apply**, or press **Import from file** to load a `.json` file.
- **Fill template** writes a complete, directly editable example.
- **Copy current theme** exports the active palette; rename it and import it back to create a variant.
- The `×` on a custom theme card deletes it.

Themes live in the browser (`localStorage`), not in the profile configuration, so they survive DSH upgrades and stay out of other browsers.

## Theme JSON format

```json
{
  "name": "My Theme",
  "background": "#101216",
  "foreground": "#d5dae2",
  "cursor": "#7aa2f7",
  "selection": "#26303f",
  "ansi": [
    "#101216", "#e05f65", "#78bb7b", "#f1cf8a",
    "#70a5eb", "#c68aee", "#74e0c8", "#d5dae2",
    "#5b6270", "#ff8a8f", "#9be59d", "#ffe0a3",
    "#9ac2ff", "#e0aaff", "#9ff3e0", "#ffffff"
  ]
}
```

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | Display name, 1–60 characters |
| `background` / `foreground` | yes | Terminal background and default text color |
| `cursor` | no | Cursor color; defaults to `foreground` |
| `selection` | no | Selection fill; defaults to `foreground` at 30% |
| `ansi` | yes | 16 colors: black, red, green, yellow, blue, magenta, cyan, white, then the 8 bright variants. 8 colors are accepted too and reused for the bright half |
| `extended` | no | Up to 240 colors for indexes 16–255 of the 256-color palette |

Colors must be hexadecimal (`#rgb` or `#rrggbb`, normalized to lowercase `#rrggbb`); anything else is rejected on import with the reason shown on the page.

## How it works

- All rules are scoped to the `[data-sidebar-terminal]` subtree: `--dsw-alias-bg-base` and `--dsw-alias-label-primary` are rebound there, and the xterm DOM renderer's `.xterm-fg-N` / `.xterm-bg-N` rules are overridden. No global DSH theme token changes.
- The plugin neither replaces nor wraps the terminal component, and never reads or writes its private state. Deselecting a theme only removes the injected stylesheet.
- The terminal's own OSC color handling, contrast adjustment, and cursor visibility logic keep working as before.
- Another built-in theme needs one entry in `BUILTINS` in `client.js`; anything else can go through the Settings page.

## Built-in themes

Dracula, Nord, Solarized Dark / Light, Gruvbox Dark, One Dark, Tokyo Night, Catppuccin Mocha, GitHub Light.

## Development

```
client.js   browser half: scoped palette stylesheet + Settings page
index.js    host half: inert, only registers the bundle row
locale/     display name and description for the plugin manager
icon.svg    plugin icon
```

Reload the page after editing `client.js`: the plugin manager's install record points at this directory, so no reinstall is needed.

## License

MIT
