# LAN Notes

Shared notes app over a LAN. Run the server on one computer; phones, tablets and other PCs can access the same notes via browser or PWA. Changes sync in real time.

**Version:** 1.0.0

---

## What you need to add (before first run)

| Item | Action |
|------|--------|
| **`.env`** | Optional for basic run. If you want to change default login behaviour, copy `.env.example` to `.env` and set `LOGIN_USERNAME` and `LOGIN_PASSWORD`. |
| **`data/`** | The app uses `data/notes.json` for notes and creates it if missing. You can create an empty `data` folder; optional. |
| **`uploads/`** | Used for file attachments in notes. Created automatically when needed; you can add an empty `uploads/` folder if you like. |

No other files or folders are required. After `npm install`, run with `npm start` or `start.bat` (Windows).

---

## Requirements

- Node.js 18+

## Setup

```bash
npm install
```

## Run

On the machine that will act as the server:

```bash
npm start
```

Or on Windows double-click `start.bat`.

The server runs on **port 3370**. You’ll see something like:

- `Server: http://0.0.0.0:3370`
- `LAN:    http://YOUR_IP:3370`

## Login and users

- When you open the app you get a **login** page. If you don’t have an account, use **Sign up** to create one.
- **Remember me** keeps the session for a long time (e.g. 30 days) so you don’t have to log in again after closing the browser.
- Notes are **per user**: each user only sees and edits their own notes.
- Use **Logout** at the top to end the session.

## Access from LAN

1. Find the server machine’s LAN IP (e.g. Windows: `ipconfig` → “IPv4 Address”; macOS/Linux: `ifconfig` or `ip a`).
2. On other devices (phone, tablet, another PC) connect to the same Wi‑Fi/network.
3. In the browser open: `http://SERVER_IP:3370` (e.g. `http://192.168.1.100:3370`).

## PWA – Add to home screen

To open the app with one tap:

1. On phone or tablet open `http://SERVER_IP:3370` in the browser.
2. **Chrome/Edge (Android):** Menu (⋮) → “Add to home screen” or “Install app”.
3. **Safari (iOS):** Share → “Add to Home Screen”.

You’ll get a “LAN Notes” icon that opens like an app.

## Features

- Multiple notes: title, optional subheadings, and under each either text or file links.
- Notes without subheadings are supported.
- **Edit** and **Delete** per note.
- “Add file” uploads files; they appear as download links in the note.
- WebSocket sync: changes on one device appear immediately on other open tabs/devices.

## Data

- Notes: `data/notes.json`
- Uploaded files: `uploads/`

Data is kept across server restarts.
