// Main interactive behaviour: nav toggle, smooth scroll, dark mode, simple form handler
(() => {
  const root = document.documentElement;
  const modeBtn = document.getElementById('color-mode');
  const navToggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');

  // Initialize theme from localStorage
  const stored = localStorage.getItem('color-mode');
  if (stored === 'light') root.classList.add('light');
  if (stored) modeBtn.setAttribute('aria-pressed', stored === 'light');

  modeBtn.addEventListener('click', () => {
    const isLight = root.classList.toggle('light');
    localStorage.setItem('color-mode', isLight ? 'light' : 'dark');
    modeBtn.setAttribute('aria-pressed', isLight);
  });

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    if (navList.style.display === 'flex') {
      navList.style.display = 'none';
    } else {
      navList.style.display = 'flex';
      navList.style.flexDirection = 'column';
    }
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth', block:'start'});
      // close mobile nav
      if (window.innerWidth <= 880) {
        navList.style.display = 'none';
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Simple contact form UX: show success/fail messages (Formspree will still handle send)
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = 'Saving…';

      // build submission object
      const submission = {
        name: form.name?.value || '',
        email: form.email?.value || '',
        message: form.message?.value || '',
        timestamp: new Date().toISOString()
      };

      // Save to localStorage (backup)
      try {
        const key = 'submissions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(submission);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (err) {
        // ignore localStorage errors
      }

      // Try to POST to the provided form action (Formspree) and also to a local server endpoint if available
      let posted = false;

      // first try Formspree (existing behaviour)
      try {
        const formData = new FormData(form);
        // include timestamp in form data
        formData.append('timestamp', submission.timestamp);
        const res = await fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          posted = true;
          status.textContent = 'Thanks — message sent! I will reply soon.';
          form.reset();
        } else {
          const json = await res.json().catch(() => ({}));
          status.textContent = json?.error || 'Saved locally — server send failed.';
        }
      } catch (err) {
        // Formspree failed, try local server
        try {
          const res2 = await fetch('http://localhost:3000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submission)
          });
          if (res2.ok) {
            posted = true;
            status.textContent = 'Saved to local server and stored.';
            form.reset();
          } else {
            status.textContent = 'Saved locally — server returned error.';
          }
        } catch (err2) {
          status.textContent = 'Saved locally (no network/server).';
        }
      }

      // Add a download link for local backups
      try {
        const key = 'submissions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const blob = new Blob([JSON.stringify(existing, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        // create or update link
        let link = document.getElementById('download-submissions');
        if (!link) {
          link = document.createElement('a');
          link.id = 'download-submissions';
          link.className = 'btn ghost';
          link.style.marginLeft = '12px';
          link.textContent = 'Download backup';
          status.parentNode && status.parentNode.appendChild(link);
        }
        link.href = url;
        link.download = `submissions-${new Date().toISOString().slice(0,19)}.json`;
      } catch (e) {
        // ignore download link errors
      }

    });
  }

  // Set copyright year
  const y = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = y;

  // Page transition: intercept avatar link click to play a slide-left exit animation
  try {
    const avatarImg = document.getElementById('hero-avatar-link');
    if (avatarImg) {
      const parentLink = avatarImg.closest('a');
      if (parentLink && parentLink.href) {
        parentLink.addEventListener('click', (ev) => {
          // only intercept same-origin navigations to details.html
          const href = parentLink.getAttribute('href');
          if (!href || href.startsWith('#')) return;
          ev.preventDefault();
          // trigger exit animation
          document.body.classList.add('animate-exit');
          // wait for CSS transition to complete then navigate
          const timeout = 500; // ms (match CSS transition duration)
          setTimeout(() => {
            window.location.href = href;
          }, timeout);
        });
      }
    }
  } catch (e) {
    // gracefully ignore if DOM API not present
    console.warn('transition hook error', e);
  }
})();
