# ojo

**Website: https://ojo-workspace.vercel.app**

**A calm, private home for your tasks, notes, plans, money and saved things. Free, and it lives entirely on your computer.**

ojo is a desktop app with a small widget that sits on your desktop like a clock and a full workspace behind it. There is no account, no cloud, no tracking and nothing to pay for. Anyone can download it and use it for free.

> **Platform:** Windows 10/11 (64-bit) today. A Mac version is planned, with its own notch behaviour (see [Mac plan](#mac-plan)).

## Everything stays on your device

- Your data is stored in files in your own user profile. It is never uploaded, and the app has no server of its own.
- No sign-up, no analytics, no crash reports, no ads, no AI and no cloud sync.
- ojo goes online only when you save or open a link, and then it talks straight to that website to read the title, preview picture or icon. Nothing is sent to the publisher.
- **Export my data** and **Erase all data** are in Settings, so you always hold the keys.
- The Privacy Notice and Terms ship with the app and are shown on first run (also in [`legal/`](legal)).

## Features

**The desktop widget**
- Stays attached to the desktop like a clock; other apps simply cover it.
- Today, Upcoming, Anytime and Daily lists. Add a task inline, drag to reorder, double-click to rename, click for a note.
- Collapses to a small icon at the nearest screen edge and expands again from the same spot.
- Daily habits with a completion calendar, streaks and a progress graph for each one.
- Reminders in side cards with Done, Snooze 10 min and Dismiss.

**The workspace** (open it from the widget, the tray, or the notch)
- **Tasks:** repeat daily, weekly, every N days or monthly; subtasks; overdue helpers; a "Close the day" review; bulk select with Undo.
- **Planner:** a 24-hour timeline. Drag tasks onto it; events, bills, focus sessions and repeaters show alongside.
- **Focus:** a timer that keeps running with the window closed. Type minutes or minutes:seconds (`25`, `1:30`). Sessions are logged per task.
- **Repeaters:** water, walking and any recurring nudge you add.
- **Weekly review:** Monday to Sunday numbers from your real records, plus a page to write your own review.
- **Notes:** a block editor with a `/` menu (headings, to-dos, tables, kanban boards, toggles, code with syntax highlighting, images, callouts, sub-pages), templates, covers and icons, and export to Markdown or PDF.
- **Calendar:** events, birthdays, interviews, bills and tasks in one place.
- **Saved:** links, images, code and files, sorted by what they are, with a read-later queue, favourites and trash.
- **PDFs:** a built-in reader with remembered position, a bookmark ribbon, and highlights in four colours with notes.
- **Finance:** income, spending and savings, budgets with alerts, charts, CSV export, and statement import (bank/PhonePe PDF, CSV, Google Pay) parsed on your computer.
- **Bills:** subscriptions and EMIs with service logos, due-date notifications, and one-click "Paid" into Finance.
- **Job tracker:** a drag-and-drop pipeline from Wishlist to Offer, with timelines, notes and follow-up dates.
- **Search everything** (`Ctrl+K`) across all of the above.
- **Quick capture** (`Ctrl+Shift+Space` from anywhere): type a line and choose Task, Note or Saved.
- Light and dark themes, or follow Windows.

**The notch**
- A hidden strip on a screen edge. Rest the cursor on it or drag something to it, then drop links, images, code or PDFs to file them in Saved.
- Click it to open or close the workspace. Lost it? A small marker shows at its edge, **Ctrl+Alt+N** brings it out, and the tray menu has **Show the notch**.
- **Move it anywhere:** press and drag the notch to any edge of the screen (top, bottom, left or right) and along it. It always opens away from the edge it is on, so it never goes off-screen, and it remembers where you left it.

- **Quiet mode** (tray icon or Settings): before an exam, a proctored test or a screen share, it holds back every pop-up, notification, shortcut and the notch. It also switches on by itself while another app is full screen.

## Download

**[Download ojo for Windows (.exe)](../../releases/latest/download/ojo-Setup-1.0.24-x64.exe)**

1. Click the link above and open the file when it finishes downloading.
2. If Windows shows a blue "Windows protected your PC" box, click **More info**, then **Run anyway**. This appears because the installer is not code-signed yet; the app is the same one you can read in this repository.
3. Click **Install**. ojo starts when it is done. Open it later from the Start menu.

No account, no other software needed. Windows 10 or 11, 64-bit. All releases are on the [Releases](../../releases) page.

## Website

The site is live at https://ojo-workspace.vercel.app (deployed with Vercel; every push to main redeploys the `site` folder). A one-page site for ojo lives in [`site/`](site). It is plain HTML, CSS and JavaScript (GSAP for the motion), so any static host can serve it, for example GitHub Pages. Run it locally with `python -m http.server 5180 --directory site`.

## Build from source

You need Node.js 20+ and Windows (the desktop helper is a small Windows program).

```bash
npm install
npm run dev        # browser preview of the interface
npm run desktop    # run the Electron app
npm test           # unit tests
npm run installer  # build the Windows setup .exe
```

Built with Electron, React, Vite, GSAP, pdf.js, highlight.js and Phosphor Icons. See Settings, then Legal, for the full open-source notices.

## Mac plan

ojo is built for Windows right now. The core app (widget, workspace, data) is plain Electron and web code, so a Mac build is feasible, but the Windows-only desktop helper has to be replaced on macOS and nothing has been built or tested there yet.

On Windows the notch can already be dragged to any screen edge. On a Mac that same edge-docking will matter most, because many Macs have a physical camera notch at the top centre: you will be able to park ojo wherever suits you (top edge, left or right end) and it will only ever sit on an edge. Every other function stays the same.

## Contact

Questions, problems or security reports: ojo.workspace.app@gmail.com.

## Licence

Free for personal use. See [`legal/LICENSE.txt`](legal/LICENSE.txt) and [`legal/PRIVACY.txt`](legal/PRIVACY.txt).
