# 📚 Study Buddy

Track your study progress, build streaks, stay accountable.

## Features

- 🔥 **Streak Tracking** — Days in a row with study activity
- 🔒 **Phase Locking** — Can't skip ahead (80% completion required)
- ⏰ **Deadline Countdown** — Visual pressure to stay on track
- 😤 **Shame Banner** — Miss 2+ days? You'll know.
- 📝 **Hour Logging** — Track actual study time
- 🏆 **Leaderboard** — Compete with teammates
- 📧 **Email Reminders** — Daily notification if you skip a day
- 📊 **Group Digest** — Daily email to every enrolled user showing everyone's streak/status side-by-side, so slacking is visible to the whole group, not just hidden in a private inbox
- 💬 **WhatsApp Reminders** (optional, via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/), free) — Daily WhatsApp DM to each person with the group's streaks
- 💾 **Offline Mode** — Works without internet (localStorage fallback)

## Stack

- **Frontend**: HTML / CSS / JavaScript (hosted on GitHub Pages)
- **Backend**: Google Apps Script (Web App)
- **Database**: Google Sheets (3 tabs: Users, Progress, Activity)
- **Notifications**: Google Apps Script MailApp (daily trigger)

## Setup

### 1. Google Sheet
1. Create a new Google Sheet
2. Open **Extensions > Apps Script**
3. Paste the contents of `google-apps-script.gs`
4. Click **Deploy > New Deployment > Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL

### 2. Connect Frontend
1. Open `app.js`
2. Replace `API_URL = ""` with your Web App URL
3. Commit and push

### 3. Email Reminders
In Apps Script, go to **Triggers** (clock icon) and click **Add Trigger** — do this TWICE, once per function below. Neither fires until you click through this manually; pushing code to GitHub does not create triggers.
1. Function: `sendDailyReminders` — Time-driven, Day timer, 9pm to 10pm
2. Function: `sendGroupDigest` — Time-driven, Day timer, 9pm to 10pm

`sendGroupDigest` emails every enrolled user (who has an email on file) the full group's streaks and who has/hasn't studied today — this is the real peer-pressure mechanism, since private reminders alone are easy to ignore.

### 4. WhatsApp Reminders (optional, free)

Each person who wants this does it once, themselves:
1. Save the CallMeBot WhatsApp number as a contact — check the **current** number at [callmebot.com/blog/free-api-whatsapp-messages](https://www.callmebot.com/blog/free-api-whatsapp-messages/) since it changes occasionally.
2. Send that contact the WhatsApp message: `I allow callmebot to send me messages`
3. CallMeBot replies with an API key.
4. Send the sheet owner: your WhatsApp number (digits only, with country code, no `+`) and that API key.

The sheet owner then:
1. Opens the **Users** tab and adds two new column headers: `whatsapp_phone` (column L) and `whatsapp_apikey` (column M).
2. Fills in each person's phone + key as they send it in. Rows left blank are silently skipped — partial rollout is fine, no one is forced to opt in.
3. Adds the `sendWhatsAppReminders` trigger (see step 3 above).

This DMs each person individually — CallMeBot can't post into your actual WhatsApp group chat (no free/official method can). It's unofficial and could break or rate-limit without notice; if that happens, the email digest keeps working regardless since it's independent.

### 4. GitHub Pages
1. Push to GitHub
2. Go to **Settings > Pages**
3. Source: **main** branch, root `/`
4. Your app is live!

## Offline Mode

The app works **without** the Google Sheets backend. If `API_URL` is empty, all data is stored in `localStorage`. Perfect for testing or personal use.

## Roadmap

The `roadmap.json` contains a 6-month study plan:
1. **Month 1** — Python + DSA Foundation
2. **Month 2** — DSA Intermediate + FastAPI
3. **Month 3** — Databases + System Design + Docker
4. **Month 4** — AI/ML Skills (LangChain, RAG)
5. **Month 5** — Portfolio + Mock Interviews
6. **Month 6** — Job Hunt Sprint
