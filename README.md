# Obsidian Secret Notes

Keep sensitive content in Obsidian inside a `` ```secret `` fenced code block, encrypted with a password. Once encrypted, only ciphertext is written to the file — the plaintext is revealed only after entering the correct password.

- 🔒 Local encryption — your password never leaves your device
- 📝 Encrypted blocks can be edited, re-keyed, or permanently decrypted back to plaintext at any time
- 🖥️ Works on both desktop and mobile (Obsidian ≥ 1.5.0)

## Quick Start

Write a `secret` code block in any note and put the content you want to protect inside it:

<pre>
```secret
some sensitive content
```
</pre>

In reading view or live preview, it renders as a card:

- **Not encrypted** (yellow badge): click **Encrypt**, enter a password (plus an optional title and password hint), and the plaintext is encrypted back into the same block.
- **Encrypted** (green badge): shows the title and encryption date, with **Edit**, **Decrypt permanently**, and **Change password** actions.

## Operations

| Action              | Entry point                                  | Flow                                                                                                                                           |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Encrypt             | **Encrypt** on an unencrypted card           | Enter password + confirm (optional title, hint) → plaintext is encrypted and saved back                                                        |
| Edit / View         | **Edit** on an encrypted card                | Verify password → edit title / hint / plaintext in a form → re-encrypt and save back                                                           |
| Change password     | **Change password** on an encrypted card     | Verify old password → set a new password → re-encrypt with the new password                                                                    |
| Decrypt permanently | **Decrypt permanently** on an encrypted card | Verify password → decrypt to plaintext, **placed back inside the `secret` fence** (returns to the unencrypted state, ready to be re-encrypted) |

> Write-back: in source / live-preview mode the editor is modified directly; in reading view the file is written via `vault.modify` — so the ciphertext always lands back in the file.

## How Encryption Works

- Algorithm: **AES-256-GCM** (authenticated encryption), performed locally via the Web Crypto API.
- Key: derived from your password with SHA-256. It is **never stored or uploaded**.
- Storage format: the code block content is a JSON object:
  ```json
  {
    "v": 1,
    "title": "optional title",
    "hint": "optional password hint",
    "encrypted": "<base64(iv)>:<base64(tag)>:<base64(ciphertext)>",
    "date": "encryption timestamp"
  }
  ```

> ⚠️ Because the password is not stored, **ciphertext cannot be recovered if the password is forgotten**. Use a strong password and keep it safe. The password hint is shown as a placeholder in the password field — don't put the password itself in the hint.

## Installation

### Manual install

1. Download the latest release from the [GitHub repository](https://github.com/baendlorel/).
2. Place `main.js`, `manifest.json`, and `styles.css` into your vault at:
   ```
   <vault>/.obsidian/plugins/obsidian-secret-notes/
   ```
3. In Obsidian, open **Settings → Community plugins**, disable safe mode, and enable **Secret Notes**.

## Development

The entry point is `src/main.ts`; build artifacts are written to `dist/`.

```bash
pnpm install
pnpm build      # one-shot build into dist/
pnpm dev        # watch mode
```

The build produces:

- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`

Copy those three files into your vault's `.obsidian/plugins/obsidian-secret-notes/` to load and debug the plugin in Obsidian.

## License

[MIT](LICENSE) © 2026 Kasukabe Tsumugi
