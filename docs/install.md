# Installing Atarashii (New) Tab Page

This extension is a Manifest V3 extension and is not (yet) required to be
packaged as a `.crx`. There are two ways to get it onto your Chromium-based
browser (Chrome, Edge, Brave, Opera, Vivaldi, Arc, …):

- **Unzipped version** – the built `dist/` folder (or any extracted copy of it)
- **Zipped version** – the `atarashii-new-tab.zip` release artifact, which you
  extract before loading

Both approaches install the extension in "developer mode". The steps are
identical across Chromium browsers; only the extensions page URL differs.

| Browser  | Extensions page        |
| -------- | ---------------------- |
| Chrome   | `chrome://extensions`  |
| Chromium | `chrome://extensions`  |
| Edge     | `edge://extensions`    |
| Brave    | `brave://extensions`   |
| Opera    | `opera://extensions`   |
| Vivaldi  | `vivaldi://extensions` |
| Arc      | `arc://extensions`     |

> New tabs are replaced immediately. After installing, open a new tab
> (`Ctrl+T` / `Cmd+T`) and you should see Atarashii replace the default new
> tab page.

---

## Before you start

You need one of the following:

- **The latest release zip** – download `atarashii-new-tab.zip` from the
  [releases page](https://github.com/cf12/atarashii-tab/releases). Its contents
  are the built extension with `manifest.json` at the root of the archive.
- **A freshly built `dist/` folder** – build it yourself from source:

  ```sh
  bun install
  bun run build
  ```

  The build output is written to `dist/`. To also produce a zip (and a `.crx`)
  for manual distribution, run:

  ```sh
  bun run build:crx
  ```

  which writes `atarashii-new-tab.zip` and `atarashii-new-tab.crx` to the
  project root.

---

## Installing the unzipped version

This method points the browser directly at an **unzipped folder** that contains
`manifest.json` in its root.

1. Build the extension (see above) so you have the `dist/` folder, or extract
   the release zip to a folder of your choice. For example:

   ```sh
   unzip atarashii-new-tab.zip -d atarashii-new-tab
   ```

   The folder now contains `index.html`, `manifest.json`, `assets/`, and
   `icons/`.

2. Open the extensions page for your browser (see the table above), e.g.
   `chrome://extensions`.

3. Toggle **Developer mode** to **on** (top-right corner).

4. Click **Load unpacked**.

5. In the file picker, select the extension folder — the one that directly
   contains `manifest.json` (e.g. `dist/` or the extracted
   `atarashii-new-tab` folder).

6. The extension appears in the list. Open a new tab to confirm it loaded.

> Keep the folder where it is — the browser reads from that location. If you
> move or delete it, reload the extension (the circular arrow icon on its card).

---

## Installing the zipped version

Chromium browsers load extensions from a **folder**, not directly from a
`.zip`. The release zip is therefore extracted first, then loaded with the same
"Load unpacked" flow.

1. **Extract** the zip somewhere you can keep it:

   ```sh
   unzip atarashii-new-tab.zip -d atarashii-new-tab
   ```

   The extracted folder contains `manifest.json` at its root.

2. Open the extensions page (e.g. `chrome://extensions`).

3. Toggle **Developer mode** to **on**.

4. Do one of the following:

   - Click **Load unpacked** and select the extracted `atarashii-new-tab`
     folder, **or**
   - **Drag and drop** the extracted folder (or the `.zip` file itself, in
     newer Chrome/Edge versions) onto the extensions page.

5. Confirm the install prompt, then open a new tab to verify.

> Drag-and-drop of the raw `.zip` is supported in recent Chrome and Edge
> versions, but extracting and using **Load unpacked** is the most reliable
> method across all Chromium browsers.

---

## Installing via the command line (testing/automation)

If you only need a temporary install (e.g. for testing), you can point
Chromium at the unzipped folder directly:

```sh
google-chrome --load-extension=/path/to/atarashii-new-tab
# or
chromium --load-extension=/path/to/atarashii-new-tab
```

This launches a fresh browser window with the extension loaded. Note that
`--load-extension` only applies to unzipped folders — not to `.zip`/`.crx`
files.

---

## Updating

Replace the loaded folder's contents with the files from the newer release,
then click the **reload** icon on the extension's card on the extensions page
(you may need to toggle Developer mode first).

---

## Troubleshooting

- **"Manifest is not valid" / load error** — the selected folder doesn't
  contain `manifest.json` at its root. Re-extract the zip and select the inner
  folder that directly contains `manifest.json` (don't pick a parent that wraps
  it in an extra directory).

- **New tab page is unchanged** — the extension may not have taken over the
  new tab. Try opening a fresh tab; if it still shows the default page, remove
  the extension and load it again. You can also pin the extension via the
  puzzle-piece icon in the toolbar to verify it's installed.

- **Images don't load / "No images found"** — the extension fetches from
  Reddit. Reddit may be rate-limiting or blocking the request; wait a while and
  open a new tab again. This is not an install problem.
