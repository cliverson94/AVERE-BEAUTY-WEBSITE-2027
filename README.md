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

## 4. Launch on averebeauty.com (when ready)
1. Vercel → Project → Settings → Domains → add averebeauty.com and www.averebeauty.com.
2. Vercel shows 2 DNS records. Add them where the domain is registered (Wix: Domains → Manage DNS).
3. Delete robots.txt, and remove the "headers" block from vercel.json, so Google can index the site.
4. Submit https://averebeauty.com/sitemap.xml in Google Search Console.

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
- GOOGLE_CLIENT_ID = the Client ID from step B
- SESSION_SECRET = any long random text (e.g. 40+ random letters and numbers)
- STUDIO_OWNERS = info@averebeauty.com,frankudavcak@gmail.com,sophie@averebeauty.com
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
