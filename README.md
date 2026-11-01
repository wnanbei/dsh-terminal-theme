# dsh-terminal-theme

> Give the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) terminal panel its own color scheme — scoped to the terminal only, never the rest of DSH — and import new palettes from JSON.

给 DSH 的**终端面板**单独设置配色：DSH 其余界面继续使用当前主题，终端可以选内置主题或导入自己的 JSON 主题。

## 安装

把仓库 clone 到本地任意目录，然后在 DSH 的插件管理器里以该目录作为本地 bundle 安装：

```bash
git clone https://github.com/wnanbei/dsh-terminal-theme.git
```

安装后 DSH 会以软链方式把这个目录接入当前 profile（`~/.dsh/profiles/<profile>/node_modules/dsh-terminal-theme`），仓库里的改动下次重载页面即可生效，不需要重新打包。

> 发布到 npm 之后也可以直接 `pnpm add dsh-terminal-theme` 后再在插件列表里启用。

## 使用

1. 打开右侧终端面板，进入「设置 → 终端配色」。
2. 在「颜色主题」卡片里点选一个主题，终端面板立即改为该配色。
3. 选「跟随应用主题」即可完全恢复默认（终端重新跟随 DSH 主题，含亮/暗切换）。

导入自定义主题：

- 在「导入颜色主题」里粘贴 JSON，点「导入并应用」；或点「从文件导入」选择 `.json` 文件。
- 「填入模板」会写入一份可直接修改的完整示例。
- 「复制当前主题」把当前配色导出为 JSON，改个名字即可再导入，作为新主题。
- 自定义主题卡片右上角的 `×` 可删除。

主题保存在本机浏览器（`localStorage`），不写入 profile 配置，所以不会随 DSH 升级丢失，也不会同步到其他浏览器。

## 主题 JSON 格式

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

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 1–60 个字符的显示名 |
| `background` / `foreground` | 是 | 终端底色与默认文字色 |
| `cursor` | 否 | 光标色，默认取 `foreground` |
| `selection` | 否 | 选区底色，默认取 `foreground` 的 30% |
| `ansi` | 是 | 16 个颜色，顺序为 黑/红/绿/黄/蓝/洋红/青/白 后接 8 个亮色；只写 8 个时亮色沿用前 8 个 |
| `extended` | 否 | 最多 240 个颜色，对应 256 色里的 16–255 |

颜色必须写成十六进制（`#rgb` 或 `#rrggbb`，会统一规整为小写 `#rrggbb`）；其他写法在导入时会被拒绝并提示原因。

## 实现说明

- 所有规则都限定在 `[data-sidebar-terminal]` 子树内：在这个子树重新绑定 `--dsw-alias-bg-base`、`--dsw-alias-label-primary`，并覆盖 xterm DOM 渲染器的 `.xterm-fg-N` / `.xterm-bg-N` 规则，因此不会改动 DSH 全局主题 token。
- 不替换、不包裹终端组件，也不读写终端的私有状态；取消选择时只是移除这些样式，终端立即回到 DSH 默认外观。
- 终端插件自带的 OSC 颜色查询、对比度调整、光标可见性等行为保持不变。
- 新增主题只需在 `client.js` 的 `BUILTINS` 里追加一项，或直接用设置页导入。

## 内置主题

Dracula、Nord、Solarized Dark / Light、Gruvbox Dark、One Dark、Tokyo Night、Catppuccin Mocha、GitHub Light。

## 开发

```
client.js   浏览器半（配色样式 + 设置页）
index.js    Host 半（空实现，仅用于注册 bundle 行）
locale/     插件管理器与设置导航的显示名
icon.svg    插件图标
```

改完 `client.js` 后在 DSH 里重载页面即可看到效果；插件管理器的安装记录指向本目录，无需重新安装。

## License

MIT
