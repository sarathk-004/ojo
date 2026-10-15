# ojo security review (15 October 2026, version 1.0.23)

A self-review of the desktop app, written plainly. It is not a third-party penetration test. To report a problem, write to ojo.workspace.app@gmail.com.

## What is already solid
- **Every window is locked down:** `contextIsolation` on, `nodeIntegration` off, `sandbox` on, in all windows (widget, workspace, notch, reminders, quick capture). Web pages never get Node.
- **No remote code and no auto-update.** The app loads only its own files. Nothing is downloaded and run.
- **No accounts, no telemetry, no server of ours.** Data stays in `%APPDATA%\Taskit`. Network use is limited to links and icons the user asks for.
- **Safe file writes:** data is written to a temporary file and renamed, so a crash or a Windows update restart cannot leave a half-written file. Reminders missed while the app was closed catch up when it starts.
- **Navigation and pop-ups blocked:** windows cannot open new windows, and the workspace opens web links in the user's own browser only for `http(s)` links.
- **Stored file names are validated** (`fileId` accepts letters, digits and dashes only), so a request cannot escape the data folder.
- **Printing notes to PDF** runs in a separate window with scripts turned off.

## Fixed in this review
| Finding | Risk | Fix |
|---|---|---|
| No content security policy on the app's pages | A script injected through pasted or saved content could run or call out | A strict CSP on all five pages: own scripts only, no plugins, no forms, no frames except `https` |
| The workspace window could navigate to any `file:` page | A local file would load in a window that has the app bridge | It may now only load ojo's own pages; anything else is blocked or opened in the browser |
| Local files could be copied in by any path, including the app's own data | Reading unrelated or private files through the "save a file" bridge | Only documents, pictures, audio and video are accepted, and never files inside ojo's data folder |
| Downloads could target `localhost`, home-network or metadata addresses | The app could be made to probe a local network | Loopback, private-range and `.local` addresses are refused |
| Pop-ups and shortcuts could appear during exams, tests or screen shares | Interference, accidental cheating flags, leaked reminders | **Quiet mode** (tray, Settings): no notch, pop-ups, notifications or global shortcuts; automatic while another app is full screen, a presentation runs or Focus assist is on. Warned about at first run and in the Terms |

## Known limits (not fixed, and why)
- **Data is not encrypted at rest.** It is protected by the Windows account. Use BitLocker. An encrypted backup and an app lock are on the feature list.
- **The installer is not code-signed**, so Windows shows an "unknown publisher" warning. Signing needs a certificate the owner must buy.
- **The desktop helper installs a global mouse hook** (click positions only, never keys). Antivirus or proctoring software may flag any such hook. It is described in the Privacy Policy, and Quiet mode plus quitting from the tray is advised for proctored exams.
- **Build tools have known advisories** (`vite`, `postcss`, `browserslist`, `nanoid`, `source-map-js`, from `npm audit`). They are used only to build the app and are not shipped inside it. `vite` was updated to 6.4.4 in this release; run `npm audit` again for the rest.
- **The renderer can ask the main process to erase all data without the native confirmation** (the confirmation is the in-app "type confirm" box). Fine while the CSP holds.
- **Web pages saved as links** are fetched with the browser's network stack, so a malicious site can learn the user's address, as with any visit.

## If something goes wrong
- **After a Windows update or restart:** ojo starts again only if "Start with Windows" is on. Data is intact; reminders that came due catch up at launch.
- **Another app covers ojo, or ojo covers another app:** the widget sits on the desktop and is covered by apps. Only the notch, reminder pop-ups and quick capture float above other windows, and Quiet mode stops all three.
- **A pop-up is left open:** reminder and repeater pop-ups close by themselves (repeaters after 45 seconds); the notch tucks away when the cursor leaves.
