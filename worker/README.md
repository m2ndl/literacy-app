# Saving progress across devices

Learners can sign in with Google, and their progress follows them between their phone, laptop
and campus computers. Until you finish this setup, the app works exactly as before: progress stays
on each device and the sign-in option is hidden.

You need about 15 minutes, a Google account and a free Cloudflare account. No command line is
needed.

## How it works

- Progress is always saved on the device first, so the app keeps working offline.
- When a learner is signed in, the app copies their progress to a small server (`worker/index.js`,
  a Cloudflare Worker with a D1 database) and merges in work from their other devices. Completed
  lessons are combined, points and learning time are added up per device, and "reset progress"
  wins everywhere.
- To keep traffic low, the app saves after a short pause in activity (not after every answer). It
  only checks the server when the app is opened or brought back on screen.
- The server stores the learner's Google account ID, email address and progress, nothing else.
  Learners can delete their data from the app (menu → حفظ التقدم على كل أجهزتك).

## 1. Create the Google sign-in client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project, e.g.
   "my2ndlang".
2. Open **Google Auth Platform** (called "OAuth consent screen" in older consoles) and click
   **Get started**:
   - App name: `لغتي الثانية`, user support email: yours.
   - Audience: **External**.
   - Contact email: yours. Accept the policy and create.
3. Under **Audience**, click **Publish app** so any Google account can sign in. The app only asks
   for name and email (`openid email profile`), so Google doesn't need to review it. If you add a
   logo, Google will ask to verify your brand first.
4. Under **Clients**, click **Create client**:
   - Application type: **Web application**.
   - Authorized JavaScript origins: your site's address, e.g. `https://m2ndl.github.io`.
   - Authorized redirect URIs: the exact address of the app, ending in `/`, e.g.
     `https://m2ndl.github.io/literacy-app/`.
   - Click **Create** and copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

## 2. Create the database

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Storage & databases** → **D1 SQL
   database** → **Create database**. Name it `literacy-sync`.
2. Open the database → **Console** tab. Paste the whole contents of `worker/schema.sql` and click
   **Execute**.

## 3. Create the Worker

1. In Cloudflare, go to **Compute (Workers)** → **Workers & Pages** → **Create** → **Create
   Worker** (start from "Hello World"). Name it `literacy-sync` and click **Deploy**.
2. Click **Edit code**. Delete everything in the editor, paste the whole contents of
   `worker/index.js`, and click **Deploy**.
3. Go back to the Worker → **Settings** → **Bindings** → **Add** → **D1 database**:
   variable name `DB`, database `literacy-sync`. Save.
4. **Settings** → **Variables and Secrets** → **Add** (type: Text) for each:
   - `GOOGLE_CLIENT_ID`: the Client ID from step 1.
   - `ALLOWED_ORIGINS`: your site's address, e.g. `https://m2ndl.github.io`. Separate several with
     commas. Add `http://localhost:8080` if you also test locally.
5. Copy the Worker's address shown at the top, e.g. `https://literacy-sync.your-name.workers.dev`.
   Opening it in a browser should show `{"ok":true,"service":"literacy-sync"}`.

## 4. Turn it on in the app

Put both values in `sync-config.js`:

```js
export const SYNC_API_URL = 'https://literacy-sync.your-name.workers.dev';
export const GOOGLE_CLIENT_ID = '1234-abcd.apps.googleusercontent.com';
```

Commit and publish the site. The menu now shows **☁️ حفظ التقدم على كل أجهزتك**. Learners who
have started a lesson also see a sign-in suggestion on the home screen, which they can dismiss.

To check it works: sign in on your phone, finish an activity, then sign in on a computer with the
same Google account. The computer shows the same progress.

## Updating the server later

When `worker/index.js` changes, paste the new version into the Worker editor again and click
**Deploy**. When `worker/schema.sql` changes, run it again in the D1 console. It only adds what's
missing.

## Command-line alternative (Wrangler)

If you prefer the command line, fill in `worker/wrangler.toml`, then from the `worker/` folder:

```sh
npx wrangler d1 create literacy-sync          # copy the database_id into wrangler.toml
npx wrangler d1 execute literacy-sync --remote --file=schema.sql
npx wrangler deploy
```

## Costs

Cloudflare's free plan allows 100,000 Worker requests and 100,000 database writes per day. A
learner typically makes one request when opening the app and about one per finished activity, so a
15-minute session uses roughly 5–15 requests. That covers several thousand learners a day. Beyond
that, the Workers Paid plan costs $5 per month.

## Troubleshooting

- **Google shows "redirect_uri_mismatch"**: the redirect URI in step 1.4 must match the app's
  address exactly, including `https://` and the final `/`.
- **Sign-in returns to the app but says it couldn't sign in**: check `GOOGLE_CLIENT_ID` in the
  Worker matches `sync-config.js`. The Worker's logs (Worker → Logs) show the reason.
- **Nothing happens / network errors in the browser console**: `ALLOWED_ORIGINS` must contain
  your site's address exactly (no path, no trailing `/`).
