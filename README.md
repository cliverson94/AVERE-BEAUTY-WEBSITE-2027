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
