---
title: Ghostty + Yazi 现代终端配置指南
author: 52coder
pubDatetime: 2026-04-24T10:00:00.000Z
modDatetime: 2026-11-08T00:00:00+08:00
slug: ghostty-yazi-terminal-setup
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - terminal
  - ghostty
  - yazi
  - tools
description: 介绍如何配置 Ghostty GPU 加速终端和 Yazi 终端文件管理器，包含完整的快捷键说明和实用技巧。
---

![Forrest Gump Fake Quote](@/assets/images/forrest-gump-quote.png)

## Table of contents

## 工具介绍

这份配置面向 macOS 和 Zsh：用 Ghostty 打开终端、分屏看日志，用 Yazi 浏览文件和预览内容。两个工具各做一件事，可以分别安装。

- **Ghostty**，GPU 加速终端模拟器，支持分屏、标签页、Quake 下拉终端
- **Yazi**，基于 Rust 的快速终端文件管理器，支持预览图片/视频/PDF

如果经常在几个项目目录之间切换，可以再加 Zoxide。Oh My Zsh 不是使用这两个工具的前提。

## 安装

```bash
# Ghostty
brew install ghostty

# Yazi 及预览依赖
brew install yazi ffmpegthumbnailer poppler

# Zoxide
brew install zoxide

# Oh-My-Zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Zsh 插件
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

字体推荐使用 [Maple Mono NF CN](https://github.com/subframe7536/maple-font)，支持中文和 Nerd Font 图标。

## Ghostty 配置

本文沿用 `~/.config/ghostty/config`。新版还支持 `config.ghostty`，macOS 的 `~/Library/Application Support/com.mitchellh.ghostty/` 也可能有配置；同时存在时要注意加载顺序和覆盖。可先用 `Cmd + ,` 打开实际配置，再对照 [Ghostty 配置文档](https://ghostty.org/docs/config)。

```toml
# 字体
font-family = "Maple Mono NF CN"
font-size = 15
font-thicken = true
adjust-cell-height = 6

# 主题
theme = Kanagawa Wave

# 窗口
background-opacity = 1
macos-titlebar-style = transparent
window-padding-x = 14
window-padding-y = 10

# 光标
cursor-style = bar
cursor-style-blink = true

# 鼠标
mouse-hide-while-typing = true
copy-on-select = clipboard

# Quake 下拉终端
quick-terminal-position = top
quick-terminal-screen = mouse
quick-terminal-autohide = true
quick-terminal-animation-duration = 0.15
keybind = global:ctrl+grave_accent=toggle_quick_terminal

# 性能
scrollback-limit = 25000000
```

## Ghostty 快捷键

> 以下基于 Ghostty **1.3.1** 的默认键位（用 `ghostty +list-keybinds --default` 可自查），`Cmd` 对应配置里的 `super`。

### 标签页 & 窗口

| 快捷键                  | 功能                                  |
| ----------------------- | ------------------------------------- |
| `Cmd + T`               | 新建标签页                            |
| `Cmd + N`               | 新建窗口                              |
| `Cmd + W`               | 关闭当前分屏 / 面板                   |
| `Cmd + Option + W`      | 关闭当前标签页                        |
| `Cmd + Shift + W`       | 关闭当前窗口                          |
| `Cmd + Shift + T`       | 撤销关闭（重开刚关掉的标签页 / 分屏） |
| `Cmd + 1`~`8`           | 跳到第 1~8 个标签页                   |
| `Cmd + 9`               | 跳到**最后一个**标签页（不是第 9 个） |
| `Cmd + Shift + [` / `]` | 上一个 / 下一个标签页                 |
| `Cmd + Enter`           | 切换全屏                              |

macOS 上标签页是系统原生标签栏，外观与行为跟 Safari、Finder 一致，支持拖拽重排。

### 分屏

| 快捷键                | 功能                                                 |
| --------------------- | ---------------------------------------------------- |
| `Cmd + D`             | 向右分屏                                             |
| `Cmd + Shift + D`     | 向下分屏                                             |
| `Cmd + [` / `]`       | 上一个 / 下一个分屏（循环切焦点）                    |
| `Cmd + Option + ←→↑↓` | 按方向切换分屏焦点                                   |
| `Cmd + Ctrl + ←→↑↓`   | 调整分屏大小                                         |
| `Cmd + Ctrl + =`      | 均等化所有分屏                                       |
| `Cmd + Shift + Enter` | 分屏缩放（最大化 / 还原，相当于 tmux 的 prefix + z） |

⚠️ **切标签页和切分屏的区别，关键在 Shift**：`Cmd + Shift + [` `]` 切**标签页**，去掉 Shift 的 `Cmd + [` `]` 切**分屏焦点**，两者都在 `[` `]` 键上，靠 Shift 区分（不是花括号与方括号之分）。

### 搜索 & 滚动历史

| 快捷键                        | 功能                                           |
| ----------------------------- | ---------------------------------------------- |
| `Cmd + F`                     | 在 scrollback 里搜索（1.3 新增原生搜索）       |
| `Cmd + G` / `Cmd + Shift + G` | 跳到下一个 / 上一个匹配                        |
| `Cmd + E`                     | 以当前选中内容为关键词搜索                     |
| `Esc` / `Cmd + Shift + F`     | 退出搜索                                       |
| `Cmd + ↑` / `↓`               | 跳到上一个 / 下一个命令提示符（需 shell 集成） |
| `Cmd + Home` / `End`          | 滚到顶部 / 底部                                |
| `Cmd + PageUp` / `PageDown`   | 上翻 / 下翻一页                                |

### 剪贴板 & 字体

| 快捷键                            | 功能                            |
| --------------------------------- | ------------------------------- |
| `Cmd + C` / `Cmd + V`             | 复制 / 粘贴                     |
| `Cmd + Shift + V`                 | 粘贴上次选中的内容（selection） |
| `Cmd + A`                         | 全选                            |
| `Cmd + K`                         | 清屏                            |
| `Cmd + +` / `Cmd + -` / `Cmd + 0` | 增大 / 缩小 / 重置字体          |

### 配置 & CLI

| 快捷键             | 功能                                       |
| ------------------ | ------------------------------------------ |
| `Cmd + ,`          | 打开配置文件                               |
| `Cmd + Shift + ,`  | 重载配置；部分选项只影响新窗口，或需要重启 |
| `Cmd + Shift + P`  | 命令面板（搜索所有动作并顺带看其快捷键）   |
| `Cmd + Option + I` | 终端 Inspector（调试渲染 / 按键）          |

### 1.3 版本的几个更新

- **原生 scrollback 搜索**：以前只能靠 tmux 或“导出文本再搜”绕，现在 `Cmd + F` 直接搜回滚缓冲，上面那张搜索表就是它的完整键位。
- **原生滚动条**与**可点击的 shell 提示符光标**：配合 shell 集成，可直接用鼠标点提示符定位。
- 觉得默认分屏键不够直观，可以用方向符号重绑：

```toml
keybind = cmd+shift+|=new_split:right
keybind = cmd+shift+-=new_split:down
```

## Quake 下拉终端

配置好下面的绑定后，按下全局快捷键 `Ctrl + `` ` ``（反引号，数字 1 左边的键），无论当前在哪个应用，都会从屏幕顶部滑出一个终端窗口；再按一次收起。

- **默认不绑定快捷键**：Ghostty 没给 Quick Terminal 预设键，需在 config 里加 `keybind = global:ctrl+grave_accent=toggle_quick_terminal`（上面的配置已包含）
- `global:` 全局快捷键要到“系统设置 → 隐私与安全性 → 辅助功能”给 Ghostty 授权后才生效
- 失去焦点自动隐藏（`quick-terminal-autohide = true`）
- 跟随鼠标所在屏幕（`quick-terminal-screen = mouse`）

## Yazi 文件管理器

### 启动方式

推荐在 `~/.zshrc` 中添加 `y` 包装函数：

```bash
function y() {
    local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
    yazi "$@" --cwd-file="$tmp"
    if cwd="$(command cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
        builtin cd -- "$cwd"
    fi
    rm -f -- "$tmp"
}
```

`yazi` 是子进程，不能直接改变父 shell 的工作目录。这个 `y` 函数让 Yazi 将最后停留的位置写入临时文件，再由 shell 执行 `cd`。所以下面的退出行为以通过 `y` 启动为前提，见 [Yazi 官方说明](https://yazi-rs.github.io/docs/quick-start/)。

### 退出

| 按键 | 效果                                         |
| ---- | -------------------------------------------- |
| `q`  | 退出，Shell **跟随跳转**到 Yazi 最后所在目录 |
| `Q`  | 退出，Shell **保持原目录**不变               |

### 目录快速跳转

在 `~/.config/yazi/keymap.toml` 中配置常用目录的快捷键：

```toml
[[manager.prepend_keymap]]
on = ["g", "h"]
run = "cd ~"
desc = "Go to home directory"

[[manager.prepend_keymap]]
on = ["g", "c"]
run = "cd ~/.config"
desc = "Go to config directory"

[[manager.prepend_keymap]]
on = ["g", "d"]
run = "cd ~/Downloads"
desc = "Go to downloads"

[[manager.prepend_keymap]]
on = ["g", "w"]
run = "cd ~/work"
desc = "Go to work directory"

[[manager.prepend_keymap]]
on = ["g", "D"]
run = "cd ~/Desktop"
desc = "Go to desktop"
```

| 快捷键 | 跳转目标      |
| ------ | ------------- |
| `g h`  | `~` 家目录    |
| `g c`  | `~/.config`   |
| `g d`  | `~/Downloads` |
| `g w`  | `~/work`      |
| `g D`  | `~/Desktop`   |
| `g t`  | `/tmp`        |

## Zoxide 智能跳转

Zoxide 记录你的访问历史，输入目录名的一部分即可跳转：

```bash
# 替代 cd，模糊匹配历史记录中包含 "work" 的目录
z work

# 交互式选择（需要安装 fzf）
zi work
```

在 `~/.zshrc` 末尾添加初始化：

```bash
eval "$(zoxide init zsh)"
```

## 配置文件汇总

| 文件                         | 用途           |
| ---------------------------- | -------------- |
| `~/.config/ghostty/config`   | Ghostty 主配置 |
| `~/.config/yazi/yazi.toml`   | Yazi 主配置    |
| `~/.config/yazi/keymap.toml` | Yazi 快捷键    |
| `~/.config/yazi/theme.toml`  | Yazi 主题      |
| `~/.zshrc`                   | Shell 配置     |

修改配置后先尝试 `Cmd + Shift + ,` 重载。若没有变化，检查是否有另一份配置覆盖了当前值，再查看该选项是否需要新建窗口或重启。

## 配好后做一次小练习

开一个分屏，在一边运行 `y`，进入项目目录后按 `q` 退出，再运行 `pwd`，确认 shell 跟到了该目录。另一边保留命令或日志，练习只切换分屏焦点，避免误切标签页。

如果文件图标显示为方框，检查实际生效的字体；某类文件无法预览时，检查 Yazi 对应的预览依赖。快捷键没反应则先打开命令面板确认动作存在，再核对自定义绑定和系统快捷键冲突。
