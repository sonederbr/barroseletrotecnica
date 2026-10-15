(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.getElementById('themeBtn');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const themeColor = document.getElementById('themeColor');
  let explicitTheme = null;
  try {
    const saved = localStorage.getItem('be-theme');
    if (saved === 'light' || saved === 'dark') explicitTheme = saved;
  } catch (error) {
    console.warn('Não foi possível ler a preferência de tema.', error);
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-label', theme === 'dark'
      ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    themeColor.content = theme === 'dark' ? '#101e20' : '#f5f6f2';
  }
  applyTheme(explicitTheme || (systemTheme.matches ? 'dark' : 'light'));
  themeButton.addEventListener('click', () => {
    explicitTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(explicitTheme);
    try {
      localStorage.setItem('be-theme', explicitTheme);
    } catch (error) {
      console.warn('O tema foi alterado, mas não foi possível guardar a preferência.', error);
    }
  });
  systemTheme.addEventListener('change', () => {
    if (!explicitTheme) applyTheme(systemTheme.matches ? 'dark' : 'light');
  });

  const menuButton = document.getElementById('menuBtn');
  const closeButton = document.getElementById('closeMenuBtn');
  const overlay = document.getElementById('mobileMenu');
  const main = document.querySelector('main');
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  const quickActions = document.querySelector('.fab-bar');

  function setMenu(open, restoreFocus = true) {
    overlay.inert = !open;
    overlay.setAttribute('aria-hidden', String(!open));
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    [header, main, footer, quickActions].forEach(element => { element.inert = open; });
    if (open) closeButton.focus();
    else if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => setMenu(true));
  closeButton.addEventListener('click', () => setMenu(false));
  overlay.addEventListener('click', event => {
    if (event.target === overlay) setMenu(false);
  });
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      setMenu(false, false);
      if (link.hash) {
        const section = document.querySelector(link.hash);
        if (section) {
          section.tabIndex = -1;
          section.focus({ preventScroll: true });
        }
      } else menuButton.focus();
    });
  });
  document.addEventListener('keydown', event => {
    if (overlay.getAttribute('aria-hidden') !== 'false') return;
    if (event.key === 'Escape') setMenu(false);
    if (event.key !== 'Tab') return;
    const focusable = [...overlay.querySelectorAll('button, a[href]')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  const desktop = matchMedia('(min-width: 780px)');
  desktop.addEventListener('change', () => {
    if (desktop.matches && overlay.getAttribute('aria-hidden') === 'false') {
      setMenu(false, false);
      document.querySelector('.desktop-nav a').focus();
    }
  });

  if ('IntersectionObserver' in window) {
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    if (!motionPreference.matches) {
      reveals.forEach(element => {
        element.classList.add('is-pending');
        revealObserver.observe(element);
      });
    }
    motionPreference.addEventListener('change', () => {
      if (motionPreference.matches) {
        reveals.forEach(element => element.classList.remove('is-pending'));
        revealObserver.disconnect();
      }
    });

    const navLinks = [...document.querySelectorAll('.desktop-nav a')];
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (!visible.length) return;
      const sectionId = visible[0].target.id;
      navLinks.forEach(link => {
        if (link.hash === `#${sectionId}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-20% 0px -55% 0px' });
    navLinks.forEach(link => sectionObserver.observe(document.querySelector(link.hash)));
  }
})();
