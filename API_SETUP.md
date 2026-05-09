# MedIQ API Setup Guide

Your Healthinfo repo now has **backend API functions** that enable Groq AI and medical image search. Here's what you need to do:

## ✅ What's New

Two new **Cloudflare Pages Functions** have been added:
- `functions/api/chat.js` — Calls Groq API securely
- `functions/api/generate-diagram.js` — Calls Google Custom Search API for medical diagrams

## 🔑 Required API Keys

You need to set up **3 environment variables** in Cloudflare Pages:

### 1. **Groq API Key** (`GROQ_API_KEY`)
Get your free API key:
1. Go to https://console.groq.com
2. Sign up or log in
3. Create an API key (get 1M free tokens/month)
4. Copy the key

### 2. **Google Custom Search API Key** (`GOOGLE_API_KEY`)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Custom Search API"
4. Create an API key in "Credentials"
5. Copy the key

### 3. **Google Custom Search Engine ID** (`GOOGLE_SEARCH_CX`)
1. Go to [Google Custom Search](https://cse.google.com/cse/)
2. Create a new search engine
3. Choose "Search the entire web" (or specific medical sites)
4. Get your **Search engine ID** (the cx parameter)

## 📝 How to Set Environment Variables in Cloudflare Pages

### Option A: Cloudflare Dashboard (Easiest)
1. Go to **Cloudflare Pages** → Your Project
2. Settings → Environment variables
3. Add these 3 variables:
   - **GROQ_API_KEY** = [paste your Groq API key]
   - **GOOGLE_API_KEY** = [paste your Google API key]
   - **GOOGLE_SEARCH_CX** = [paste your search engine ID]
4. **Production**: Set for both Production and Preview
5. Save and redeploy

### Option B: Via `wrangler.toml` (If using Cloudflare CLI)
```toml
[env.production]
vars = { GROQ_API_KEY = "...", GOOGLE_API_KEY = "...", GOOGLE_SEARCH_CX = "..." }
```

## 🚀 How It Works

### Frontend (Browser)
- User clicks "Send" or types a question
- JavaScript sends request to `/api/chat`
- User sees Groq AI response

### Backend (Cloudflare Functions)
- Receives request from frontend
- Uses `GROQ_API_KEY` from environment to call Groq API
- Never exposes key to browser ✅
- Returns AI response

### Medical Images
- Same secure pattern for `/api/generate-diagram`
- Uses `GOOGLE_API_KEY` and `GOOGLE_SEARCH_CX`
- Finds medical diagrams and images

## ✨ Features That Now Work

✅ **Groq AI Responses**
- Type questions about anatomy, medical tech, health topics
- Get fast, accurate responses from Groq

✅ **Medical Diagrams**
- Automatically fetches diagrams when you ask questions
- Shows real medical images from Google Custom Search
- Displays sources (Mayo Clinic, CDC, NIH, etc.)

✅ **Quick Start Chips**
- Click any suggestion to get instant AI response

✅ **Google Search Integration**
- Click 🔍 button to search Google Custom Search

## 🐛 Troubleshooting

### "API not configured on server"
→ Check that all 3 environment variables are set in Cloudflare Pages

### "No images returned"
→ Your Google Search Engine might not be configured to search the web
→ Go to [cse.google.com](https://cse.google.com) and edit to search entire web

### "No response received"
→ Check Cloudflare Pages deployment logs for errors
→ Make sure `GROQ_API_KEY` is valid

## 🔒 Security Notes

✅ API keys stored **only in Cloudflare** (never in code)
✅ Browser never sees API keys
✅ All requests go through your backend functions
✅ Google Custom Search limits apply (~100 queries/day on free tier)

## 📚 Next Steps

1. Get the 3 API keys (Groq + Google)
2. Add them to Cloudflare Pages Environment Variables
3. Redeploy your site
4. Test: Ask "How does the heart work?" in MedIQ
5. Should see Groq response + medical diagrams

Questions? Check the console in browser DevTools (F12) for error messages.
