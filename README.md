# 🌿 NutriPlan — Smart Diet Tracker

A clean, modern diet tracking web app to log your daily food intake, track calories & macros, and manage your personal food library.

## ✨ Features

- **Weekly Calendar** — Navigate days and view your food log per day
- **My Foods Library** — Save your regular foods once with nutrition per 100g
- **Smart Logging** — Pick a food from your library, enter grams → calories & macros auto-calculated
- **Meal Sections** — Separate logs for Breakfast, Lunch, Pre-workout & Dinner
- **Dashboard** — Real-time calorie ring + protein/carbs/fats progress bars
- **Copy Previous Day** — Instantly duplicate yesterday's meals
- **Goals Settings** — Set your own daily calorie & macro targets
- **Data persists** in browser localStorage (no account needed)

## 🚀 Getting Started

### Static (no server)
Just open `index.html` in a browser — or deploy directly to Netlify/Vercel.

### With Node.js backend
```bash
npm install
node server.js
```
Open `http://localhost:3000`

## 🗂️ Project Structure

```
├── index.html       # App structure & modals
├── app.js           # All logic (state, rendering, events)
├── style.css        # Styling & animations
├── server.js        # Express + SQLite backend (optional)
└── package.json     # Dependencies
```

## 🌐 Deployment

| Platform | Steps |
|---|---|
| **Netlify** | Import GitHub repo → Build: blank, Publish dir: `.` |
| **Vercel** | Import GitHub repo → Framework: Other, Output: `.` |

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend (optional):** Node.js, Express, SQLite (`better-sqlite3`)
- **Storage:** Browser `localStorage` (static) or SQLite DB (server mode)
- **Icons:** Font Awesome · **Font:** Inter (Google Fonts)
