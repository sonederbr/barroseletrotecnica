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

  const visual = document.querySelector('.technical-visual');
  const sectorTabs = [...visual.querySelectorAll('[role="tab"]')];
  const scenes = [...visual.querySelectorAll('.building-scene')];
  const panel = document.getElementById('sector-panel');
  const motionButton = document.getElementById('motionBtn');
  const sceneDescriptions = {
    home: 'Habitação: energia ligada à iluminação, aos painéis solares e ao carregamento elétrico.',
    shop: 'Comércio: energia ligada à iluminação da montra, aos acessos e aos sistemas de segurança.',
    factory: 'Indústria: energia distribuída pelo quadro elétrico, pelas máquinas e pela linha de produção.',
  };
  const energyAnimations = new Map();
  let activeSector = 'home';
  let pausedByUser = false;
  let visualInView = true;

  function updateEnergy() {
    const motionAllowed = !motionPreference.matches;
    motionButton.hidden = !motionAllowed;
    motionButton.setAttribute('aria-pressed', String(pausedByUser));
    motionButton.setAttribute('aria-label', pausedByUser ? 'Retomar animação' : 'Pausar animação');
    scenes.forEach(scene => {
      const animations = energyAnimations.get(scene.dataset.sector) || [];
      animations.forEach(animation => {
        if (scene.dataset.sector === activeSector && motionAllowed &&
            !pausedByUser && visualInView && !document.hidden) animation.play();
        else animation.pause();
      });
    });
  }

  function prepareEnergy(scene) {
    if (energyAnimations.has(scene.dataset.sector)) return;
    const routes = [...scene.querySelectorAll('.energy-route')];
    const animations = [...scene.querySelectorAll('.energy-dot')].map((dot, index) => {
      const route = routes[index];
      const length = route.getTotalLength();
      const frames = Array.from({ length: 121 }, (_, step) => {
        const point = route.getPointAtLength(length * step / 120);
        return { transform: `translate(${point.x}px, ${point.y}px)`,
          opacity: step === 0 || step === 120 ? 0 : 1 };
      });
      const animation = dot.animate(frames, {
        duration: 4500 + index * 400, iterations: Infinity, easing: 'linear',
      });
      animation.pause();
      animation.currentTime = index * 700;
      dot.classList.add('is-ready');
      return animation;
    });
    energyAnimations.set(scene.dataset.sector, animations);
  }

  function selectSector(tab) {
    activeSector = tab.dataset.sector;
    sectorTabs.forEach(candidate => {
      const selected = candidate === tab;
      candidate.setAttribute('aria-selected', String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });
    scenes.forEach(scene => { scene.toggleAttribute('hidden', scene.dataset.sector !== activeSector); });
    panel.setAttribute('aria-labelledby', tab.id);
    visual.querySelector('.drawing-index').textContent = `BE / 0${sectorTabs.indexOf(tab) + 1}`;
    document.getElementById('drawing-title').textContent = sceneDescriptions[activeSector];
    prepareEnergy(scenes.find(scene => scene.dataset.sector === activeSector));
    updateEnergy();
  }
  sectorTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSector(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % sectorTabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + sectorTabs.length) % sectorTabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = sectorTabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectSector(sectorTabs[next]);
      sectorTabs[next].focus();
    });
  });
  motionButton.addEventListener('click', () => {
    pausedByUser = !pausedByUser;
    updateEnergy();
  });
  motionPreference.addEventListener('change', updateEnergy);
  document.addEventListener('visibilitychange', updateEnergy);
  selectSector(sectorTabs[0]);

  const energyFeature = document.querySelector('.service-feature');
  const featureMotionButton = document.getElementById('featureMotionBtn');
  let featurePausedByUser = false;
  let featureInView = false;

  function updateFeatureEnergy() {
    const reduced = motionPreference.matches;
    energyFeature.dataset.energy = !reduced && !featurePausedByUser &&
      featureInView && !document.hidden ? 'running' : 'paused';
    featureMotionButton.hidden = reduced;
    featureMotionButton.setAttribute('aria-pressed', String(featurePausedByUser));
    featureMotionButton.setAttribute('aria-label', featurePausedByUser
      ? 'Retomar efeito de energia' : 'Pausar efeito de energia');
  }
  featureMotionButton.addEventListener('click', () => {
    featurePausedByUser = !featurePausedByUser;
    updateFeatureEnergy();
  });
  motionPreference.addEventListener('change', updateFeatureEnergy);
  document.addEventListener('visibilitychange', updateFeatureEnergy);
  updateFeatureEnergy();

  if ('IntersectionObserver' in window) {
    const featureObserver = new IntersectionObserver(entries => {
      featureInView = entries[0].isIntersecting;
      updateFeatureEnergy();
    });
    featureObserver.observe(energyFeature);
    const visualObserver = new IntersectionObserver(entries => {
      visualInView = entries[0].isIntersecting;
      updateEnergy();
    });
    visualObserver.observe(visual);
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
  } else {
    featureInView = true;
    updateFeatureEnergy();
  }
})();
