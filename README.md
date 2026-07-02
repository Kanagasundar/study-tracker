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
1. In Apps Script, go to **Triggers** (clock icon)
2. Click **Add Trigger**:
   - Function: `sendDailyReminders`
   - Event source: **Time-driven**
   - Type: **Day timer**
   - Time: **9pm to 10pm**

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
