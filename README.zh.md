# Obsidian Secret Notes

[English](README.md)

在 Obsidian 里用 `secret` 代码块保存私密内容。插件会把代码块渲染成可点击的秘密卡片；加密后，笔记文件中只保留密文 JSON，明文只会在输入正确密码后临时显示在编辑窗口里。

- 🔒 本地加密：密码不会离开你的设备，也不会被保存。
- 🧩 极简卡片界面：明文块显示解锁图标，密文块显示锁定图标，点击卡片即可进入下一步。
- ✍️ 解密后可直接编辑标题、密码提示和正文，并重新加密写回原代码块。
- 🖼️ 加密图片：通过 `secretimage` 代码块把 PNG/JPEG/GIF/WebP 图片加密为外部密文文件，解锁后在块内直接查看。
- 🔎 编辑器内置搜索：在明文编辑区可点击搜索图标，或选中文本后按 `Ctrl+F` 快速查找。
- ⚙️ 可在插件设置中修改要识别的代码块名称，默认是 `secret`。

## 快速开始

在任意笔记中创建一个 `secret` 代码块：

<pre>
```secret
这里写需要保护的内容
```
</pre>

<pre>
```secret
{"v":1,"title":"","hint":"","encrypted":"<iv>:<tag>:<ciphertext>","date":"2026-07-04T00:00:00.000Z"}
```
</pre>
这两个代码块会被渲染成：

![secret-and-cleartext](assets/secret-and-cleartext.png)


再次点击锁定卡片，输入密码即可查看或编辑明文。
- 解锁图标表示当前代码块仍是明文，点击后进入加密流程。
- 锁定图标表示当前代码块已经加密，点击后输入密码查看和编辑。

### 输入密码

![input-password](assets/input-password.png)


点击已加密卡片后，会弹出密码输入窗口：

- 输入正确密码后打开明文编辑器。
- 如果加密时填写了密码提示，提示会显示在密码输入框的 placeholder 中。
- 密码错误时不会展示任何明文内容。

### 明文编辑器

![cleartext-edtor](assets/cleartext-edtor.png)

验证通过后会打开明文编辑器：

- 右上角搜索栏可查找正文内容；支持上一个 / 下一个跳转，点击跳转时会闪烁定位。
- 点击 **永久解密** 并二次确认后，会把明文写回 `secret` 代码块中。之后可再次点击明文卡片重新加密。


## 加密图片

除了文本，图片也可以通过 `secretimage` 代码块加密。密文存放在笔记之外 —— vault 根目录的 `.secretimage/<uuid>.secretimg` —— 大图片不会撑爆笔记文件。

操作流程：

1. 创建一个空的 `secretimage` 代码块：

   <pre>
   ```secretimage
   ```
   </pre>

2. 点击卡片，从磁盘选择一张 PNG/JPEG/GIF/WebP 图片（上限 20MB），设置密码/标题/提示后，插件会把图片字节加密并写入密文文件。代码块里只保留 JSON 引用：
   <pre>
   ```secretimage
   {"v":1,"title":"","hint":"","date":"…","image":{"name":"<uuid>.secretimg","ext":"png"}}
   ```
   </pre>
3. 点击锁定卡片输入密码，图片会在内存中解密并直接在块内渲染显示。
4. **重新上锁** 收起回锁定卡片；**永久解密** 会把原图导出为 vault 内的普通附件、用标准嵌入（如 `![[image.png]]`）替换代码块，并把密文文件移入回收站。

> ⚠️ **`.secretimage/` 文件夹至关重要。** 它保存着图片密文，且是隐藏点文件夹。同步 / 备份工具必须包含它（Obsidian Sync 默认忽略隐藏文件夹，需要显式选择），否则图片将永远无法恢复。不要手动改名或编辑其中的文件。
>
> 删除 `secretimage` 代码块**不会**删除对应的密文文件，孤儿 `.secretimg` 文件可以手动清理。

## 操作一览

| 操作     | 入口                                        | 结果                                             |
| -------- | ------------------------------------------- | ------------------------------------------------ |
| 加密        | 点击明文卡片                                | 输入密码和确认密码后，将明文加密写回当前代码块   |
| 查看 / 编辑 | 点击密文卡片                                | 输入密码后打开明文编辑器，可修改标题、提示和正文 |
| 重新保存    | 明文编辑器中的 **确认**                     | 使用当前密码重新加密并覆盖原代码块             |
| 永久解密    | 明文编辑器中的 **永久解密**                 | 二次确认后把明文写回 `secret` 代码块           |
| 搜索正文    | 明文编辑器右上角搜索，或在正文中按 `Ctrl+F` | 在文本框内查找、跳转并闪烁定位匹配项           |
| 添加图片    | 点击空的 `secretimage` 卡片                 | 选择 PNG/JPEG/GIF/WebP 图片（≤ 20MB），设置密码后加密 |
| 解锁图片    | 点击锁定的 `secretimage` 卡片               | 输入密码后在块内直接渲染图片                    |
| 重新上锁    | 解锁图片下的 **重新上锁**                   | 收起回锁定卡片                                  |
| 导出图片    | 解锁图片下的 **永久解密**                   | 导出为普通附件并嵌入笔记，密文文件移入回收站    |

> 写回行为：在源码 / Live Preview 编辑状态下会直接替换当前编辑器中的代码块；在阅读视图中会通过 Obsidian vault API 修改文件。

## 设置

在 **Settings → Community plugins → Secret Notes** 中可以修改 **块名称**。

默认块名称是 `secret`。不能设置为 `secretimage`，该名称已保留给加密图片块。如果改成其他名称，例如 `private`，插件之后会处理：

<pre>
```private
需要保护的内容
```
</pre>

## 加密细节

- 算法：**AES-256-GCM**，通过 Web Crypto API 在本地执行。
- 密钥：由密码经 SHA-256 派生，不会存储或上传。
- 存储格式：加密后的代码块内容是 JSON，包含版本、标题、密码提示、密文和加密时间。
- 图片与文本使用同一套 AES-256-GCM 流程；密文存放在 `.secretimage/<uuid>.secretimg`（base64 编码后约为原图的 1.37 倍），代码块里只保留 JSON 引用。支持 PNG/JPEG/GIF/WebP，上限 20MB。图片格式通过文件魔数校验，不信任文件扩展名。

> ⚠️ 密码无法找回。忘记密码后，密文内容无法恢复。密码提示只应填写能帮助你回忆的线索，不要直接写入密码本身。

## 已知限制

- 无自动清理：删除 `secretimage` 代码块后，对应的 `.secretimg` 密文文件会保留。
- 添加图片只支持从磁盘选择，暂不支持选取 vault 内已有图片。
- `secretimage` 块名固定，不可配置。

## 安装

### 手动安装

1. 下载本仓库构建产物或 Release 中的 `main.js`、`manifest.json`、`styles.css`。
2. 放入你的 Obsidian vault：
   ```
   <vault>/.obsidian/plugins/obsidian-secret-notes/
   ```
3. 打开 Obsidian：**Settings → Community plugins**，启用 **Secret Notes**。

## 开发

入口文件是 `src/main.ts`，构建产物输出到 `dist/`。

```bash
pnpm install
pnpm build      # 构建到 dist/
pnpm dev        # watch 模式
```

构建结果包括：

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

将这三个文件复制到 vault 的 `.obsidian/plugins/obsidian-secret-notes/` 中即可在 Obsidian 里加载调试。

## License

[MIT](LICENSE) © 2026 Kasukabe Tsumugi
