/**
 * dsh-terminal-theme — Client half (Web).
 *
 * Gives the right-sidebar terminal its own color scheme without touching the
 * application theme:
 *
 * - Every color is written as CSS scoped to `[data-sidebar-terminal]`, the
 *   section the terminal package renders. `--dsw-alias-bg-base` and
 *   `--dsw-alias-label-primary` are re-bound on that subtree only, so the
 *   panel surface follows the terminal palette while the rest of DSH keeps
 *   the active theme.
 * - The terminal renders through xterm's DOM renderer, which colors cells
 *   with `.xterm-fg-<n>` / `.xterm-bg-<n>` rules generated from its own
 *   theme. Overriding those rules with `!important` inside the same subtree
 *   retints the 16 ANSI colors without reaching into the terminal plugin's
 *   state or private APIs.
 * - Selection, cursor and inverse colors get the same treatment, so a theme
 *   is a pure, self-contained stylesheet: removing it restores the app theme.
 *
 * Themes live in the browser (localStorage); built-ins ship in this file and
 * additional themes are imported from JSON on the Settings page.
 */
window.__ModuleLoader__.load({
  id: 'dsh-terminal-theme',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'terminal-theme'
    const STORAGE_KEY = 'dsh.terminal-theme.v1'
    const FOLLOW_ID = '__app__'
    const PANEL = '[data-sidebar-terminal]'
    const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

    /* ------------------------------------------------------------------ */
    /* Copy                                                               */
    /* ------------------------------------------------------------------ */

    const zh = {
      nav: '终端配色',
      title: '终端配色',
      subtitle: '只为右侧终端面板设置配色，DSH 其余界面继续使用当前主题。',
      follow: '跟随应用主题',
      followHint: '与 DSH 主题保持一致',
      customBadge: '自定义',
      delete: '删除该主题',
      themes: '颜色主题',
      importTitle: '导入颜色主题',
      importHint: '粘贴下面这样的 JSON 后导入。导入的主题保存在本机浏览器，可随时在上方切换。',
      importPlaceholder:
        '{\n  "name": "My Theme",\n  "background": "#101216",\n  "foreground": "#d5dae2",\n  "ansi": ["#101216", "… 共 16 个颜色"]\n}',
      importAction: '导入并应用',
      fillTemplate: '填入模板',
      importFile: '从文件导入',
      copyActive: '复制当前主题',
      formatHint:
        '字段：name、background、foreground 必填；cursor、selection 可选；ansi 为 16 个（或 8 个）颜色；extended 可选 240 个扩展色。颜色使用十六进制写法，如 #1e1e2e。',
      imported: '已导入“{name}”并应用到终端。',
      removed: '已删除“{name}”。',
      copied: '当前主题的 JSON 已复制到剪贴板。',
      copyFailed: '复制失败：{message}',
      nothingToCopy: '当前是“跟随应用主题”，没有可复制的颜色。',
      fileFailed: '读取文件失败：{message}',
      errJson: '不是有效的 JSON：{message}',
      errShape: '主题必须是一个 JSON 对象。',
      errName: 'name 必须是 1–60 个字符的字符串。',
      errColor: '{field} 必须是十六进制颜色，如 #1e1e2e。',
      errAnsi: 'ansi 必须是 16 个（或 8 个）十六进制颜色。',
      errExtended: 'extended 最多 240 个颜色，且每一项都必须是十六进制颜色。',
      footNote: '终端配色只作用于终端面板；切换到“跟随应用主题”即可完全恢复默认。',
    }

    const en = {
      nav: 'Terminal colors',
      title: 'Terminal colors',
      subtitle: 'A color scheme for the terminal panel only; the rest of DSH keeps the active theme.',
      follow: 'Follow app theme',
      followHint: 'Stay in sync with the DSH theme',
      customBadge: 'Custom',
      delete: 'Delete this theme',
      themes: 'Color themes',
      importTitle: 'Import a theme',
      importHint: 'Paste JSON like the sample below. Imported themes stay in this browser and can be switched at any time above.',
      importPlaceholder:
        '{\n  "name": "My Theme",\n  "background": "#101216",\n  "foreground": "#d5dae2",\n  "ansi": ["#101216", "… 16 colors in total"]\n}',
      importAction: 'Import and apply',
      fillTemplate: 'Fill template',
      importFile: 'Import from file',
      copyActive: 'Copy current theme',
      formatHint:
        'Fields: name, background and foreground are required; cursor and selection are optional; ansi holds 16 (or 8) colors; extended optionally holds 240 extra colors. Use hexadecimal colors such as #1e1e2e.',
      imported: 'Imported “{name}” and applied it to the terminal.',
      removed: 'Deleted “{name}”.',
      copied: 'The current theme JSON is on the clipboard.',
      copyFailed: 'Copy failed: {message}',
      nothingToCopy: '“Follow app theme” is active, so there are no colors to copy.',
      fileFailed: 'Could not read the file: {message}',
      errJson: 'Not valid JSON: {message}',
      errShape: 'A theme must be a JSON object.',
      errName: 'name must be a string of 1–60 characters.',
      errColor: '{field} must be a hexadecimal color such as #1e1e2e.',
      errAnsi: 'ansi must hold 16 (or 8) hexadecimal colors.',
      errExtended: 'extended accepts at most 240 colors, each hexadecimal.',
      footNote: 'The palette applies to the terminal panel only; pick “Follow app theme” to restore the default.',
    }

    /* ------------------------------------------------------------------ */
    /* Color helpers                                                      */
    /* ------------------------------------------------------------------ */

    const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

    /** @param {unknown} value - candidate color. @returns {string | null} `#rrggbb` or null. */
    function normalizeHex(value) {
      if (typeof value !== 'string') return null
      const text = value.trim()
      if (!HEX_RE.test(text)) return null
      const digits = text.slice(1)
      const full =
        digits.length === 3
          ? digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2]
          : digits
      return '#' + full.toLowerCase()
    }

    /** @param {string} hex - `#rrggbb`. @returns {number[]} channels. */
    function channels(hex) {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ]
    }

    /** @param {string} hex - `#rrggbb`. @param {number} alpha - 0..1. */
    function withAlpha(hex, alpha) {
      const [r, g, b] = channels(hex)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    /** @param {string} hex - `#rrggbb`. @returns {number} relative luminance. */
    function luminance(hex) {
      const linear = channels(hex).map((channel) => {
        const value = channel / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }

    /** @param {string} hex - `#rrggbb`. @returns {string} black or white for text on it. */
    function readableOn(hex) {
      return luminance(hex) > 0.42 ? '#000000' : '#ffffff'
    }

    /* ------------------------------------------------------------------ */
    /* Built-in themes                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * @typedef {object} TerminalTheme
     * @property {string} id
     * @property {string} name
     * @property {string} background
     * @property {string} foreground
     * @property {string} cursor
     * @property {string} [selection]
     * @property {string[]} ansi - 16 colors, 0-7 normal then 8-15 bright.
     * @property {string[]} [extended] - up to 240 colors for indexes 16-255.
     */

    /** @type {TerminalTheme[]} */
    const BUILTINS = [
      {
        id: 'dracula',
        name: 'Dracula',
        background: '#282a36',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: '#44475a',
        ansi: [
          '#21222c', '#ff5555', '#50fa7b', '#f1fa8c',
          '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2',
          '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5',
          '#d6acff', '#ff92df', '#a4ffff', '#ffffff',
        ],
      },
      {
        id: 'nord',
        name: 'Nord',
        background: '#2e3440',
        foreground: '#d8dee9',
        cursor: '#d8dee9',
        selection: '#434c5e',
        ansi: [
          '#3b4252', '#bf616a', '#a3be8c', '#ebcb8b',
          '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0',
          '#4c566a', '#bf616a', '#a3be8c', '#ebcb8b',
          '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4',
        ],
      },
      {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        background: '#002b36',
        foreground: '#839496',
        cursor: '#93a1a1',
        selection: '#073642',
        ansi: [
          '#073642', '#dc322f', '#859900', '#b58900',
          '#268bd2', '#d33682', '#2aa198', '#eee8d5',
          '#002b36', '#cb4b16', '#586e75', '#657b83',
          '#839496', '#6c71c4', '#93a1a1', '#fdf6e3',
        ],
      },
      {
        id: 'solarized-light',
        name: 'Solarized Light',
        background: '#fdf6e3',
        foreground: '#657b83',
        cursor: '#586e75',
        selection: '#eee8d5',
        ansi: [
          '#073642', '#dc322f', '#859900', '#b58900',
          '#268bd2', '#d33682', '#2aa198', '#eee8d5',
          '#002b36', '#cb4b16', '#586e75', '#657b83',
          '#839496', '#6c71c4', '#93a1a1', '#fdf6e3',
        ],
      },
      {
        id: 'gruvbox-dark',
        name: 'Gruvbox Dark',
        background: '#282828',
        foreground: '#ebdbb2',
        cursor: '#ebdbb2',
        selection: '#504945',
        ansi: [
          '#282828', '#cc241d', '#98971a', '#d79921',
          '#458588', '#b16286', '#689d6a', '#a89984',
          '#928374', '#fb4934', '#b8bb26', '#fabd2f',
          '#83a598', '#d3869b', '#8ec07c', '#ebdbb2',
        ],
      },
      {
        id: 'one-dark',
        name: 'One Dark',
        background: '#282c34',
        foreground: '#abb2bf',
        cursor: '#528bff',
        selection: '#3e4451',
        ansi: [
          '#282c34', '#e06c75', '#98c379', '#e5c07b',
          '#61afef', '#c678dd', '#56b6c2', '#abb2bf',
          '#5c6370', '#e06c75', '#98c379', '#e5c07b',
          '#61afef', '#c678dd', '#56b6c2', '#ffffff',
        ],
      },
      {
        id: 'tokyo-night',
        name: 'Tokyo Night',
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selection: '#33467c',
        ansi: [
          '#15161e', '#f7768e', '#9ece6a', '#e0af68',
          '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6',
          '#414868', '#f7768e', '#9ece6a', '#e0af68',
          '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5',
        ],
      },
      {
        id: 'catppuccin-mocha',
        name: 'Catppuccin Mocha',
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selection: '#585b70',
        ansi: [
          '#45475a', '#f38ba8', '#a6e3a1', '#f9e2af',
          '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de',
          '#585b70', '#f38ba8', '#a6e3a1', '#f9e2af',
          '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8',
        ],
      },
      {
        id: 'github-light',
        name: 'GitHub Light',
        background: '#ffffff',
        foreground: '#24292f',
        cursor: '#24292f',
        selection: '#d0d7de',
        ansi: [
          '#24292f', '#cf222e', '#116329', '#4d2d00',
          '#0969da', '#8250df', '#1b7c83', '#6e7781',
          '#57606a', '#a40e26', '#1a7f37', '#633c01',
          '#218bff', '#a475f9', '#3192aa', '#8c959f',
        ],
      },
    ]

    /* ------------------------------------------------------------------ */
    /* Parsing and validation                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Validate one theme object coming from JSON or storage.
     * @param {unknown} input - parsed JSON value.
     * @returns {{ ok: true, theme: object } | { ok: false, code: string, field?: string, detail?: string }}
     */
    function parseThemeObject(input) {
      let data = input
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        !('background' in data) &&
        data.theme &&
        typeof data.theme === 'object'
      ) {
        data = data.theme
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, code: 'shape' }
      }
      const name = typeof data.name === 'string' ? data.name.trim() : ''
      if (!name || name.length > 60) return { ok: false, code: 'name' }

      const background = normalizeHex(data.background)
      if (!background) return { ok: false, code: 'color', field: 'background' }
      const foreground = normalizeHex(data.foreground)
      if (!foreground) return { ok: false, code: 'color', field: 'foreground' }

      const cursor = data.cursor === undefined ? foreground : normalizeHex(data.cursor)
      if (!cursor) return { ok: false, code: 'color', field: 'cursor' }

      let selection
      if (data.selection !== undefined && data.selection !== null && data.selection !== '') {
        selection = normalizeHex(data.selection)
        if (!selection) return { ok: false, code: 'color', field: 'selection' }
      }

      const rawAnsi = data.ansi
      if (!Array.isArray(rawAnsi) || (rawAnsi.length !== 8 && rawAnsi.length !== 16)) {
        return { ok: false, code: 'ansi' }
      }
      const ansi = []
      for (const value of rawAnsi) {
        const hex = normalizeHex(value)
        if (!hex) return { ok: false, code: 'ansi' }
        ansi.push(hex)
      }
      while (ansi.length < 16) ansi.push(ansi[ansi.length - 8])

      let extended
      if (Array.isArray(data.extended) && data.extended.length > 0) {
        if (data.extended.length > 240) return { ok: false, code: 'extended' }
        extended = []
        for (const value of data.extended) {
          const hex = normalizeHex(value)
          if (!hex) return { ok: false, code: 'extended' }
          extended.push(hex)
        }
      }

      const theme = { name, background, foreground, cursor, ansi }
      if (selection) theme.selection = selection
      if (extended) theme.extended = extended
      return { ok: true, theme }
    }

    /**
     * Turn a failure code into localized copy.
     * @param {{ code: string, field?: string, detail?: string }} failure - parser result.
     * @param {(key: string, params?: object) => string} t - locale formatter.
     */
    function describeFailure(failure, t) {
      switch (failure.code) {
        case 'json':
          return t('errJson', { message: failure.detail ?? '' })
        case 'name':
          return t('errName')
        case 'color':
          return t('errColor', { field: failure.field ?? '' })
        case 'ansi':
          return t('errAnsi')
        case 'extended':
          return t('errExtended')
        default:
          return t('errShape')
      }
    }

    /**
     * Parse theme JSON text.
     * @param {string} text - pasted or loaded JSON.
     * @param {(key: string, params?: object) => string} t - locale formatter.
     * @returns {{ ok: true, theme: object } | { ok: false, error: string }}
     */
    function parseThemeText(text, t) {
      let data
      try {
        data = JSON.parse(text)
      } catch (error) {
        return { ok: false, error: describeFailure({ code: 'json', detail: String(error?.message ?? error) }, t) }
      }
      const parsed = parseThemeObject(data)
      if (!parsed.ok) return { ok: false, error: describeFailure(parsed, t) }
      return parsed
    }

    /* ------------------------------------------------------------------ */
    /* Store                                                              */
    /* ------------------------------------------------------------------ */

    const listeners = new Set()
    let paletteElement = null
    let state = loadState()

    /** @returns {{ activeId: string, custom: object[] }} persisted selection. */
    function loadState() {
      const fallback = { activeId: FOLLOW_ID, custom: [] }
      try {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
        if (!raw) return fallback
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return fallback
        const custom = []
        for (const entry of Array.isArray(parsed.custom) ? parsed.custom : []) {
          const result = parseThemeObject(entry)
          if (!result.ok) continue
          const id = typeof entry?.id === 'string' && entry.id ? entry.id : makeId()
          custom.push({ id, ...result.theme })
        }
        const known = new Set([FOLLOW_ID, ...BUILTINS.map((theme) => theme.id), ...custom.map((theme) => theme.id)])
        const activeId = typeof parsed.activeId === 'string' && known.has(parsed.activeId) ? parsed.activeId : FOLLOW_ID
        return { activeId, custom }
      } catch {
        return fallback
      }
    }

    /** Persist the current selection, ignoring storage failures. */
    function saveState() {
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* private mode or quota: the in-memory selection still applies */
      }
    }

    /** @returns {string} a fresh custom theme id. */
    function makeId() {
      return 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
    }

    /** @returns {object[]} built-ins followed by imported themes. */
    function allThemes() {
      return BUILTINS.concat(state.custom)
    }

    /** @returns {object | undefined} the theme bound to the selection, if any. */
    function activeTheme() {
      return allThemes().find((theme) => theme.id === state.activeId)
    }

    /** Notify mounted views. */
    function emit() {
      for (const listener of listeners) {
        try {
          listener()
        } catch (error) {
          console.error('terminal-theme: listener failed', error)
        }
      }
    }

    /** Rewrite the scoped palette stylesheet from the current selection. */
    function refreshPalette() {
      if (!paletteElement) return
      paletteElement.textContent = buildPaletteCss(activeTheme())
    }

    /** @param {string} id - theme id or `__app__`. */
    function selectTheme(id) {
      state = { ...state, activeId: id }
      saveState()
      refreshPalette()
      emit()
    }

    /**
     * Store a validated theme and select it.
     * @param {object} theme - validated theme fields.
     * @returns {object} the stored theme with its id.
     */
    function addCustomTheme(theme) {
      const stored = { id: makeId(), ...theme }
      state = { activeId: stored.id, custom: state.custom.concat([stored]) }
      saveState()
      refreshPalette()
      emit()
      return stored
    }

    /** @param {string} id - custom theme id. */
    function removeCustomTheme(id) {
      state = {
        activeId: state.activeId === id ? FOLLOW_ID : state.activeId,
        custom: state.custom.filter((theme) => theme.id !== id),
      }
      saveState()
      refreshPalette()
      emit()
    }

    /**
     * Subscribe to selection changes.
     * @param {() => void} listener - called after every change.
     * @returns {() => void} unsubscribe.
     */
    function subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }

    /* ------------------------------------------------------------------ */
    /* Scoped palette stylesheet                                          */
    /* ------------------------------------------------------------------ */

    /**
     * Build the stylesheet that retints the terminal panel only.
     * @param {object | undefined} theme - active theme, or undefined to follow the app.
     * @returns {string} CSS text (empty when following the app theme).
     */
    function buildPaletteCss(theme) {
      if (!theme) return ''
      const background = theme.background
      const foreground = theme.foreground
      const cursor = theme.cursor || foreground
      const selection = theme.selection || withAlpha(foreground, 0.3)
      const rules = [
        `${PANEL}{--dsw-alias-bg-base:${background};--dsw-alias-label-primary:${foreground}}`,
        `${PANEL} .xterm{--terminal-cursor:${cursor};--terminal-cursor-accent:${readableOn(cursor)};--terminal-cursor-cell-background:${background};--terminal-cursor-cell-foreground:${foreground}}`,
        `${PANEL} .xterm .xterm-rows{color:${foreground}!important}`,
        `${PANEL} .xterm .xterm-rows .xterm-dim{color:${withAlpha(foreground, 0.5)}!important}`,
      ]
      theme.ansi.forEach((color, index) => {
        rules.push(`${PANEL} .xterm-fg-${index}{color:${color}!important}`)
        rules.push(`${PANEL} .xterm-fg-${index}.xterm-dim{color:${withAlpha(color, 0.5)}!important}`)
        rules.push(`${PANEL} .xterm-bg-${index}{background-color:${color}!important}`)
      })
      if (Array.isArray(theme.extended)) {
        theme.extended.forEach((color, offset) => {
          const index = 16 + offset
          rules.push(`${PANEL} .xterm-fg-${index}{color:${color}!important}`)
          rules.push(`${PANEL} .xterm-fg-${index}.xterm-dim{color:${withAlpha(color, 0.5)}!important}`)
          rules.push(`${PANEL} .xterm-bg-${index}{background-color:${color}!important}`)
        })
      }
      // Inverted default cells (SGR 7 without an explicit color).
      rules.push(`${PANEL} .xterm-fg-257{color:${background}!important}`)
      rules.push(`${PANEL} .xterm-bg-257{background-color:${foreground}!important}`)
      // Selection rectangles are painted by the renderer, not by the theme.
      rules.push(`${PANEL} .xterm .xterm-selection div{background-color:${selection}!important}`)
      return rules.join('\n')
    }

    /* ------------------------------------------------------------------ */
    /* Settings page styles                                               */
    /* ------------------------------------------------------------------ */

    const UI_CSS = `
.dtt-section{display:flex;flex-direction:column;gap:18px;box-sizing:border-box;width:100%;max-width:760px;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;line-height:22px}
.dtt-header{display:flex;flex-direction:column;gap:3px}
.dtt-title{margin:0;font-size:18px;font-weight:600;line-height:26px}
.dtt-subtitle{margin:0;font-size:13px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dtt-group{display:flex;flex-direction:column;gap:10px}
.dtt-groupTitle{font-size:14px;font-weight:500;line-height:20px}
.dtt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:10px}
.dtt-cell{position:relative;display:flex;min-width:0}
.dtt-card{box-sizing:border-box;display:flex;flex-direction:column;gap:9px;width:100%;min-width:0;padding:11px 12px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left;cursor:pointer}
.dtt-card:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dtt-card[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.dtt-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dtt-cell[data-deletable="true"] .dtt-card{padding-right:34px}
.dtt-cardName{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;font-weight:500;line-height:18px}
.dtt-cardNameText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dtt-badge{flex:none;padding:0 6px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-weight:400}
.dtt-chips{display:flex;align-items:center;gap:5px}
.dtt-chip{flex:none;width:17px;height:17px;border-radius:5px;border:.5px solid var(--dsw-alias-border-l2);background-clip:padding-box}
.dtt-chipWide{width:30px}
.dtt-delete{position:absolute;top:6px;right:6px;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:15px;line-height:1;cursor:pointer}
.dtt-delete:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.dtt-preview{padding:11px 14px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);font-family:${MONO};font-size:12px;line-height:19px;white-space:pre;overflow:hidden}
.dtt-preview[data-follow="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dtt-import{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.dtt-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dtt-textarea{box-sizing:border-box;width:100%;min-height:118px;resize:vertical;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:${MONO};font-size:12px;line-height:18px}
.dtt-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dtt-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dtt-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:500;line-height:20px;cursor:pointer}
.dtt-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dtt-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dtt-btn[data-variant="primary"]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#ffffff}
.dtt-file{position:relative;overflow:hidden}
.dtt-file input{position:absolute;inset:0;opacity:0;cursor:pointer}
.dtt-msg{margin:0;font-size:12px;line-height:18px}
.dtt-msg[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
.dtt-msg[data-error="false"]{color:var(--dsw-alias-state-success-primary)}
.dtt-foot{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
`

    /* ------------------------------------------------------------------ */
    /* Settings page                                                      */
    /* ------------------------------------------------------------------ */

    /** Sample JSON offered by the "fill template" action. */
    const TEMPLATE = {
      name: 'My Theme',
      background: '#101216',
      foreground: '#d5dae2',
      cursor: '#7aa2f7',
      selection: '#26303f',
      ansi: [
        '#101216', '#e05f65', '#78bb7b', '#f1cf8a',
        '#70a5eb', '#c68aee', '#74e0c8', '#d5dae2',
        '#5b6270', '#ff8a8f', '#9be59d', '#ffe0a3',
        '#9ac2ff', '#e0aaff', '#9ff3e0', '#ffffff',
      ],
    }

    /**
     * Render one theme card.
     * @param {object} props - theme, selection state and handlers.
     */
    function ThemeCard({ theme, active, deletable, onSelect, onDelete, t }) {
      const chips = [
        theme.background,
        theme.foreground,
        theme.ansi[1],
        theme.ansi[4],
        theme.ansi[2],
        theme.ansi[3],
      ]
      return h(
        'div',
        { className: 'dtt-cell', 'data-deletable': deletable ? 'true' : 'false' },
        h(
          'button',
          {
            type: 'button',
            className: 'dtt-card',
            'aria-pressed': active ? 'true' : 'false',
            onClick: () => onSelect(theme.id),
          },
          h(
            'span',
            { className: 'dtt-cardName' },
            h('span', { className: 'dtt-cardNameText' }, theme.name),
            deletable ? h('span', { className: 'dtt-badge' }, t('customBadge')) : null,
          ),
          h(
            'span',
            { className: 'dtt-chips' },
            chips.map((color, index) =>
              h('span', {
                key: index,
                className: 'dtt-chip' + (index < 2 ? ' dtt-chipWide' : ''),
                style: { background: color },
              }),
            ),
          ),
        ),
        deletable
          ? h(
              'button',
              {
                type: 'button',
                className: 'dtt-delete',
                title: t('delete'),
                'aria-label': t('delete'),
                onClick: (event) => {
                  event.stopPropagation()
                  onDelete(theme)
                },
              },
              '×',
            )
          : null,
      )
    }

    /** Card that hands the panel back to the application theme. */
    function FollowCard({ active, onSelect, t }) {
      const chips = [
        'var(--dsw-alias-bg-base)',
        'var(--dsw-alias-label-primary)',
        'var(--dsw-alias-state-error-primary)',
        'var(--dsw-alias-brand-primary)',
        'var(--dsw-alias-state-success-primary)',
        'var(--dsw-alias-state-warn-primary)',
      ]
      return h(
        'div',
        { className: 'dtt-cell' },
        h(
          'button',
          {
            type: 'button',
            className: 'dtt-card',
            'aria-pressed': active ? 'true' : 'false',
            onClick: () => onSelect(FOLLOW_ID),
          },
          h('span', { className: 'dtt-cardName' }, h('span', { className: 'dtt-cardNameText' }, t('follow'))),
          h(
            'span',
            { className: 'dtt-chips' },
            chips.map((color, index) =>
              h('span', {
                key: index,
                className: 'dtt-chip' + (index < 2 ? ' dtt-chipWide' : ''),
                style: { background: color },
              }),
            ),
          ),
        ),
      )
    }

    /** Terminal-panel mock used as a live preview of the selected theme. */
    function Preview({ theme }) {
      const color = (index) => {
        if (theme) return theme.ansi[index]
        switch (index) {
          case 4:
            return 'var(--dsw-alias-brand-primary)'
          case 2:
            return 'var(--dsw-alias-state-success-primary)'
          case 3:
            return 'var(--dsw-alias-state-warn-primary)'
          case 1:
            return 'var(--dsw-alias-state-error-primary)'
          default:
            return 'var(--dsw-alias-label-secondary)'
        }
      }
      const style = theme
        ? { background: theme.background, color: theme.foreground, borderColor: theme.background }
        : undefined
      return h(
        'div',
        {
          className: 'dtt-preview',
          'data-follow': theme ? 'false' : 'true',
          style,
          'aria-hidden': 'true',
        },
        h(
          'div',
          null,
          h('span', { style: { color: color(4) } }, 'dsh ~ % '),
          h('span', null, 'npm run build'),
        ),
        h(
          'div',
          null,
          h('span', { style: { color: color(2) } }, '✔ '),
          h('span', { style: { color: color(3) } }, 'dist/'),
          h('span', { style: { color: color(1) } }, ' 1 warning'),
          h('span', { style: { color: color(0) } }, '  0 errors'),
        ),
      )
    }

    /**
     * Settings page: pick a palette or import one.
     * @param {{ t: (key: string, params?: object) => string }} props - slot props.
     */
    function TerminalThemeSection({ t }) {
      const [revision, setRevision] = React.useState(0)
      const [draft, setDraft] = React.useState('')
      const [message, setMessage] = React.useState(null)
      const bump = React.useCallback(() => setRevision((value) => value + 1), [])

      React.useEffect(() => subscribe(bump), [bump])

      // `revision` is read so React keeps the render in sync with the store.
      void revision

      const themes = allThemes()
      const active = activeTheme()
      const customIds = new Set(state.custom.map((theme) => theme.id))

      const report = (error, text) => setMessage({ error, text })

      const doImport = (text) => {
        const result = parseThemeText(text, t)
        if (!result.ok) {
          report(true, result.error)
          return
        }
        const stored = addCustomTheme(result.theme)
        setDraft('')
        report(false, t('imported', { name: stored.name }))
      }

      const onFile = async (event) => {
        const file = event.target.files && event.target.files[0]
        event.target.value = ''
        if (!file) return
        try {
          doImport(await file.text())
        } catch (error) {
          report(true, t('fileFailed', { message: String(error?.message ?? error) }))
        }
      }

      const copyActive = async () => {
        if (!active) {
          report(true, t('nothingToCopy'))
          return
        }
        const json = {
          name: active.name,
          background: active.background,
          foreground: active.foreground,
          cursor: active.cursor,
          selection: active.selection ?? undefined,
          ansi: active.ansi,
          extended: active.extended ?? undefined,
        }
        try {
          await navigator.clipboard.writeText(JSON.stringify(json, null, 2))
          report(false, t('copied'))
        } catch (error) {
          report(true, t('copyFailed', { message: String(error?.message ?? error) }))
        }
      }

      return h(
        'div',
        { className: 'dtt-section' },
        h(
          'div',
          { className: 'dtt-header' },
          h('h2', { className: 'dtt-title' }, t('title')),
          h('p', { className: 'dtt-subtitle' }, t('subtitle')),
        ),
        h(Preview, { theme: active }),
        h(
          'div',
          { className: 'dtt-group' },
          h('div', { className: 'dtt-groupTitle' }, t('themes')),
          h(
            'div',
            { className: 'dtt-grid' },
            h(FollowCard, {
              key: FOLLOW_ID,
              active: state.activeId === FOLLOW_ID,
              onSelect: selectTheme,
              t,
            }),
            themes.map((theme) =>
              h(ThemeCard, {
                key: theme.id,
                theme,
                active: state.activeId === theme.id,
                deletable: customIds.has(theme.id),
                onSelect: selectTheme,
                onDelete: (target) => {
                  removeCustomTheme(target.id)
                  report(false, t('removed', { name: target.name }))
                },
                t,
              }),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dtt-group' },
          h('div', { className: 'dtt-groupTitle' }, t('importTitle')),
          h(
            'div',
            { className: 'dtt-import' },
            h('p', { className: 'dtt-hint' }, t('importHint')),
            h('textarea', {
              className: 'dtt-textarea',
              value: draft,
              placeholder: t('importPlaceholder'),
              spellCheck: false,
              onChange: (event) => setDraft(event.target.value),
            }),
            h(
              'div',
              { className: 'dtt-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dtt-btn',
                  'data-variant': 'primary',
                  onClick: () => doImport(draft),
                },
                t('importAction'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dtt-btn',
                  onClick: () => {
                    setDraft(JSON.stringify(TEMPLATE, null, 2))
                    setMessage(null)
                  },
                },
                t('fillTemplate'),
              ),
              h(
                'label',
                { className: 'dtt-btn dtt-file' },
                t('importFile'),
                h('input', { type: 'file', accept: '.json,application/json', onChange: onFile }),
              ),
              h('button', { type: 'button', className: 'dtt-btn', onClick: copyActive }, t('copyActive')),
            ),
            message ? h('p', { className: 'dtt-msg', 'data-error': message.error ? 'true' : 'false', role: 'status' }, message.text) : null,
            h('p', { className: 'dtt-hint' }, t('formatHint')),
          ),
        ),
        h('p', { className: 'dtt-foot' }, t('footNote')),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Plugin                                                             */
    /* ------------------------------------------------------------------ */

    const inject = ['slots', 'locale']

    /**
     * Install the scoped palette stylesheet and the Settings page.
     * @param {object} ctx - Client plugin context.
     */
    function apply(ctx) {
      const t = ctx.locale.bind(NS)

      ctx.effect(() => {
        const element = document.createElement('style')
        element.dataset.plugin = 'dsh-terminal-theme'
        element.dataset.dshTerminalTheme = 'palette'
        document.head.appendChild(element)
        paletteElement = element
        refreshPalette()
        return () => {
          element.remove()
          paletteElement = null
        }
      }, 'terminal-theme: palette')

      ctx.effect(() => {
        const element = document.createElement('style')
        element.dataset.plugin = 'dsh-terminal-theme'
        element.dataset.dshTerminalTheme = 'ui'
        element.textContent = UI_CSS
        document.head.appendChild(element)
        return () => element.remove()
      }, 'terminal-theme: page styles')

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'terminal-theme: copy')

      ctx.effect(
        () =>
          ctx.slots.inject('settings.section', () =>
            ctx.slots.register(
              {
                name: 'settings.section',
                id: 'terminal-theme',
                order: 30,
                label: () => t('nav'),
                locale: NS,
              },
              TerminalThemeSection,
            ),
          ),
        'terminal-theme: settings section',
      )
    }

    return { inject, apply }
  },
})
