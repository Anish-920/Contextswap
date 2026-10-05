# ContextSwap

AI-powered workspace & browser context manager. Captures your open tabs, uses an AI
model (Grok or Gemini, with a built-in offline fallback) to group them into named
workspaces, and lets you restore any workspace — every tab, exactly as it was — in
one click.

Three parts, in this repo:

```
contextswap/
├── server/      Express + MongoDB REST API, JWT auth, AI classification
├── client/      React + Tailwind dashboard (view, search, restore, analytics)
└── extension/   Chrome extension (Manifest V3) — captures tabs, talks to the API
```

## 1. Backend (`server/`)

**Requires:** Node.js 18+, a running MongoDB instance (local or Atlas).

```bash
cd server
npm install
cp .env.example .env
# edit .env — set MONGODB_URI at minimum
npm run dev        # nodemon, or `npm start` for plain node
```

The API listens on `http://localhost:5000` by default. Health check: `GET /api/health`.

### AI classification

Set `GROK_API_KEY` or `GEMINI_API_KEY` in `.env` to use a real LLM for tab
classification. If neither is set, `services/aiClassifier.js` automatically falls
back to a built-in domain/keyword heuristic (GitHub → "Development", Gmail →
"Email & Communication", YouTube → "Video & Streaming", etc.) so the whole app
works out of the box with zero API keys.

## 2. Dashboard (`client/`)

**Requires:** Node.js 18+.

```bash
cd client
npm install
cp .env.example .env   # points at the API, defaults to http://localhost:5000/api
npm run dev
```

Opens at `http://localhost:5173`. Register an account, then either add a
workspace manually or (more realistically) save one from the extension — it'll
show up here immediately.

## 3. Chrome Extension (`extension/`)

No build step — it's plain HTML/CSS/JS.

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` folder
4. Pin the ContextSwap icon to your toolbar

By default the extension talks to `http://localhost:5000/api` (see `DEFAULT_API_BASE`
in `background.js` / `popup.js`) — make sure the backend is running before you
open the popup. Log in or register from the popup, then:

- **Save Tabs** — captures every open tab in the current window, sends it to the
  backend, which classifies it with AI and stores it as a new workspace.
- **Search** — filters your saved workspaces by name, tab title, or URL.
- **Restore** — reopens every tab from a saved workspace in a new window and
  logs the restore for analytics.
- **Delete** — removes a workspace permanently.

## How it fits together

```
Chrome Extension  →  POST /api/workspaces/capture  →  Express API
                                                          │
                                                          ▼
                                              AI Classifier (Grok/Gemini
                                              or offline heuristic fallback)
                                                          │
                                                          ▼
                                                      MongoDB
                                                          │
                                                          ▼
                                              React Dashboard (view/search/
                                              restore/analytics via REST API)
```

## API reference (summary)

| Method | Path                        | Auth | Description                          |
|--------|-----------------------------|------|---------------------------------------|
| POST   | `/api/auth/register`        | —    | Create account, returns JWT           |
| POST   | `/api/auth/login`           | —    | Log in, returns JWT                   |
| POST   | `/api/workspaces/capture`   | ✔    | Submit raw tabs → AI-classified save  |
| GET    | `/api/workspaces?q=`        | ✔    | List / search workspaces              |
| GET    | `/api/workspaces/:id`       | ✔    | Get one workspace                     |
| POST   | `/api/workspaces`           | ✔    | Create workspace manually             |
| PUT    | `/api/workspaces/:id`       | ✔    | Rename / edit tabs                    |
| DELETE | `/api/workspaces/:id`       | ✔    | Delete workspace                      |
| POST   | `/api/workspaces/:id/restore` | ✔  | Log a restore event                   |
| GET    | `/api/analytics/summary`    | ✔    | Dashboard stats & charts data         |

All authenticated routes expect `Authorization: Bearer <token>`.

## Notes & next steps

- Passwords are hashed with bcrypt; JWTs expire per `JWT_EXPIRES_IN` (default 7 days).
- The Mongoose `Workspace` schema has a text index on `name`, `tabs.title`, and
  `tabs.url` for search.
- Not yet implemented (see the deck's "Future Scope"): cross-browser builds
  (Firefox/Edge/Safari), team collaboration, predictive suggestions, voice
  commands, offline sync. The architecture (REST API + service-oriented layers)
  is set up to add these incrementally.
