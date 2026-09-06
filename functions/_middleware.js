// functions/_middleware.js
// Cloudflare Pages Middleware — вставляє navbar у кожну HTML сторінку

const { LANGS, TOOLS, SECTION_LABELS, pageFile, pageUrl, detectActive } = (() => {
  // Inline nav config (Cloudflare Functions не підтримують import з батьківської папки)
  const LANGS = [
    { code: 'uk', label: 'УКР', hreflang: 'uk' },
    { code: 'en', label: 'ENG', hreflang: 'en' },
    { code: 'be', label: 'БЕЛ', hreflang: 'be' },
    { code: 'bg', label: 'БГ',  hreflang: 'bg' },
    { code: 'ru', label: 'РУС', hreflang: 'ru' },
    { code: 'sr', label: 'СРП', hreflang: 'sr' },
  ];
  const TOOLS = [
    { id:'kyrlat', file:'',      icon:'🔤', label:{uk:'КИР ↔ LAT',en:'CYR ↔ LAT',be:'КІР ↔ LAT',bg:'КИР ↔ LAT',ru:'КИР ↔ LAT',sr:'КИР ↔ LAT'}, mobLabel:{uk:'КИР↔LAT',en:'CYR↔LAT',be:'КІР↔LAT',bg:'КИР↔LAT',ru:'КИР↔LAT',sr:'КИР↔LAT'} },
    { id:'case',   file:'case',  icon:'Аа', label:{uk:'Регістр тексту',en:'Change Case',be:'Рэгістр тэксту',bg:'Регистър',ru:'Регистр текста',sr:'Регистар текста'}, mobLabel:{uk:'Регістр',en:'Case',be:'Рэгістр',bg:'Регистър',ru:'Регистр',sr:'Регистар'} },
    { id:'lists',  file:'lists', icon:'📋', label:{uk:'Інструменти списків',en:'List Tools',be:'Інструменты спісаў',bg:'Инструменти за списъци',ru:'Инструменты списков',sr:'Алати за листе'}, mobLabel:{uk:'Списки',en:'Lists',be:'Спісы',bg:'Списъци',ru:'Списки',sr:'Листе'} },
  ];
  const SECTION_LABELS = {
    tools: {uk:'Інструменти',en:'Tools',be:'Інструменты',bg:'Инструменти',ru:'Инструменты',sr:'Алати'},
  };

  function pageFile(toolFile, langCode) {
    const t = toolFile || '';
    const l = langCode === 'uk' ? '' : langCode;
    if (!t && !l) return 'index.html';
    if (!t &&  l) return l + '.html';
    if ( t && !l) return t + '.html';
    return t + '-' + l + '.html';
  }
  function pageUrl(toolFile, langCode, domain) {
    const f = pageFile(toolFile, langCode);
    return f === 'index.html' ? domain + '/' : domain + '/' + f;
  }
  function detectActive(pathname) {
    const name = pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';
    for (const tool of TOOLS) {
      for (const lang of LANGS) {
        const expected = pageFile(tool.file, lang.code).replace(/\.html$/, '');
        if (name === expected || (name === 'index' && tool.file === '' && lang.code === 'uk')) {
          return { toolFile: tool.file, toolId: tool.id, langCode: lang.code };
        }
      }
    }
    return { toolFile: '', toolId: 'kyrlat', langCode: 'uk' };
  }
  return { LANGS, TOOLS, SECTION_LABELS, pageFile, pageUrl, detectActive };
})();

const DOMAIN = 'https://kyrlat.com';

function buildNavbar(toolFile, toolId, langCode) {
  const nl = SECTION_LABELS.tools[langCode] || 'Tools';

  // Sidebar nav items
  const navItems = TOOLS.map(t => {
    const href = pageFile(t.file, langCode);
    const active = t.id === toolId ? ' active' : '';
    return `    <a class="nav-item${active}" href="${href}"><span class="nav-icon">${t.icon}</span>${t.label[langCode] || t.label.en}</a>`;
  }).join('\n');

  // Topbar lang buttons
  const langBtns = LANGS.map(l => {
    const href = pageFile(toolFile, l.code);
    const active = l.code === langCode ? ' active' : '';
    return `    <a class="topbar-lang${active}" href="${href}">${l.label}</a>`;
  }).join('\n');

  // Mobile nav
  const mobItems = TOOLS.map(t => {
    const href = pageFile(t.file, langCode);
    const active = t.id === toolId ? ' active' : '';
    return `  <a class="mob-nav-item${active}" href="${href}"><span class="mob-icon">${t.icon}</span>${t.mobLabel[langCode] || t.mobLabel.en}</a>`;
  }).join('\n');

  return {
    topbar: `<div class="topbar">
  <div class="topbar-logo"><span class="red">КИР</span><span class="dim"> ↔ </span><span class="grn">LAT</span></div>
  <div class="topbar-spacer"></div>
  <div class="topbar-langs">
${langBtns}
  </div>
  <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()">🌙</button>
</div>`,
    sidebar: `  <nav class="sidebar">
    <div class="sidebar-section-title">${nl}</div>
${navItems}
  </nav>`,
    mobileNav: `<div class="mobile-nav">
${mobItems}
</div>`,
  };
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Only process HTML pages
  if (!url.pathname.endsWith('.html') && url.pathname !== '/' && url.pathname !== '') {
    return next();
  }

  // Get the original response
  const response = await next();

  // Only process HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  // Detect current page
  const { toolFile, toolId, langCode } = detectActive(url.pathname);
  const nav = buildNavbar(toolFile, toolId, langCode);

  // Insert topbar after <body>
  html = html.replace(/<body>/, `<body>\n${nav.topbar}`);

  // Insert sidebar at start of .layout div
  html = html.replace(/<div class="layout">/, `<div class="layout">\n${nav.sidebar}`);

  // Insert mobile nav before </body>
  html = html.replace(/<\/body>/, `${nav.mobileNav}\n</body>`);

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  });
}
