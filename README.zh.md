# dsh-terminal-theme

[English](README.md) | 中文

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**终端面板**换配色：选一个内置主题，或从 JSON 导入自己的主题。颜色只作用于终端面板，DSH 其余界面继续使用当前主题。

## 特性

- **只改终端**：所有规则都限定在终端面板子树内，侧边栏、对话区和设置页仍然读取 DSH 的主题 token。
- **不受亮暗切换影响**：应用在亮色/暗色之间切换时，终端保持自己选定的配色。
- **可导入**：粘贴 JSON 或选择文件导入，导入时校验并规整格式，主题保存在浏览器里。
- **可完全还原**：选「跟随应用主题」即恢复 DSH 默认外观，其余设置一概不动。

## 安装

用 DSH 原生的**插件页**安装：**添加插件** → 粘贴一个 spec → **安装**。以下三种都可用：

| Spec | 适用场景 |
| --- | --- |
| `dsh-terminal-theme` | 包发布到 npm 之后 |
| `https://github.com/wnanbei/dsh-terminal-theme` | 直接从 GitHub 装；pnpm 克隆仓库，无需构建 |
| `/Users/wnanbei/code/dsh-terminal-theme` | 从本地 clone 装，之后继续改代码（装成 `link:` 依赖） |

对话框还接受 tarball、`git+https://…` 地址，以及只为这一次安装指定 registry。没有声明 bundle patch 的包会被拒绝，所以仓库根目录必须始终是一个完整可装的包。

本地目录安装会把该目录软链进当前 profile（`~/.dsh/profiles/<profile>/node_modules/dsh-terminal-theme`），之后在 clone 里改动，重载页面即生效，不用重新打包；从 GitHub 安装则是把包复制进 profile，更新需要先卸载再重装。两种方式下，已安装的包都会被识别为“已安装”，要换安装来源请先卸载。

```bash
git clone https://github.com/wnanbei/dsh-terminal-theme.git
```

> Agent 走的是同一个操作：`plugin_manager` 的 `install_bundle`，参数填上面任意一个 spec。

## 使用

1. 打开右侧终端面板，进入**设置 → 终端配色**。
2. 在**颜色主题**里点选一张卡片，终端立即改用该配色。
3. 选**跟随应用主题**即可恢复默认（含亮/暗切换）。

导入主题：

- 在**导入颜色主题**里粘贴 JSON 后点**导入并应用**，或点**从文件导入**选择 `.json` 文件。
- **填入模板**会写入一份可直接修改的完整示例。
- **复制当前主题**把当前配色导出为 JSON，改个名字再导入就是新主题。
- 自定义主题卡片右上角的 `×` 用于删除。

主题保存在本机浏览器（`localStorage`），不写入 profile 配置，因此不会随 DSH 升级丢失，也不会同步到其他浏览器。

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
| `name` | 是 | 显示名，1–60 个字符 |
| `background` / `foreground` | 是 | 终端底色与默认文字色 |
| `cursor` | 否 | 光标色，默认取 `foreground` |
| `selection` | 否 | 选区底色，默认取 `foreground` 的 30% |
| `ansi` | 是 | 16 个颜色：黑、红、绿、黄、蓝、洋红、青、白，再接 8 个亮色。也可只写 8 个，亮色沿用前 8 个 |
| `extended` | 否 | 最多 240 个颜色，对应 256 色里的 16–255 |

颜色必须写成十六进制（`#rgb` 或 `#rrggbb`，会统一规整为小写 `#rrggbb`）；其他写法在导入时会被拒绝，并在页面上显示原因。

## 实现说明

- 所有规则都限定在 `[data-sidebar-terminal]` 子树内：在这个子树重新绑定 `--dsw-alias-bg-base`、`--dsw-alias-label-primary`，并覆盖 xterm DOM 渲染器的 `.xterm-fg-N` / `.xterm-bg-N` 规则，不会改动 DSH 全局主题 token。
- 不替换、不包裹终端组件，也不读写终端的私有状态；取消选择时只是移除注入的样式表。
- 终端自带的 OSC 颜色处理、对比度调整、光标可见性逻辑均保持原样。
- 新增内置主题只需在 `client.js` 的 `BUILTINS` 里追加一项；其余主题走设置页导入即可。

## 内置主题

Dracula、Nord、Solarized Dark / Light、Gruvbox Dark、One Dark、Tokyo Night、Catppuccin Mocha、GitHub Light。

## 开发

```
client.js   浏览器半：限定作用域的配色样式表 + 设置页
index.js    Host 半：空实现，仅用于注册 bundle 行
locale/     插件管理器里的显示名与描述
icon.svg    插件图标
```

改完 `client.js` 后重载页面即可：插件管理器的安装记录指向本目录，不需要重新安装。

## License

MIT
