# Obsidian Secret Notes

[中文文档](README.zh.md)

Save private content in Obsidian with a `secret` code block. The plugin renders the block as a clickable secret card; after encryption, only ciphertext JSON is stored in your note, and plaintext is shown temporarily only after the correct password is entered.

- 🔒 Local encryption: your password never leaves your device and is never stored.
- 🧩 Minimal card UI: plaintext blocks show an unlock icon, encrypted blocks show a lock icon, and clicking the card starts the next action.
- ✍️ After decrypting, you can edit the title, password hint, and body, then re-encrypt the block in place.
- 🖼️ Encrypted images: encrypt PNG/JPEG/GIF/WebP images into external ciphertext files via the `secretimage` code block, and view them inline after unlocking.
- 🔎 Built-in editor search: click the search icon in the plaintext editor, or select text and press `Ctrl+F` to search quickly.
- ⚙️ The processed code block name is configurable in plugin settings. The default is `secret`.

## Quick start

Create a `secret` code block in any note:

<pre>
```secret
Put private content here
```
</pre>

<pre>
```secret
{"v":1,"title":"","hint":"","encrypted":"<iv>:<tag>:<ciphertext>","date":"2026-07-04T00:00:00.000Z"}
```
</pre>
These two blocks will be rendered like:

![secret-and-cleartext](assets/secret-and-cleartext.png)


Click the locked card again and enter the password to view or edit the plaintext.
- The unlock icon means the block is still plaintext. Click it to start encryption.
- The lock icon means the block is encrypted. Click it to enter the password and view/edit the content.

### Password input

![input-password](assets/input-password.png)


After clicking an encrypted card, a password modal opens:

- Enter the correct password to open the plaintext editor.
- If a password hint was saved during encryption, it appears in the password input placeholder.
- Plaintext is never shown when the password is incorrect.

### Plaintext editor

![cleartext-edtor](assets/cleartext-edtor.png)

After verification, the plaintext editor opens:

- Use the search bar in the upper-right corner to search the body; previous/next navigation is supported, and jumped matches flash for easier positioning.
- Click **Decrypt permanently** and confirm the second-click prompt to write plaintext back into the `secret` code block. You can encrypt it again later by clicking the plaintext card.


## Encrypted images

Besides text, images can be encrypted with the `secretimage` code block. The ciphertext is stored outside the note — in `.secretimage/<uuid>.secretimg` at the vault root — so large images never bloat the note file.

Workflow:

1. Create an empty `secretimage` code block:

   <pre>
   ```secretimage
   ```
   </pre>

2. Click the card to pick a PNG/JPEG/GIF/WebP file (up to 20MB), set a password/title/hint, and the plugin encrypts the image bytes and writes the ciphertext file. The block then stores only a JSON reference:
   <pre>
   ```secretimage
   {"v":1,"title":"","hint":"","date":"…","image":{"name":"<uuid>.secretimg","ext":"png"}}
   ```
   </pre>
3. Click the locked card and enter the password — the image is decrypted in memory and rendered inline inside the block.
4. **Re-lock** collapses it back to the locked card; **Decrypt permanently** exports the original image as a normal vault attachment, replaces the block with a standard embed (e.g. `![[image.png]]`), and moves the ciphertext file to trash.

> ⚠️ **The `.secretimage/` folder is essential.** It holds the image ciphertext and is a hidden dot-folder. Sync/backup tools must include it (Obsidian Sync ignores hidden folders unless explicitly selected), otherwise the images can never be recovered. Do not rename or edit files inside it manually.
>
> Deleting a `secretimage` code block does **not** delete its ciphertext file; you can remove orphaned `.secretimg` files by hand.

## Operations

| Action              | Entry point                                                                      | Result                                                                                     |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Encrypt             | Click a plaintext card                                                           | Enter password and confirmation password, then encrypt and write back to the current block |
| View / Edit         | Click an encrypted card                                                          | Enter password to open the plaintext editor, where title, hint, and body can be changed    |
| Save again          | **Confirm** in the plaintext editor                                              | Re-encrypt with the current password and overwrite the original block                      |
| Decrypt permanently | **Decrypt permanently** in the plaintext editor                                  | After second-click confirmation, write plaintext back into the `secret` code block         |
| Search body         | Search in the upper-right of the plaintext editor, or press `Ctrl+F` in the body | Find, navigate, and flash-highlight matches inside the text area                           |
| Add image           | Click an empty `secretimage` card                                                | Pick a PNG/JPEG/GIF/WebP file (≤ 20MB), set a password, and encrypt it                     |
| Unlock image        | Click a locked `secretimage` card                                                | Enter the password to render the image inline                                              |
| Re-lock image       | **Re-lock** under the unlocked image                                             | Collapse back to the locked card                                                           |
| Export image        | **Decrypt permanently** under the unlocked image                                 | Export as a normal attachment, embed it in the note, and trash the ciphertext file         |

> Write-back behavior: in source / Live Preview editing state, the current editor block is replaced directly; in Reading view, the file is modified through the Obsidian vault API.

## Settings

Open **Settings → Community plugins → Secret Notes** to change **Block name**.

The default block name is `secret`. It cannot be set to `secretimage`, which is reserved for encrypted image blocks. If you change it to `private`, for example, the plugin will process:

<pre>
```private
Private content
```
</pre>

## Encryption details

- Algorithm: **AES-256-GCM**, executed locally through the Web Crypto API.
- Key: derived from the password with SHA-256. It is not stored or uploaded.
- Storage format: encrypted block content is JSON containing version, title, password hint, ciphertext, and encryption date.
- Images use the same AES-256-GCM pipeline; the ciphertext lives in `.secretimage/<uuid>.secretimg` (about 1.37× the original size due to base64 encoding), while the block keeps only the JSON reference. Supported formats: PNG/JPEG/GIF/WebP, up to 20MB. The image format is verified from the file's magic bytes, not its file name.

> ⚠️ Passwords cannot be recovered. If you forget the password, the ciphertext cannot be restored. The password hint should be only a reminder; do not put the actual password in it.

## Known limitations

- No automatic cleanup: deleting a `secretimage` code block leaves the `.secretimg` ciphertext file behind.
- Image picking only reads from disk; selecting an existing vault image is not supported yet.
- The `secretimage` block name is fixed and not configurable.

## Installation

### Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from this repository's build output or Release.
2. Place them into your Obsidian vault:
   ```
   <vault>/.obsidian/plugins/obsidian-secret-notes/
   ```
3. In Obsidian, open **Settings → Community plugins** and enable **Secret Notes**.

## Development

The entry point is `src/main.ts`, and build artifacts are written to `dist/`.

```bash
pnpm install
pnpm build      # build into dist/
pnpm dev        # watch mode
```

Build output includes:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

Copy these three files into `.obsidian/plugins/obsidian-secret-notes/` in your vault to load and debug the plugin in Obsidian.

## License

[MIT](LICENSE) © 2026 Kasukabe Tsumugi
