(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPreference = null;
  try { motionPreference = localStorage.getItem('alok-motion'); } catch { /* Preferences are optional. */ }
  const motionOff = () => reducedMotion.matches || motionPreference === 'off';
  const menu = $('#navigation');
  const menuButton = $('.menu-trigger');
  const setMenu = open => {
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.innerHTML = open ? 'Close <span aria-hidden="true">−</span>' : 'Menu <span aria-hidden="true">+</span>';
  };
  menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => { if (!menu.contains(event.target) && !menuButton.contains(event.target)) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuButton.focus(); } });
  document.addEventListener('focusin', event => { if (!menu.contains(event.target) && !menuButton.contains(event.target)) setMenu(false); });
  matchMedia('(max-width:800px)').addEventListener('change', () => setMenu(false));
  $('#year').textContent = new Date().getFullYear();
  $$('a[href="#top"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); setMenu(false);
    window.scrollTo({ top: 0, behavior: motionOff() ? 'instant' : 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
  }));

  const systems = {
    javascript: { type:'01 / BUILD', title:'JavaScript', description:'Turning static interfaces into useful interactions. Working with the DOM, events, asynchronous requests, and progressive enhancement.', application:'The Systems Matrix, interactive terminal, project dialogs, and contact form.', tags:['DOM','Fetch API','Events'] },
    frontend: { type:'02 / BUILD', title:'HTML & CSS', description:'Building semantic, responsive interfaces with layouts that adapt to content and screen size. Keeping the page useful before JavaScript loads.', application:'Semantic sections, flexible grids, local fonts, keyboard focus states, and mobile navigation.', tags:['Semantic HTML','Grid & Flexbox','Responsive design'] },
    backend: { type:'03 / BUILD', title:'Node & SQLite', description:'Exploring the journey from a browser request to validated, persistent data. A small backend with an intentionally narrow public surface.', application:'Contact messages are validated and stored in a private inbox. Node uses SQLite; the hosted version uses D1.', tags:['HTTP','Validation','Parameterized queries'] },
    security: { type:'04 / DEFEND', title:'Web Security', description:'Learning how common web weaknesses arise and how to reduce them. Practising only in authorized labs and applications I own.', application:'Input validation, request limits, security headers, and keeping private files away from public routes.', tags:['OWASP concepts','Input boundaries','Secure defaults'] },
    linux: { type:'05 / DEFEND', title:'Linux', description:'Getting comfortable with the command line, file permissions, processes, and the operating system behind an application.', application:'A learning focus for understanding deployment environments and troubleshooting web services.', tags:['Shell basics','Permissions','Processes'] },
    network: { type:'06 / DEFEND', title:'Networking', description:'Understanding how a browser reaches a server, where DNS and TLS fit, and what a request actually carries.', application:'Exploring request/response behavior, same-origin boundaries, and HTTP status codes in this project.', tags:['HTTP','DNS','TLS fundamentals'] },
    figma: { type:'07 / DESIGN', title:'Figma', description:'Exploring ideas before writing code. Working through visual hierarchy, reusable components, and interaction flows.', application:'A tool in my wider design toolkit for sketching layouts and evaluating interface choices.', tags:['Wireframes','Components','Prototypes'] },
    experience: { type:'08 / DESIGN', title:'UI & Experience', description:'Making the next step clear. Thinking about contrast, keyboard access, readable feedback, and motion that respects user preferences.', application:'The module inspector, accessible dialogs, contact error recovery, and reduced-motion controls.', tags:['Accessibility','Hierarchy','Interaction design'] }
  };
  const selectSystem = key => {
    const item = systems[key];
    $$('.matrix-card').forEach(card => { const active = card.dataset.system === key; card.classList.toggle('is-selected', active); card.setAttribute('aria-pressed', String(active)); });
    $('#system-type').textContent = item.type;
    $('#system-title').textContent = item.title;
    $('#system-description').textContent = item.description;
    $('#system-application').textContent = item.application;
    $('#system-tags').replaceChildren(...item.tags.map(tag => { const span = document.createElement('span'); span.textContent = tag; return span; }));
    if (window.gsap && !motionOff()) gsap.fromTo('#system-detail-content', { opacity:.35, y:5 }, { opacity:1, y:0, duration:.25, overwrite:true, clearProps:'all' });
  };
  $$('.matrix-card').forEach(card => card.addEventListener('click', () => selectSystem(card.dataset.system)));
  $$('.matrix-filters button').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    $$('.matrix-filters button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const visible = [];
    $$('.matrix-card').forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; if (!card.hidden) visible.push(card); });
    if (!visible.some(card => card.classList.contains('is-selected'))) selectSystem(visible[0].dataset.system);
    $('#matrix-summary').textContent = `Showing ${filter === 'all' ? 'all ' : ''}${visible.length} ${filter === 'all' ? 'systems' : filter + ' systems'}. Select a module to inspect it.`;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));

  const projects = {
    portfolio: { type:'WORKING BUILD / 001', title:'alok.dev', description:'A personal portfolio built with semantic HTML, CSS, and JavaScript. GSAP adds responsive motion; the site remains readable without animation. The contact backend validates messages and saves them before confirming receipt.', learnings:['Building one coherent experience across phones, tablets, and desktops.','Combining GSAP timelines with scroll reveals and reduced-motion preferences.','Connecting accessible forms to persistent storage, with useful failure states.','Keeping private inbox data out of public routes. Messages are stored; email notifications are not configured.'] },
    threat: { type:'INTERFACE CONCEPT / 002', title:'ThreatLens', description:'A visual exploration of a security dashboard: how to distinguish important alerts from background activity, group related events, and give each signal enough context. The radar is illustrative; it is not a live monitor.', learnings:['Visual hierarchy for alerts and their supporting context.','Readable event lists and clear severity labels.','Reducing visual noise without hiding useful information.','Next step: prototype an accessible event table using an explicitly labeled sample dataset.'] },
    phish: { type:'LEARNING CONCEPT / 003', title:'PhishCheck', description:'An educational interface concept for examining suspicious messages. It focuses on sender, destination, and context clues so people can pause before acting. It does not classify messages or guarantee that a link is safe.', learnings:['Explaining security concepts in everyday language.','Showing the actual destination of a link before opening it.','Encouraging independent verification through a trusted channel.','Next step: create labeled practice examples with explanations rather than a definitive “safe” verdict.'] }
  };
  const dialog = $('#project-dialog');
  let dialogTrigger;
  $$('.project-detail').forEach(button => button.addEventListener('click', () => {
    const project = projects[button.dataset.project];
    dialogTrigger = button;
    $('#dialog-type').textContent = project.type;
    $('#dialog-title').textContent = project.title;
    $('#dialog-description').textContent = project.description;
    $('#dialog-learnings').replaceChildren(...project.learnings.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    dialog.showModal(); document.body.classList.add('dialog-open');
  }));
  $$('.dialog-close,.dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); dialogTrigger?.focus({ preventScroll:true }); });
  dialog.addEventListener('click', event => { const rect = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close(); });

  const output = $('#terminal-output');
  const input = $('#terminal-input');
  const commands = [];
  let historyIndex = 0;
  const responses = {
    help:'Available commands: about, projects, skills, contact, clear. Use ↑ / ↓ for history.',
    about:'Alok Mishra — computer science student at IIMT College of Engineering. Exploring frontend development and web security.',
    projects:'alok.dev [working build] · ThreatLens [UI concept] · PhishCheck [learning concept]. Explore the project cards above.',
    skills:'HTML / CSS / JavaScript / Figma. Exploring Node, SQLite, Linux, networking, and web security. Select a module in the Systems Matrix for more.',
    contact:'Use the contact form below, or find me on LinkedIn: alokmishra621.'
  };
  $('#terminal-form').addEventListener('submit', event => {
    event.preventDefault(); const raw = input.value.trim(); if (!raw) return;
    commands.push(raw); if (commands.length > 30) commands.shift(); historyIndex = commands.length;
    const command = raw.toLowerCase();
    if (command === 'clear') output.replaceChildren();
    else {
      const line = document.createElement('p'); line.className = 'red'; line.textContent = '❯ ' + raw;
      const answer = document.createElement('p'); answer.textContent = Object.hasOwn(responses, command) ? responses[command] : 'Command not found. Type help for available commands.';
      output.append(line, answer); while (output.children.length > 30) output.firstElementChild.remove();
    }
    input.value = ''; output.scrollTop = output.scrollHeight;
  });
  input.addEventListener('keydown', event => {
    if (!['ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); historyIndex = Math.min(commands.length, Math.max(0, historyIndex + (event.key === 'ArrowUp' ? -1 : 1))); input.value = commands[historyIndex] || '';
  });

  const form = $('#contact-form'), status = $('#form-status'), submit = form.querySelector('button[type="submit"]');
  const setStatus = (message, state) => { status.textContent = message; status.dataset.state = state; };
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (sending || !form.reportValidity()) return;
    if (!/^https?:$/.test(location.protocol)) { setStatus('Please use the hosted website to send a message, or reach me on LinkedIn.', 'error'); return; }
    sending = true; submit.disabled = true; submit.textContent = 'Sending…'; form.setAttribute('aria-busy','true'); setStatus('Saving your message…','pending');
    try {
      const response = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(new FormData(form))), signal:AbortSignal.timeout(15000) });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('This static preview cannot receive messages. Please reach me through LinkedIn.');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your message. Please try again or contact me on LinkedIn.');
      if (data.ok !== true || typeof data.id !== 'string') throw new Error('Message delivery could not be confirmed. Please contact me on LinkedIn.');
      setStatus('Message received. Thanks for reaching out!','success'); form.reset();
    } catch (error) {
      const message = error.name === 'TimeoutError' ? 'The request timed out. Your message may have arrived; please wait before retrying.' : error instanceof TypeError ? 'Connection lost. Your message is still here — please try again or contact me on LinkedIn.' : error.message;
      setStatus(message,'error');
    } finally { sending = false; submit.disabled = false; form.removeAttribute('aria-busy'); submit.innerHTML = 'Send message <span aria-hidden="true">↗</span>'; }
  });

  let motionContext;
  const motionToggle = $('#motion-toggle');
  const setupMotion = () => {
    motionContext?.revert(); motionContext = null;
    const off = motionOff(); document.documentElement.dataset.motion = off ? 'off' : 'on';
    motionToggle.setAttribute('aria-pressed', String(off));
    motionToggle.innerHTML = (reducedMotion.matches ? 'Motion: reduced' : off ? 'Motion: off' : 'Motion: on') + ' <span aria-hidden="true">◉</span>';
    if (off || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    motionContext = gsap.matchMedia();
    motionContext.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({defaults:{ease:'power3.out'}})
        .from('.hero-word',{y:30,opacity:0,duration:1})
        .from('.hero-copy > *',{y:18,opacity:0,duration:.65,stagger:.07},'-.7')
        .from('.portrait-wrap',{y:30,opacity:0,rotation:0,duration:.9},'-.9')
        .from('.principle',{x:15,opacity:0,duration:.6,stagger:.1},'-.7');
      $$('.reveal').forEach(element => gsap.from(element,{y:25,opacity:0,duration:.7,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 94%',once:true}}));
      const ticker = gsap.to('.ticker-track',{xPercent:-50,duration:32,ease:'none',repeat:-1});
      const radar = gsap.to('.radar-sweep',{rotation:360,duration:10,ease:'none',repeat:-1});
      const observer = new IntersectionObserver(entries => entries.forEach(entry => { (entry.target.classList.contains('ticker') ? ticker : radar).paused(!entry.isIntersecting || document.hidden); }));
      observer.observe($('.ticker')); observer.observe($('.radar'));
      const onVisibility = () => { [ticker,radar].forEach(tween => { if (document.hidden) tween.pause(); }); if (!document.hidden) { observer.unobserve($('.ticker')); observer.unobserve($('.radar')); observer.observe($('.ticker')); observer.observe($('.radar')); } };
      document.addEventListener('visibilitychange',onVisibility);
      return () => { observer.disconnect(); document.removeEventListener('visibilitychange',onVisibility); };
    });
    motionContext.add('(min-width:801px) and (pointer:fine) and (prefers-reduced-motion: no-preference)', () => {
      const portrait = $('.portrait-wrap');
      const move = event => { const rect = portrait.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width - .5; const y = (event.clientY - rect.top) / rect.height - .5; gsap.to(portrait,{rotationY:x*5,rotationX:-y*5,transformPerspective:900,duration:.5,overwrite:true}); };
      const reset = () => gsap.to(portrait,{rotationX:0,rotationY:0,duration:.5,overwrite:true});
      portrait.addEventListener('pointermove',move); portrait.addEventListener('pointerleave',reset);
      return () => { portrait.removeEventListener('pointermove',move); portrait.removeEventListener('pointerleave',reset); gsap.set(portrait,{clearProps:'transform,transformPerspective'}); };
    });
  };
  motionToggle.addEventListener('click', () => { motionPreference = motionOff() && !reducedMotion.matches ? 'on' : 'off'; try { localStorage.setItem('alok-motion',motionPreference); } catch {} setupMotion(); });
  reducedMotion.addEventListener('change',setupMotion);
  setupMotion();
  const sections = $$('main section[id]').filter(section => menu.querySelector(`a[href="#${section.id}"]`));
  const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) $$('nav a').forEach(link => { if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); }); },{rootMargin:'-20% 0px -60% 0px'});
  sections.forEach(section => observer.observe(section));
  let progressFrame = false;
  const updateProgress = () => { const max = document.documentElement.scrollHeight - innerHeight; $('.page-progress').style.transform = `scaleX(${max > 0 ? Math.min(1,scrollY/max) : 0})`; progressFrame = false; };
  addEventListener('scroll', () => { if (!progressFrame) { progressFrame = true; requestAnimationFrame(updateProgress); } },{passive:true});
  addEventListener('resize',updateProgress); updateProgress();
})();
