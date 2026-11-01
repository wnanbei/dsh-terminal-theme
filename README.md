# dsh-terminal-theme

English | [中文](README.zh.md)

Color themes for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) terminal panel: choose a built-in palette, or import your own from JSON. The colors apply to the terminal only — the rest of DSH keeps the active theme.

## Features

- **Terminal-only colors.** Every rule is scoped to the terminal panel, so the sidebar, the conversation, and Settings still read the DSH theme tokens.
- **Independent of light and dark.** A terminal theme keeps its colors when the application switches scheme.
- **Importable palettes.** Paste JSON or load a `.json` file; themes are validated, normalized, and stored in the browser.
- **Fully reversible.** Pick "Follow app theme" and the terminal returns to the stock DSH appearance; nothing else is touched.

## Install

The native **Plugins** page installs it: **Add plugin** → paste a spec → **Install**. Three specs work:

| Spec | When to use |
| --- | --- |
| `dsh-terminal-theme` | Once the package is published to npm |
| `https://github.com/wnanbei/dsh-terminal-theme` | Straight from GitHub; pnpm clones the repository, and there is no build step |
| `/Users/wnanbei/code/dsh-terminal-theme` | From a local clone you keep editing (installs a `link:` dependency) |

The dialog also takes a tarball, a `git+https://…` address, and a different registry for that one install. It refuses a package that declares no bundle patch, so the repository root must stay a complete package.

A local-directory install links the folder into the active profile (`~/.dsh/profiles/<profile>/node_modules/dsh-terminal-theme`), so later edits in that clone take effect on the next page reload without repacking. A GitHub install copies the package into the profile instead, so updating means removing and re-adding it. Either way an existing installation is reported as already installed — remove the bundle first to switch sources.

```bash
git clone https://github.com/wnanbei/dsh-terminal-theme.git
```

> Agents use the same operation: `plugin_manager` `install_bundle` with one of these specs.

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
scripts/    preflight checks (CI and pre-tag)
.github/    verify and release workflows
```

Reload the page after editing `client.js`: the plugin manager's install record points at this directory, so no reinstall is needed.

## Releasing

Versions follow Semantic Versioning: a **major** bump when the theme JSON schema or an existing built-in id changes incompatibly, a **minor** bump for new palettes or Settings features, a **patch** bump for fixes.

`version` in `package.json` is the only source of truth, and the tag is `v<version>`:

```bash
node scripts/check.mjs                      # the preflight CI runs
npm version patch -m "chore(release): v%s"  # or minor / major
git push --follow-tags
```

Pushing the tag runs `.github/workflows/release.yml`, which refuses a tag that disagrees with `package.json`, re-runs the checks, packs the plugin, and publishes a GitHub Release named after the tag — with the `.tgz` attached and notes generated from the commits since the previous tag.

The tarball is an install spec too, so a release can be pinned without npm:

- `https://github.com/wnanbei/dsh-terminal-theme/releases/download/v1.2.0/dsh-terminal-theme-1.2.0.tgz` pins that release
- `https://github.com/wnanbei/dsh-terminal-theme` tracks the default branch

Every push to `main` runs `.github/workflows/verify.yml`, which is the same `node scripts/check.mjs`.

## License

MIT
