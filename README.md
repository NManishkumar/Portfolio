# Portfolio (upgraded)

This workspace contains an upgraded single-page portfolio.

Files added/changed
- `profile.html` — the main single-page portfolio (open in browser)
- `css/styles.css` — main stylesheet (light + dark variables)
- `js/main.js` — interactions: dark-mode, nav, form UX
- `images/avatar.svg` — placeholder avatar used in the layout

How to view
1. Open `profile.html` in your browser (double-click or `open profile.html` on macOS)

Optional: local submission server
--------------------------------
If you want submissions to be stored on your machine (instead of only Formspree/localStorage), you can run the included minimal server which saves submissions to `data/submissions.json`.

Steps:

1. Make sure you have Node.js installed.
2. From the workspace root run:

```bash
node server.js
```

3. The server listens on port 3000. When running, form submissions will attempt to POST to `http://localhost:3000/api/submit` (the site tries Formspree first, then the local server).

You can view all saved submissions at:

http://localhost:3000/api/submissions


Quick edits you should make
- Replace "Your Name" with your real name in `profile.html` (title, hero, footer)
- Update the bio in the About section
- Replace project cards with real screenshots and links
- Change the email in the Contact section
- If you use Formspree, replace `https://formspree.io/f/your-form-id` with your form ID

Personalization already applied for:
Email: nn9713@srmist.edu.in

The hero/profile photo should be placed in the `images/` folder as `images/myPhoto.jpg` (the page references `images/myPhoto.jpg`).
If you prefer the image in a different location, update the `src` in the `<img class="floating-hero">` element in `profile.html`.
- If you prefer the image in a different location, update the `src` in the `<div class="floating-pic">` element in `profile.html`.

Questions for you (to finalize the portfolio)
- Full name and short tagline/bio?
- Links: GitHub, LinkedIn, personal site, resume URL?
- Preferred color/accent (default teal/blue used)?
- Do you want the contact form to POST to Formspree or simple mailto?
- Do you want additional sections (blog, testimonials, services)?

If you'd like, I can also:
- Replace the placeholder projects with real entries and thumbnails
- Add a hosted resume (PDF) download
- Switch the contact form to a mailto fallback if you don't use Formspree

Next steps I can take
- Replace placeholder project cards with real project entries and thumbnails
- Add metadata and a small manifest for PWA support
- Generate more accessible images and test Lighthouse scores

