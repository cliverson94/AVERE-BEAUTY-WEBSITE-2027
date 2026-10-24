# Avere Beauty website — Vercel setup

Private preview: every page sends "noindex" and robots.txt blocks crawlers, so Google won't list it.

## 1. Put the files on GitHub (10 min)
1. Go to github.com/cliverson94/AVERE-BEAUTY-WEBSITE-2027
2. Click "uploading an existing file".
3. Drag in everything inside this folder (including the assets folder). Click "Commit changes".

## 2. Connect Vercel (5 min)
1. Go to vercel.com and sign up with your GitHub account.
2. Click "Add New… → Project", pick AVERE-BEAUTY-WEBSITE-2027, click "Import".
3. Framework preset: "Other". Leave build settings empty. Click "Deploy".
4. You get a private link like avere-beauty-website-2027.vercel.app. Share it with staff.

Every later upload to GitHub updates the site automatically.

## 3. Optional: lock the preview with a password
Vercel → Project → Settings → Deployment Protection. Password protection needs the Pro plan ($20/month).

## 4. Launch v1 on pghbotox.com
1. Vercel → Project → Settings → Domains → add pghbotox.com and www.pghbotox.com (later: averebeauty.com the same way).
2. Vercel shows 2 DNS records. Add them where the domain is registered (Wix: Domains → Manage DNS).
3. Delete robots.txt, and remove the "headers" block from vercel.json, so Google can index the site.
4. Set SITE_URL = https://pghbotox.com in Environment Variables, then Redeploy.
5. Submit https://pghbotox.com/sitemap.xml in Google Search Console.
6. Studio: add studio.pghbotox.com (CNAME) and add it to the Google sign-in origins.

Old Wix URLs (e.g. /botox-1, /about-us) redirect to the new pages automatically — see vercel.json.

---

# Avere Studio (back end) — setup, about 20 minutes

Studio lives at studio.averebeauty.com (and at /studio on the vercel.app link for testing). Visitors never see it; it requires Google sign-in.

## A. Turn on storage in Vercel (2 clicks each)
1. Vercel → your project → Storage → Create → **Blob**. Connect it to the project. (Stores the photos and clips.)
2. Storage → Create → **Upstash for Redis** (free plan). Connect it to the project. (Stores labels, alt text and the team list.)

## B. Create the Google sign-in key (10 min)
1. Go to console.cloud.google.com, signed in as info@averebeauty.com. Create a project called "Avere Studio".
2. APIs & Services → OAuth consent screen → External → app name "Avere Studio", your email → Save.
3. Credentials → Create credentials → OAuth client ID → Web application.
4. Authorized JavaScript origins: add https://studio.averebeauty.com and your https://….vercel.app link.
5. Copy the Client ID.

## C. Add settings in Vercel → Settings → Environment Variables
- SESSION_SECRET = any long random text (e.g. 40+ random letters and numbers)
- STUDIO_PASSWORD = one password for all owner logins (info@averebeauty.com, sophie@averebeauty.com, frankudavcak@gmail.com). Simplest option.
- (Optional instead) STUDIO_LOGINS = email:password,email:password for separate passwords
  (owners sign in with these; use strong passwords, no commas or colons)
- (Google sign-in, optional later: GOOGLE_CLIENT_ID — step B)
- ANTHROPIC_API_KEY = optional, turns on "Write with AI" alt text (console.anthropic.com)
Then Deployments → ⋯ → Redeploy.

## D. Point the subdomain
Vercel → Settings → Domains → add studio.averebeauty.com → add the CNAME record it shows at your domain registrar.

## Roles
- Owners (STUDIO_OWNERS): everything, including delete, approvals and the Team tab.
- Freelancers: added in Studio → Team with an expiry date. Can upload and label; uploads say "Needs approval" until an owner approves. Access ends automatically.

## What happens to each upload
- Photos are resized to 2400px max and converted to WebP in the browser before upload (usually 90–95% smaller). Location/camera data (EXIF/GPS) is stripped.
- A 640px thumbnail is made for fast browsing.
- The file is renamed from its labels, e.g. tattoo-removal-deka-toro-lawrenceville-avere-beauty-x7k2.webp.
- Alt text is pre-filled from the labels; edit it or use "Write with AI".
- Exact duplicates are detected and skipped.
- Clips must be under 1 minute and 60 MB; a poster frame is saved as the thumbnail.
- "Copy embed code" gives an <img> tag with alt, width, height and lazy loading.

---

# Updating the site with GitHub Desktop (one-time setup, 10 min)
1. Install GitHub Desktop (desktop.github.com) and sign in.
2. File → Clone repository → AVERE-BEAUTY-WEBSITE-2027 → choose a folder (e.g. Documents/Avere Website).
3. Each time you get an update from Claude: unzip it, copy everything into that folder, say "Replace" when asked.
4. In GitHub Desktop, type a short note (e.g. "New specials page") → **Commit to main** → **Push origin**.
Vercel publishes it in about a minute. Only changed files are sent.

# Everyday edits without GitHub
Sign in at studio.averebeauty.com → **Edit pages**. Text, buttons, photos, FAQs, specs, section order and SEO save to the database.
- Changes save as a draft automatically.
- **Publish** makes them live for everyone within ~10 seconds. Freelancers can save drafts but can't publish.
- Currently editable: Tattoo Removal. More pages are added the same way.

---

# Leads (Resend email + Twilio text)
Every form on the site posts to /api/lead. Each lead is saved in Studio → Leads, emailed to the office, and the client gets a confirmation email.

## Resend (email) — 15 min
1. resend.com → Domains → Add domain → **averebeauty.com**. Add the DNS records it shows (SPF, DKIM) where averebeauty.com's DNS is managed. Wait for "Verified".
   (If averebeauty.com isn't ready, use pghbotox.com instead and set LEADS_FROM to an @pghbotox.com address.)
2. Resend → API Keys → Create (Sending access). Copy it.
3. Vercel → Settings → Environment Variables:
   - RESEND_API_KEY = the key
   - LEADS_FROM = Avere Beauty <leads@averebeauty.com>
   - LEADS_TO = info@averebeauty.com
   - STUDIO_URL = https://pghbotox.com (used for the "Open Studio" link in alerts)

## Twilio (front desk text) — optional
US texting needs A2P 10DLC registration in Twilio first (usually 1–2 weeks).
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (your Twilio number, +1412…)
- LEADS_SMS_TO = +14129527592 (comma-separate several numbers)

# Claude in Studio (owners only)
- ANTHROPIC_API_KEY = key from console.anthropic.com (add billing; set a spend limit there too)
- AI_MONTHLY_CAP_USD = 20 (Studio stops Claude at this amount each month)
- For layout/code changes: GITHUB_TOKEN = a fine-grained token from github.com → Settings → Developer settings → Personal access tokens → Fine-grained → only the AVERE-BEAUTY-WEBSITE-2027 repo → Permissions: Contents **Read and write**, Deployments **Read**. Set expiry to 1 year.
- Vercel → Settings → Git: make sure Preview deployments are on (default). Test links use them.

Text/SEO fixes become a draft you publish from Edit pages. Code fixes go to a private test branch → test link → you click Go live → Undo is available. Claude can never change api/, vercel.json, package.json, Studio, Page Editor or tracking files.

Redeploy after adding settings.

# Send leads to LIPS
- LIPS_WEBHOOK_URL = the URL in LIPS that accepts new leads (webhook / API endpoint)
- LIPS_API_KEY = its key, if it needs one (sent as "Authorization: Bearer …")
- LIPS_API_HEADER = only if LIPS wants a different header name, e.g. x-api-key
Each lead is sent as JSON: id, created_at, form, name, first_name, last_name, phone (+1…), email, interest, office, fields.

# SEO, favicon and share images
Studio → SEO edits each page's Google headline, description and cover image, plus the site favicon and default share image. Pages are served through /api/render so Google and iMessage/Facebook previews see them in the HTML. Changes show within ~5 minutes.
- SITE_URL = https://www.averebeauty.com (used for canonical links; set it when the domain moves)

# Blog
Posts live in blog-posts.json. URLs: /blog and /post/<slug>. Each post ships with Article and FAQ structured data for Google.

# 11’s Day waitlist → Google Sheets
1. Create a Google Sheet named "11’s Day Waitlist". Add headers in row 1: Submitted, Year, Name, Phone, Email, Office, Interest, Notes, Added to waitlist.
2. Extensions → Apps Script. Paste:
```
function doPost(e){var d=JSON.parse(e.postData.contents);if(d.secret!==PropertiesService.getScriptProperties().getProperty('SECRET'))return ContentService.createTextOutput('no');
SpreadsheetApp.getActive().getSheets()[0].appendRow([d.created_at,d.year,d.name,d.phone,d.email,d.office,d.interest,d.notes,'']);return ContentService.createTextOutput('ok');}
```
3. Project Settings → Script properties → add SECRET = any long random text.
4. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → copy the URL.
5. Vercel env vars: SHEETS_WEBHOOK_URL = that URL, SHEETS_SECRET = same text, SHEETS_FORMS = elevens. Redeploy.
Natalie checks the sheet, adds people to the waitlist and marks the last column.
The banner under the nav appears automatically 45 days before November 11 each year and hides after the 11th. The landing page dates roll forward each year.
