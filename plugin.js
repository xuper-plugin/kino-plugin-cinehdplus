// src/cinehdplus.js
var SITE = "https://cinehdplus.org";
var API = "https://api.cinehdplus.org";
var GENRES = [
  ["accion", "Acci\xF3n"],
  ["animacion", "Animaci\xF3n"],
  ["anime", "Anime"],
  ["aventura", "Aventura"],
  ["belica", "B\xE9lica"],
  ["ciencia-ficcion", "Ciencia ficci\xF3n"],
  ["comedia", "Comedia"],
  ["crimen", "Crimen"],
  ["documental", "Documental"],
  ["drama", "Drama"],
  ["familia", "Familia"],
  ["fantasia", "Fantas\xEDa"],
  ["historia", "Historia"],
  ["misterio", "Misterio"],
  ["musica", "M\xFAsica"],
  ["romance", "Romance"],
  ["suspense", "Suspense"],
  ["terror", "Terror"],
  ["western", "Western"]
];
var MIRRORS = [
  ["streamwish.to", "vibuxer.com"],
  ["hglink.to", "vibuxer.com"],
  ["swdyu.com", "vibuxer.com"],
  ["cybervynx.com", "vibuxer.com"],
  ["dumbalag.com", "vibuxer.com"],
  ["mivalyo.com", "vidhidepro.com"],
  ["dinisglows.com", "vidhidepro.com"],
  ["dhtpre.com", "vidhidepro.com"]
];
function fixHost(url) {
  let u;
  try {
    u = new URL(url);
  } catch (_) {
    return url;
  }
  for (const [from, to] of MIRRORS) if (u.hostname === from) {
    u.hostname = to;
    return u.href;
  }
  return url;
}
var NAMED_ENTITIES = { ndash: "\u2013", mdash: "\u2014", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D", nbsp: " ", iexcl: "\xA1", iquest: "\xBF", laquo: "\xAB", raquo: "\xBB", aacute: "\xE1", eacute: "\xE9", iacute: "\xED", oacute: "\xF3", uacute: "\xFA", ntilde: "\xF1", Aacute: "\xC1", Eacute: "\xC9", Iacute: "\xCD", Oacute: "\xD3", Uacute: "\xDA", Ntilde: "\xD1", uuml: "\xFC" };
var decodeMore = (s) => s.replace(/&#([0-9]{1,7});/g, (m, n) => {
  const c = Number(n);
  return c > 0 && c <= 1114111 ? String.fromCodePoint(c) : m;
}).replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => {
  const c = parseInt(h, 16);
  return c > 0 && c <= 1114111 ? String.fromCodePoint(c) : m;
}).replace(/&([a-z]+);/gi, (m, k) => NAMED_ENTITIES[k] ?? m);
var decode = (s) => decodeMore(String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
var text = (s) => decode(String(s || "").replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function posterOf(src, w = "w500") {
  const s = decode(src || "");
  const m = /[?&]src=(\/[^&]+)&[^"]*origin=tmdb/.exec(s) || /[?&]src=(\/[^&]+)/.exec(s);
  if (m && /origin=tmdb/.test(s)) return `https://image.tmdb.org/t/p/${w}${decodeURIComponent(m[1])}`;
  return s;
}
var LANG = (alt) => {
  const f = String(alt || "").toLowerCase();
  return /latino/.test(f) ? "lat" : /castellano|espa[nñ]a/.test(f) ? "cast" : /sub|vose/.test(f) ? "sub" : "";
};
var PAT = '(pelicula|series-tv)-(\\d+)\\/([^"\\/?#]+)';
function parseCards(html) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const h = String(html || "");
  const re = new RegExp(`<a ([^>]*)href="https:\\/\\/cinehdplus\\.org\\/${PAT}\\/?"([^>]*)>([\\s\\S]*?)<\\/a>`, "g");
  const all = [...h.matchAll(re)];
  all.forEach((m, i) => {
    const id = m[3];
    if (seen.has(id)) return;
    const inner = m[6];
    const wide = !/<img/.test(inner) && /aria-label="/.test(m[1] + m[5]);
    const chunk = wide ? h.slice(m.index + m[0].length, Math.min(i + 1 < all.length ? all[i + 1].index : Infinity, m.index + m[0].length + 4e3)) : inner;
    if (!wide && !/<img/.test(inner)) return;
    const pic = /<img[^>]*\bsrc="([^"]+)"/.exec(chunk);
    const alt = /<img[^>]*\balt="([^"]*)"/.exec(chunk);
    const quality = (/<span[^>]*>\s*(HD|4K|CAM|FHD|HDRip)\s*<\/span>/.exec(chunk) || [])[1];
    let title, year, overview, genres = [];
    if (wide) {
      const h3 = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(chunk);
      title = h3 ? text(h3[1]) : decode((/aria-label="([^"]*)"/.exec(m[1] + m[5]) || [])[1]);
      year = (/<\/span>\s*((?:19|20)\d\d)\s*<span/.exec(chunk) || [])[1];
      overview = text((/<p(?:\s[^>]*)?>\s*"?([\s\S]*?)"?\s*<\/p>/.exec(chunk) || [])[1]);
      genres = [...chunk.matchAll(/<span[^>]*>\s*([A-ZÁÉÍÓÚÑ][^<]{2,24}?)\s*<\/span>/g)].map((x) => text(x[1])).filter((g) => !/^(Película|Serie|HD|CAM|\d)/i.test(g) && !/visitas/.test(g)).slice(0, 3);
    } else {
      const ps = [...chunk.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map((x) => text(x[1]));
      const at = ps.findIndex((x) => /^\d{4}\s*·/.test(x));
      title = at > 0 ? ps[at - 1] : alt ? text(alt[1]).replace(/\s+-\s+(Película|Serie de TV)$/, "") : "";
      year = at >= 0 ? /^(\d{4})/.exec(ps[at])[1] : void 0;
      overview = ps.find((x) => x.length > 40 && !/·/.test(x) && x !== title);
    }
    if (!title) return;
    seen.add(id);
    const rate = /<span[^>]*>\s*(\d(?:\.\d)?|10(?:\.0)?)\s*<\/span>/.exec(chunk);
    const lang = /alt="(Latino|Castellano|Subtitulado)"/.exec(chunk);
    out.push({
      id,
      slug: m[4],
      kind: m[2] === "pelicula" ? "movie" : "series",
      title,
      year: year ? Number(year) : void 0,
      poster: pic ? posterOf(pic[1]) : "",
      rating: rate ? Number(rate[1]) : void 0,
      quality: quality || "",
      lang: lang ? LANG(lang[1]) : "",
      overview: overview || "",
      genres
    });
  });
  return out;
}
var meta = (html, prop) => {
  const m = new RegExp(`<meta property="${prop}" content="([^"]*)"`).exec(html);
  return m ? decode(m[1]) : "";
};
function parseTitle(html) {
  const h = String(html || "");
  const t2 = /<h2[^>]*class="[^"]*text-xl[^"]*"[^>]*>\s*([\s\S]*?)\s*<span[^>]*>\(?(\d{4})\)?<\/span>/.exec(h);
  const title = t2 ? text(t2[1]) : text((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(h) || [])[1]);
  if (!title) return null;
  const original = (/Título original:\s*([^<]*)/.exec(h) || [])[1];
  const head = t2 ? h.slice(t2.index, t2.index + 3500) : h.slice(0, 3500);
  const genres = [...new Set([...head.matchAll(/href="https:\/\/cinehdplus\.org\/genero\/[a-z0-9-]+\/"[^>]*>\s*([^<]+?)\s*</g)].map((m) => text(m[1])))].slice(0, 5);
  const pics = t2 ? [...h.slice(Math.max(0, t2.index - 2500), t2.index).matchAll(/<img[^>]*\bsrc="([^"]+)"/g)] : [];
  const pic = pics.length ? pics[pics.length - 1] : null;
  const seasons = [];
  for (const p of h.split(/<div[^>]*id="season-content-/).slice(1)) {
    const season = Number(/^(\d+)/.exec(p)[1]);
    const eps = [];
    for (const e of p.split(/<a href="https:\/\/cinehdplus\.org\/episodio-/).slice(1)) {
      const link = /^(\d+)\/([^"\/?#]+)\/?"/.exec(e);
      if (!link) continue;
      const num = /(\d+)x(\d+)/.exec(link[2]);
      const n = /<span[^>]*>\s*E(\d+)\s*<\/span>/.exec(e) || (num ? [, num[2]] : null);
      if (!n) continue;
      const ttl = /<h3[^>]*>\s*([\s\S]*?)\s*<\/h3>/.exec(e);
      const pic2 = /<img[^>]*\bsrc="([^"]+)"/.exec(e);
      const date = /<span[^>]*>\s*([A-Z][a-zé]{2,4}\.? \d{1,2}, \d{4})\s*<\/span>/.exec(e);
      eps.push({ id: link[1], slug: link[2], season, number: Number(n[1]), title: ttl ? text(ttl[1]) : "", thumb: pic2 ? pic2[1] : "", date: date ? date[1] : "" });
    }
    if (eps.length && !seasons.some((s) => s.season === season)) seasons.push({ season, episodes: eps });
  }
  return {
    title,
    original: original ? text(original) : "",
    overview: meta(h, "og:description"),
    year: t2 ? Number(t2[2]) : void 0,
    genres,
    poster: pic ? posterOf(pic[1]) : meta(h, "og:image"),
    seasons
  };
}
function parseButtons(html) {
  const out = [];
  for (const m of String(html || "").matchAll(/<button[^>]*\bdata-url="([^"]+)"[^>]*\bdata-domain="([^"]*)"[^>]*\bdata-lang="([^"]*)"[^>]*\bdata-type="server"/g)) {
    const f = /player\.php\?h=([^&"]+)/.exec(decode(m[1]));
    if (f) out.push({ lang: LANG(m[3]), domain: m[2], frame: f[1] });
  }
  return out;
}
function inputValue(html, id) {
  const m = new RegExp(`<input[^>]*\\bid="${id}"[^>]*\\bvalue="([^"]*)"|<input[^>]*\\bvalue="([^"]*)"[^>]*\\bid="${id}"`).exec(String(html || ""));
  return m ? decode(m[1] ?? m[2]) : null;
}
function formAction(html) {
  const m = /<form[^>]*\baction="([^"]+)"/.exec(String(html || ""));
  return m ? decode(m[1]) : null;
}
function finalLink(html) {
  const m = /link = '([^']+)'/.exec(String(html || ""));
  if (!m) return null;
  try {
    return fixHost(atob(m[1]));
  } catch (_) {
    return null;
  }
}

// src/util/http.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var REQUEST_MS = 8e3;
var MIN_MS = 1500;
function makeReq(kino2, { deadline }) {
  const req = async (url, opts = {}) => {
    const left = deadline - Date.now();
    if (left < MIN_MS) throw kino2.error("timeout", "no time left for " + new URL(url).hostname);
    return kino2.fetch(url, { headers: { "User-Agent": UA, ...opts.headers || {} }, method: opts.method, body: opts.body, timeoutMs: Math.min(REQUEST_MS, left) });
  };
  req.left = () => Math.max(0, deadline - Date.now());
  return req;
}

// src/std/model.js
var MAX_SLIDES = 5;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 20;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https:\/\//;
function cardOf(item) {
  const out = { id: item.id, ref: item.ref, title: item.title, kind: item.kind };
  if (item.poster && HTTPS.test(item.poster)) out.poster = item.poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.badges) out.badges = item.badges;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.ids && item.ids.tmdb) out.ids = { tmdb: item.ids.tmdb };
  if (item.lang) out.lang = item.lang;
  if (item.adult === true) out.adult = true;
  return out;
}
var slidesOf = (rows) => pickSlides(rows, (item) => item.backdrop);
var posterSlidesOf = (rows) => pickSlides(rows, (item) => item.poster);
function slideText(overview, item = {}) {
  const text2 = typeof overview === "string" ? overview.trim() : "";
  if (text2 === "") return [item.year, item.rating ? "\u2605 " + item.rating : null].filter(Boolean).join(" \xB7 ");
  return text2.length <= MAX_SLIDE_TEXT ? text2 : `${text2.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`;
}
function pickSlides(rows, pictureOf) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    for (const item of row.items || []) {
      if (out.length >= MAX_SLIDES) return out;
      const image = pictureOf(item);
      if (item.adult === true || seen.has(item.id) || !image || !HTTPS.test(image)) continue;
      seen.add(item.id);
      out.push({ id: item.id, ref: item.ref, kind: item.kind, title: item.title, image, text: slideText(item.overview, item) });
    }
  }
  return out;
}
var uniform = (items) => items.every((i) => i.backdrop) ? items : items.map(({ backdrop, ...rest }) => rest);
function railsOf(rows) {
  return rows.filter((r) => r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.ref ? { ref: r.ref } : {},
    items: uniform(r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf))
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), posterSlides: posterSlidesOf(rows), rails };
}
function playedKey(ref) {
  const m = /^(?:m|s|e):(\d{1,10})(?::|$)/.exec(String(ref || ""));
  return m ? `t:${m[1]}` : String(ref || "");
}
function recentOf(keys, tabs) {
  if (keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        const ks = [card.ref];
        if (card.ids && card.ids.tmdb) ks.push(`t:${card.ids.tmdb}`);
        for (const k of ks) if (!byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/std/strings.js
var WORDS = {
  watch: ["Ver", "Watch"],
  info: ["M\xE1s informaci\xF3n", "More info"],
  recent: ["Continuar viendo", "Continue watching"],
  search: ["Buscar", "Search"],
  searchHint: ["Buscar en {name}", "Search {name}"],
  failed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  retry: ["Reintentar", "Retry"],
  empty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  back: ["Atr\xE1s", "Back"],
  close: ["Cerrar", "Close"],
  settings: ["Ajustes", "Settings"],
  supportTv: ["Si te gusta mi trabajo, escan\xE9alo y ap\xF3yame", "If you like my work, scan it and support me"],
  support: ["Si te gusta mi trabajo, ap\xF3yame", "If you like my work, support me"],
  gateTitle: ["Necesitas el motor de reproducci\xF3n", "You need the playback engine"],
  gateText: [
    "{name} reproduce a trav\xE9s de Kino Resolver (gratis). Inst\xE1lalo una vez y sirve para este y para otros plugins de sitios.",
    "{name} plays through Kino Resolver (free). Install it once and it works here and in other site plugins."
  ],
  gateInstall: ["Instalar Kino Resolver", "Install Kino Resolver"]
};
var fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] != null ? String(vars[k]) : m);
function twin(key, field = "text", vars) {
  const [es, en] = WORDS[key];
  const pick = (i) => vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Array.isArray(v) ? v[i] : v]));
  return { [field]: fill(es, pick(0)), [field + "En"]: fill(en, pick(1)) };
}
var STRING_KEYS = Object.keys(WORDS);

// src/std/view.js
var SUPPORT_URL = "https://ko-fi.com/xuperplugins";
var RESOLVER_REPO = "xuper-plugin/kino-plugin-kino-resolver";
var POLL_MS = 1500;
function brand(cfg) {
  return {
    type: "Row",
    key: "brand",
    gap: 12,
    crossAxisAlignment: "center",
    children: [
      ...cfg.logo ? [{ type: "Image", key: "logo", url: cfg.logo, aspect: cfg.logoAspect || "1:1", fit: "contain", h: 32, alt: cfg.name, altEn: cfg.nameEn || cfg.name }] : [],
      { type: "Text", key: "name", style: "h4", text: cfg.name, textEn: cfg.nameEn || cfg.name }
    ]
  };
}
var tabBar = (tabs, active) => ({
  type: "TabBar",
  key: "tabs",
  divider: false,
  value: active,
  onChanged: "tab",
  tabs: tabs.map((t2) => ({ value: t2.id, label: t2.label, labelEn: t2.labelEn || t2.label }))
});
var iconButton = (key, icon, word, onPressed) => ({ type: "IconButton", key, icon, ...twin(word, "labelText"), ...twin(word, "tooltip"), onPressed });
var searchOpenOps = (tabsInBar) => [
  { hide: "brand" },
  { hide: "searchButton" },
  { hide: "settingsButton" },
  ...tabsInBar ? [{ hide: "tabs" }] : [],
  { show: "closeSearch" },
  { show: "q" },
  { focus: "q" }
];
var searchClosedOps = (tabsInBar) => [
  { hide: "closeSearch" },
  { hide: "q" },
  { clear: "q" },
  { show: "brand" },
  { show: "searchButton" },
  { show: "settingsButton" },
  ...tabsInBar ? [{ show: "tabs" }] : []
];
function supportNode(device) {
  if (device === "tv") return { type: "QrImage", key: "donate", value: SUPPORT_URL, size: "large", ...twin("supportTv", "labelText") };
  return { type: "ElevatedButton", key: "donate", icon: "heart", ...twin("support", "labelText"), onPressed: { go: { url: { href: SUPPORT_URL } } } };
}
var bar = ({ leading, title, actions = [] }) => ({ type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false, leading, title, actions });
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line", width: 120 },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var heroSkeleton = () => ({ type: "Skeleton", key: "heroSkeleton", shape: "block", height: { compact: 200, expanded: 320 } });
var titleOf = (s) => ({ ref: s.ref, kind: s.kind, id: s.id, title: s.title });
var withHeaders = (headers) => headers ? { headers } : {};
var slideNode = (s, headers) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  ...s.logo ? { logo: s.logo } : {},
  title: s.title,
  text: s.text,
  image: s.image,
  ...withHeaders(headers),
  buttons: [
    { type: "ElevatedButton", key: "watch-" + s.id, ...twin("watch", "labelText"), icon: "play", onPressed: { go: { play: titleOf(s) } } },
    { type: "TextButton", key: "info-" + s.id, ...twin("info", "labelText"), onPressed: { go: { title: titleOf(s) } } }
  ]
});
var hero = (slides, headers) => slides.length === 1 ? slideNode(slides[0], headers) : {
  type: "PageView",
  key: "hero" + slides.length,
  autoPlayMs: 6e3,
  children: slides.map((s) => slideNode(s, headers))
};
var rail = (r, key, words, headers) => ({
  type: "titleRail",
  key,
  ...words || { title: r.title, titleEn: r.titleEn || r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  ...withHeaders(headers)
});
function browseView(cfg, { tab, data, recent, pending, failed, device = "phone" }) {
  const tv = device === "tv";
  const tabs = cfg.tabs;
  const active = tabs.some((t2) => t2.id === tab) ? tab : tabs[0].id;
  const withTabs = tabs.length > 1;
  const body = [];
  if (data) {
    const h = cfg.imageHeaders;
    if (data.slides.length > 0) body.push(hero(data.slides, h));
    if (recent.length > 0) body.push(rail({ items: recent }, "recent", twin("recent", "title"), h));
    for (const r of data.rails) body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_"), null, h));
    if (data.rails.length === 0) body.push({ type: "Text", key: "empty", ...twin("empty"), color: "muted" });
  } else if (failed) {
    body.push({ type: "MaterialBanner", key: "loadFailed", role: "error", ...twin("failed"), action: { ...twin("retry", "label"), onTap: "retry" } });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  const isBanner = (n) => !!n && (n.type === "heroCard" || n.key === "heroSkeleton" || n.type === "PageView" && String(n.key).startsWith("hero"));
  const banner = body.length > 0 && isBanner(body[0]) ? body.shift() : null;
  const tabsInBar = tv && withTabs;
  const appBar = bar({
    leading: iconButton("close", "close", "close", { go: { close: true } }),
    title: { type: "Row", key: "titleRow", gap: tabsInBar ? 24 : 8, crossAxisAlignment: "center", children: [
      { ...iconButton("closeSearch", "arrow_back", "back", { ui: searchClosedOps(tabsInBar) }), hidden: true },
      brand(cfg),
      ...tabsInBar ? [tabBar(tabs, active)] : [],
      {
        type: "TextField",
        key: "q",
        hidden: true,
        flex: 1,
        kind: "search",
        maxLength: 200,
        ...twin("searchHint", "hintText", { name: [cfg.name, cfg.nameEn || cfg.name] }),
        onSubmitted: "search",
        trailingIcon: "search",
        ...twin("search", "trailingLabel"),
        onTrailingTap: "search"
      }
    ] },
    actions: [
      iconButton("searchButton", "search", "search", { ui: searchOpenOps(tabsInBar) }),
      iconButton("settingsButton", "settings", "settings", "openSettings")
    ]
  });
  return {
    type: "Scaffold",
    appBar,
    body: { type: "Column", key: "page", children: [
      ...withTabs && !tv ? [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(tabs, active)] }] : [],
      { type: "SingleChildScrollView", key: "browse-" + active, flex: 1, children: [...banner ? [banner] : [], { type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function settingsView(cfg, device = "phone") {
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("back", "arrow_back", "back", "back"), title: brand(cfg) }),
    body: { type: "SingleChildScrollView", key: "settings-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: [
      ...cfg.hasSettings ? [{ type: "settings", key: "form" }, { type: "Divider", key: "supportDivider" }] : [],
      supportNode(device)
    ] }] }
  };
}
function gateView(cfg, device = "phone") {
  const name = [cfg.name, cfg.nameEn || cfg.name];
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("close", "close", "close", { go: { close: true } }), title: brand(cfg) }),
    body: { type: "Column", key: "gate", mainAxisAlignment: "center", crossAxisAlignment: "center", padding: 24, gap: 16, children: [
      { type: "Text", key: "gateTitle", style: "h3", ...twin("gateTitle") },
      { type: "Text", key: "gateText", style: "p", ...twin("gateText", "text", { name }) },
      { type: "ElevatedButton", key: "installResolver", ...twin("gateInstall", "labelText"), onPressed: { go: { installPlugin: { repo: RESOLVER_REPO } } } },
      supportNode(device)
    ] }
  };
}

// src/std/metaCache.js
var KEY = "meta3";
var MAX = 160;
var CONCURRENCY = 3;
var OVERVIEW_MAX = 160;
var HTTPS2 = /^https:\/\//;
function makeMetaCache({ kino: kino2, titleOf: titleOf2 = (c) => c.title, typeOf = (c) => c.kind === "series" ? "series" : "movie", tmdbPictures = false, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino2.meta === "function" && kino2.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino2.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      kino2.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return {
      ...e.t > 0 ? { tmdb: e.t } : {},
      ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {},
      ...e.p && HTTPS2.test(e.p) ? { poster: e.p } : {},
      ...e.b && HTTPS2.test(e.b) ? { backdrop: e.b } : {},
      ...typeof e.o === "string" && e.o ? { overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const poster = tmdbPictures && k.poster ? k.poster : null;
      if (!k.tmdb && !poster) return c;
      return { ...c, ...k.tmdb && !(c.ids && c.ids.tmdb) ? { ids: { ...c.ids || {}, tmdb: k.tmdb } } : {}, ...poster ? { poster } : {} };
    });
  }
  async function fill2(cards, budgetMs) {
    if (!usable()) return 0;
    const b = read();
    const end = clock.now() + budgetMs;
    let count = 0;
    let stop = false;
    const seen = /* @__PURE__ */ new Set();
    const todo = cards.filter((c) => {
      if (!c || typeof c.id !== "string" || seen.has(c.id) || Object.hasOwn(b, c.id) || c.ids && c.ids.tmdb && c.noLogo) return false;
      seen.add(c.id);
      return true;
    });
    let next = 0;
    const str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
    const worker = async () => {
      while (!stop && next < todo.length && clock.now() < end) {
        const c = todo[next++];
        const year = c.year !== void 0 ? { year: c.year } : {};
        try {
          const a = await kino2.meta({ type: typeOf(c), title: titleOf2(c), ...year });
          b[c.id] = {
            t: a && a.ids && Number.isInteger(a.ids.tmdb) ? a.ids.tmdb : 0,
            l: str(a && a.logo, 2048),
            p: str(a && a.poster, 2048),
            b: str(a && a.backdrop, 2048),
            o: str(a && a.overview, OVERVIEW_MAX)
          };
          count++;
        } catch (e) {
          if (e && e.code === "rate_limited") stop = true;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (count > 0) write();
    return count;
  }
  return { known, asked, dress, fill: fill2, usable, tmdbPictures };
}

// src/std/index.js
var TAB_KEY = "browseTab";
var SNAP_PREFIX = "browse1:";
var SNAP_TTL_MS = 7 * 24 * 3600 * 1e3;
var SNAP_MAX = 20 * 1024;
var RECENT_KEY = "recent1";
var RECENT_MAX = 12;
var Q_MAX = 200;
var META_TICK_MS = 3e3;
var MAX_META_TICKS = 10;
var DEFAULT_TABS = [{ id: "inicio", label: "Inicio", labelEn: "Home" }];
function makeStandardScreen({ kino: kino2, name, nameEn, logo = null, logoAspect = "1:1", needsResolver, hasSettings, tabs, loadTab, homeKey = null, titleOf: titleOf2, typeOf, tmdbPictures = false, imageHeaders = null }) {
  const cfg = { name, nameEn, logo, logoAspect, imageHeaders, hasSettings: !!hasSettings, tabs: Array.isArray(tabs) && tabs.length > 0 ? tabs : DEFAULT_TABS };
  const TAB_IDS = cfg.tabs.map((t2) => t2.id);
  const meta2 = makeMetaCache({ kino: kino2, titleOf: titleOf2, typeOf, tmdbPictures });
  function slidesFromMeta(rails) {
    const out = [];
    for (const r of rails) {
      for (const c of r.items) {
        if (out.length >= MAX_SLIDES) return out;
        const k = meta2.known(c.id);
        if (!k.backdrop || c.adult === true || out.some((x) => x.id === c.id)) continue;
        out.push({ id: c.id, ref: c.ref, kind: c.kind, title: c.title, image: k.backdrop, text: slideText(k.overview, c), ...k.logo ? { logo: k.logo } : {} });
      }
    }
    return out;
  }
  const enrich = (data) => {
    if (!data) return data;
    const own = data.slides.map((s) => {
      const k = meta2.known(s.id);
      const image = tmdbPictures && k.backdrop ? k.backdrop : null;
      return k.logo || image ? { ...s, ...k.logo ? { logo: k.logo } : {}, ...image ? { image } : {} } : s;
    });
    const learned = own.length > 0 ? [] : slidesFromMeta(data.rails);
    return {
      // The site's own backdrops, else TMDB's, else the posters: every plugin has a hero.
      slides: own.length > 0 ? own : learned.length > 0 ? learned : data.posterSlides || [],
      rails: data.rails.map((r) => ({ ...r, items: meta2.dress(r.items) }))
    };
  };
  const metaTicks = /* @__PURE__ */ new Map();
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino2.log("[std]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino2.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino2.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  function writeSnap(tab, data) {
    for (let per = 10; per >= 3; per -= 2) {
      const slim = { slides: data.slides, posterSlides: data.posterSlides || [], rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, per) })) };
      const text2 = JSON.stringify({ at: Date.now(), data: slim });
      if (text2.length <= SNAP_MAX) {
        set(SNAP_PREFIX + tab, text2, { ttlMs: SNAP_TTL_MS });
        return;
      }
    }
  }
  function homeSeed(tab) {
    if (!homeKey || tab !== TAB_IDS[0]) return null;
    try {
      const o = JSON.parse(get(homeKey) || "null");
      return o && Array.isArray(o.rows) && o.rows.length ? tabOf({ rows: o.rows }) : null;
    } catch (_) {
      return null;
    }
  }
  const stored = () => {
    const t2 = get(TAB_KEY);
    return TAB_IDS.includes(t2) ? t2 : null;
  };
  function dataOf(tab) {
    if (memo.has(tab)) return memo.get(tab).data;
    const snap = readSnap(tab) || homeSeed(tab);
    if (snap) {
      memo.set(tab, { data: snap, whole: false });
      return snap;
    }
    return null;
  }
  const readKeys = () => {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  };
  function notePlayed(ref) {
    try {
      const key = playedKey(ref);
      if (key === "" || key.startsWith("x|")) return;
      const keys = readKeys();
      if (keys[0] === key) return;
      set(RECENT_KEY, JSON.stringify([key, ...keys.filter((k) => k !== key)].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab) {
    return memo.get(tab) && memo.get(tab).whole ? [] : [tab];
  }
  function screen2(ctx) {
    const c = ctx || {};
    const device = c.device || "phone";
    if (needsResolver && !(c.installed && c.installed[RESOLVER_REPO])) return gateView(cfg, device);
    if (c.route && c.route.name === "settings") return settingsView(cfg, device);
    const st = c.state && typeof c.state === "object" ? c.state : {};
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(c.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t2) => memo.get(t2)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    return browseView(cfg, { tab, data, recent: meta2.dress(recentOf(readKeys(), loaded)), pending, failed: !!(st.failed && st.failed[tab]), device });
  }
  async function load(tab) {
    const data = tabOf(await loadTab(tab));
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const events = {
    open({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t2 of TAB_IDS) dataOf(t2);
      return { state: { tab, pending: needed(tab), failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      set(TAB_KEY, tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t2) => t2 !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      return { state: { failed: null, pending: [tab] } };
    },
    async tick({ state }) {
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const tab = next.slice(5);
        const m = memo.get(tab);
        if (!m) return { state: { pending: rest } };
        const ask = (x) => ({ id: x.id, title: x.title, kind: x.kind, ...x.year !== void 0 ? { year: x.year } : {} });
        const noOwnSlides = m.data.slides.length === 0;
        const cards = [...m.data.slides.map(ask), ...m.data.rails.flatMap((r) => r.items.slice(0, noOwnSlides ? MAX_SLIDES * 3 : 6).map(ask))];
        const count = await meta2.fill(cards, META_TICK_MS);
        const ticks = (metaTicks.get(tab) || 0) + 1;
        metaTicks.set(tab, ticks);
        const again = noOwnSlides && count > 0 && ticks < MAX_META_TICKS && slidesFromMeta(m.data.rails).length < MAX_SLIDES && cards.some((c) => !meta2.asked(c.id));
        return { state: { pending: again ? [next, ...rest] : rest } };
      }
      try {
        const ok = await load(next);
        if (!ok) failed[next] = true;
        else delete failed[next];
        if (ok && meta2.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("tab", e && e.code || "error");
        failed[next] = true;
      }
      return { state: { pending: rest, failed } };
    },
    // The words go to Kino's own search, with this plugin as the source; the bar is put back as it was, locally.
    search({ value, state, device }) {
      const typed = value && typeof value === "object" ? value.q : value;
      const raw = typed != null && String(typed).trim() !== "" ? typed : state.inputs && state.inputs.q;
      const q = String(raw == null ? "" : raw).trim().slice(0, Q_MAX);
      return q ? { go: { search: { q } }, ui: searchClosedOps(device === "tv" && TAB_IDS.length > 1) } : null;
    },
    openSettings() {
      return { route: { push: "settings" }, state: { fromBrowse: true } };
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { fromBrowse: false } };
    }
  };
  async function screenEvent2(ev) {
    const e = ev || {};
    const name2 = e.name != null ? e.name : e.event;
    const handler = typeof name2 === "string" && Object.hasOwn(events, name2) ? events[name2] : null;
    return handler ? await handler({ ...e, state: e.state || {} }) ?? null : null;
  }
  return { screen: screen2, screenEvent: screenEvent2, notePlayed };
}

// src/logo.js
var LOGO = "data:image/png;base64,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";
var LOGO_ASPECT = "1:1";

// src/resolve-door.js
var HLS_MIME = "application/vnd.apple.mpegurl";
var RESOLVER_ALIAS = "resolver";
var CAPTURE_MS = 2e4;
function headersOf(s) {
  const out = {};
  if (s.referer) out.Referer = s.referer;
  const h = s.headers;
  if (Array.isArray(h)) for (const x of h) {
    if (x && x.name) out[x.name] = String(x.value);
  }
  else if (h && typeof h === "object") for (const [k, v] of Object.entries(h)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}
function pickBest(streams) {
  return streams.find((s) => s && s.url && (s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url))) || streams.find((s) => s && s.url) || null;
}
async function captureStreams(kino2, embedUrl, referer) {
  const b = kino2 && kino2.browser;
  if (!b || typeof b.capture !== "function") return [];
  const opts = { timeoutMs: CAPTURE_MS, match: "\\.m3u8|\\.mp4" };
  if (referer) opts.headers = { Referer: referer };
  let cap;
  try {
    cap = await b.capture(embedUrl, opts);
  } catch (_) {
    return [];
  }
  const out = [];
  for (const m of cap && cap.media || []) {
    if (!m || !m.url) continue;
    out.push({ url: m.url, kind: /\.m3u8(\?|$)/i.test(m.url) ? "hls" : "mp4", server: "browser", headers: m.headers || {} });
  }
  return out;
}
async function resolveViaHelper(embedUrl, kino2, referer, allowCapture = true) {
  let res = null;
  try {
    res = await kino2.plugins.call(RESOLVER_ALIAS, "resolve", { url: embedUrl, referer });
  } catch (err) {
    try {
      kino2.log("[cinehdplus]", "resolver", err && err.code || "call_failed");
    } catch (_) {
    }
  }
  let streams = res && Array.isArray(res.streams) ? res.streams.slice() : [];
  const subtitles = res && Array.isArray(res.subtitles) ? res.subtitles.filter((x) => x && x.lang && x.url) : [];
  let captured = false;
  const dead = !streams.length && res && res.error === "dead";
  if (!streams.length && !dead && (typeof allowCapture === "function" ? allowCapture() : allowCapture)) {
    streams = await captureStreams(kino2, embedUrl, referer);
    captured = streams.length > 0;
  }
  const s = pickBest(streams);
  if (!s) return null;
  const headers = headersOf(s);
  const isHls = s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url);
  return {
    url: s.url,
    mime: isHls ? HLS_MIME : /\.mp4(\?|$)/i.test(s.url) ? "video/mp4" : void 0,
    ...Object.keys(headers).length ? { headers } : {},
    ...captured ? { captured: true } : {},
    ...subtitles.length ? { subtitles } : {}
  };
}
async function resolverInstalled(kino2) {
  try {
    await kino2.plugins.call(RESOLVER_ALIAS, "normalizeHost", { url: "https://probe.invalid/" });
    return true;
  } catch (err) {
    return (err && err.code) !== "provider_missing";
  }
}

// src/util/terms.js
function searchTerms(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const out = [];
  const add = (s) => {
    const v = String(s || "").trim();
    if (v.length >= 2 && !out.some((x) => norm(x) === norm(v))) out.push(v);
  };
  add(q);
  if (arg && typeof arg === "object") {
    add(arg.originalTitle);
    for (const a of Array.isArray(arg.altTitles) ? arg.altTitles : []) add(a);
  }
  add(q.split(/\s*[:\-–—]\s*/)[0]);
  return out.slice(0, 4);
}
async function searchWithTerms(arg, one) {
  for (const q of searchTerms(arg)) {
    const found = await one(arg && typeof arg === "object" ? { ...arg, q } : q);
    if (found.length) return found;
  }
  return [];
}

// src/util/probe.js
var PEEK_BYTES = 2048;
async function peek(kino2, out, ms = 6e3) {
  try {
    const r = await kino2.fetch(out.url, { headers: { Range: `bytes=0-${PEEK_BYTES - 1}`, ...out.headers || {} }, timeoutMs: ms, maxBytes: PEEK_BYTES });
    return r.ok || r.status === 401 || r.status === 403 || r.status === 416 ? "ok" : "dead";
  } catch (e) {
    if (e && (e.code === "host_not_allowed" || e.code === "too_large")) return "ok";
    return e && e.code === "timeout" ? "slow" : "dead";
  }
}

// src/util/home.js
var BUDGET_MS = 11e3;
var KEEP_MS = 12 * 60 * 60 * 1e3;
var MAX_CHARS = 60 * 1024;
function keep(key, rows) {
  try {
    for (let per = 20; per >= 4; per -= 4) {
      const text2 = JSON.stringify({ at: Date.now(), rows: rows.map((r) => ({ ...r, items: Array.isArray(r.items) ? r.items.slice(0, per) : r.items })) });
      if (text2.length <= MAX_CHARS) {
        kino.storage.set(key, text2, { ttlMs: KEEP_MS });
        return;
      }
    }
  } catch (_) {
  }
}
function kept(key) {
  try {
    const o = JSON.parse(kino.storage.get(key) || "null");
    return o && Date.now() - o.at < KEEP_MS && Array.isArray(o.rows) && o.rows.length ? o.rows : null;
  } catch (_) {
    return null;
  }
}
async function homeWithin(jobs, { key = "home:last", budgetMs = BUDGET_MS } = {}) {
  const out = jobs.map(() => null);
  let done = false;
  const all = Promise.all(jobs.map((job, i) => Promise.resolve().then(job).then((row) => {
    out[i] = row;
  }, () => {
  }))).then(() => {
    done = true;
  });
  const end = Date.now() + budgetMs;
  while (!done && Date.now() < end) await Promise.race([all, kino.sleep(Math.min(250, Math.max(1, end - Date.now())))]);
  const rows = out.filter(Boolean);
  if (rows.length) {
    keep(key, rows);
    return rows;
  }
  return kept(key) || [];
}

// src/plugin.js
globalThis.__kinoDropPendingFetches = true;
var CACHE_MS = 10 * 60 * 1e3;
var RESOLVE_MS = 6e4;
var MAX_CAPTURES = 2;
var CAPTURE_PAGE_MS = 23e3;
function takeCapture(budget) {
  if (!budget || budget.captures <= 0 || budget.deadline - Date.now() < CAPTURE_PAGE_MS) return false;
  budget.captures -= 1;
  return true;
}
var MAX_COPIES = 10;
var PAGE = 24;
var STRINGS = {
  es: {
    news: "Novedades",
    movies: "Pel\xEDculas",
    series: "Series",
    genres: "G\xE9neros",
    popular: "Populares",
    recentMovies: "Pel\xEDculas recientes",
    recentSeries: "Series recientes",
    popularMovies: "Pel\xEDculas populares",
    popularSeries: "Series populares",
    topMovies: "Pel\xEDculas mejor valoradas",
    topSeries: "Series mejor valoradas",
    more: "M\xE1s",
    lat: "Latino",
    cast: "Castellano",
    sub: "Subtitulado",
    episode: "Episodio",
    heroText: "Pel\xEDculas y series en espa\xF1ol, con estrenos al d\xEDa.",
    unavailable: "El servicio no est\xE1 disponible en este momento.",
    noEpisodes: "No se encontraron episodios de esta serie.",
    noStreams: "Ning\xFAn servidor de este t\xEDtulo abri\xF3. Prueba m\xE1s tarde.",
    statusLine: "Listas guardadas: {n}",
    cacheCleared: "Cach\xE9 vaciada.",
    needResolver: "Para reproducir, abre CineHD Plus desde el men\xFA e instala el motor de reproducci\xF3n que te pedir\xE1."
  },
  en: {
    news: "What's new",
    movies: "Movies",
    series: "Series",
    genres: "Genres",
    popular: "Popular",
    recentMovies: "Recent movies",
    recentSeries: "Recent series",
    popularMovies: "Popular movies",
    popularSeries: "Popular series",
    topMovies: "Top rated movies",
    topSeries: "Top rated series",
    more: "More",
    lat: "Latino",
    cast: "Castilian",
    sub: "Subtitled",
    episode: "Episode",
    heroText: "Movies and series in Spanish, with new releases.",
    unavailable: "The service is not available right now.",
    noEpisodes: "No episodes found for this series.",
    noStreams: "No server of this title opened. Try again later.",
    statusLine: "Lists kept: {n}",
    cacheCleared: "Cache cleared.",
    needResolver: "To play, open CineHD Plus from the menu and install the playback engine it asks for."
  }
};
var t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};
async function getPage(url, headers) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...headers || {} }, timeoutMs: 15e3 });
  if (!r.ok) throw kino.error("unavailable", `CineHD Plus ${r.status} ${url}`, { userMessage: t("unavailable") });
  return r.text();
}
async function cached(key, fn) {
  try {
    const raw = kino.storage.get("c:" + key);
    const e = raw ? JSON.parse(raw) : null;
    if (e && Date.now() - e.at < CACHE_MS) return e.v;
  } catch (_) {
  }
  const v = await fn();
  if (Array.isArray(v) && !v.length) return v;
  try {
    kino.storage.set("c:" + key, JSON.stringify({ at: Date.now(), v }), { ttlMs: CACHE_MS });
  } catch (_) {
  }
  return v;
}
function toItem(card, genreName) {
  const item = { id: "ch-" + card.id, ref: (card.kind === "movie" ? "m:" : "s:") + card.id + ":" + card.slug, title: card.title, kind: card.kind };
  if (card.poster) item.poster = card.poster;
  if (card.year) item.year = String(card.year);
  if (card.rating) item.rating = card.rating;
  if (card.quality) {
    item.quality = card.quality.slice(0, 20);
    item.badges = [card.quality];
  }
  if (card.lang === "lat") item.lang = "es-419";
  else if (card.lang === "cast") item.lang = "es-ES";
  if (card.overview) item.overview = card.overview;
  const genres = card.genres && card.genres.length ? card.genres : genreName ? [genreName] : [];
  if (genres.length) item.genres = genres.slice(0, 5);
  return item;
}
var LISTS = {
  peliculas: { path: "/peliculas/", query: "sort=recent", titleKey: "recentMovies", genre: "peliculas" },
  populares: { path: "/peliculas/", query: "sort=popular", titleKey: "popularMovies", genre: "peliculas" },
  mejores: { path: "/peliculas/", query: "sort=rating", titleKey: "topMovies", genre: "peliculas" },
  series: { path: "/series/", query: "sort=recent", titleKey: "recentSeries", genre: "series" },
  spopulares: { path: "/series/", query: "sort=popular", titleKey: "popularSeries", genre: "series" },
  smejores: { path: "/series/", query: "sort=rating", titleKey: "topSeries", genre: "series" }
};
function refOf(ref) {
  const m = /^(list|genre):([a-z0-9-]+)$/.exec(String(ref || ""));
  if (!m) return null;
  if (m[1] === "list") {
    const l = LISTS[m[2]];
    return l ? { ...l, title: t(l.titleKey) } : null;
  }
  const g = GENRES.find((x) => x[0] === m[2]);
  return g ? { path: "/genero/" + g[0] + "/", title: g[1], genre: void 0, genreName: g[1] } : null;
}
async function listPage(def, page) {
  const url = SITE + def.path + (def.query ? "?" + def.query + (page > 1 ? "&page=" + page : "") : page > 1 ? "page/" + page + "/" : "");
  const cards = await cached(`l:${def.path}:${def.query || ""}:${page}`, async () => parseCards(await getPage(url)));
  return { cards, more: cards.length >= PAGE };
}
var safeRow = async (id, fn) => {
  try {
    return await fn();
  } catch (e) {
    kino.log("row " + id + ": " + (e && e.message));
    return null;
  }
};
async function rowOf(id, ref, genre) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1);
  const items = cards.slice(0, 20).map((c) => toItem(c, def.genreName));
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}
async function home() {
  return homeWithin([
    () => safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    () => safeRow("series", () => rowOf("series", "list:series")),
    () => safeRow("populares", () => rowOf("populares", "list:populares")),
    () => safeRow("spopulares", () => rowOf("spopulares", "list:spopulares")),
    () => safeRow("mejores", () => rowOf("mejores", "list:mejores"))
  ]);
}
async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : void 0 };
}
async function searchOne(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/search/${encodeURIComponent(q)}/`)));
  const only = within ? within.genre === "peliculas" ? "movie" : within.genre === "series" ? "series" : null : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}
var search = (arg) => searchWithTerms(arg, searchOne);
async function section({ tab } = {}) {
  const tabs = [{ id: "novedades", label: t("news") }, { id: "peliculas", label: t("movies") }, { id: "series", label: t("series") }, { id: "generos", label: t("genres") }];
  const chosen = tabs.some((x) => x.id === tab) ? tab : "novedades";
  const rowsOf = (...names) => Promise.all(names.map((n) => safeRow(n, () => rowOf(n, "list:" + n))));
  let rows = [];
  if (chosen === "novedades") rows = await rowsOf("peliculas", "series", "populares");
  else if (chosen === "peliculas") rows = await rowsOf("peliculas", "populares", "mejores");
  else if (chosen === "series") rows = await rowsOf("series", "spopulares", "smejores");
  else rows = await Promise.all(GENRES.slice(0, 6).map(([slug]) => safeRow("g-" + slug, () => rowOf("g-" + slug, "genre:" + slug, slug))));
  rows = rows.filter(Boolean);
  const answer = { tabs, tab: chosen, rows };
  const first = rows.flatMap((r) => r.items).find((i) => i.poster);
  if (first) answer.hero = { title: first.title, text: t("heroText"), image: first.poster };
  return answer;
}
async function categories() {
  return GENRES.map(([slug, name]) => ({ id: "g-" + slug, title: name, ref: "genre:" + slug }));
}
var partsOf = (ref, prefix) => {
  const m = new RegExp(`^${prefix}:(\\d+):([A-Za-z0-9%._-]+)$`).exec(String(ref || ""));
  return m ? { id: m[1], slug: m[2] } : null;
};
var titlePage = (kind, id, slug) => cached("p:" + kind + id, async () => parseTitle(await getPage(`${SITE}/${kind === "movie" ? "pelicula" : "series-tv"}-${id}/${slug}/`)));
async function details(ref) {
  const x = partsOf(ref, "m");
  if (!x) return null;
  const p = await titlePage("movie", x.id, x.slug);
  if (!p) return null;
  const out = { overview: p.overview || void 0, genres: p.genres.length ? p.genres : void 0, poster: p.poster || void 0, year: p.year ? String(p.year) : void 0 };
  for (const k of Object.keys(out)) if (out[k] === void 0) delete out[k];
  return out;
}
async function episodes(ref) {
  const x = partsOf(ref, "s");
  if (!x) throw kino.error("not_found", "unknown ref: " + ref);
  const p = await titlePage("series", x.id, x.slug);
  const list = p ? p.seasons.flatMap((s) => s.episodes) : [];
  if (!list.length) throw kino.error("not_found", "no episodes for " + x.slug, { userMessage: t("noEpisodes") });
  const series = { title: p.title || void 0, poster: p.poster || void 0, overview: p.overview || void 0, genres: p.genres.length ? p.genres : void 0, year: p.year ? String(p.year) : void 0 };
  for (const k of Object.keys(series)) if (series[k] === void 0) delete series[k];
  return {
    series,
    episodes: list.map((e) => {
      const ep = { season: e.season, number: e.number, ref: `e:${e.id}:${e.slug}`, title: e.title || `${t("episode")} ${e.number}` };
      if (e.thumb) ep.still = e.thumb;
      return ep;
    })
  };
}
var SERVER_NAME = { voe: "VOE", mixdropp: "MixDrop", mixdrop: "MixDrop", streamtape: "StreamTape", streamwish: "StreamWish", vidhide: "VidHide", veev: "Veev", streamplay: "StreamPlay" };
function pageOf(ref) {
  const m = partsOf(ref, "m");
  if (m) return `${SITE}/pelicula-${m.id}/${m.slug}/`;
  const e = partsOf(ref, "e");
  return e ? `${SITE}/episodio-${e.id}/${e.slug}/` : null;
}
function plan(buttons) {
  let pref = "lat";
  try {
    pref = String(kino.config.get("audio") || "lat");
  } catch (_) {
    pref = "lat";
  }
  const lang = (b) => b.lang === pref ? 0 : b.lang === "lat" ? 1 : b.lang === "cast" ? 2 : 3;
  const cost = (b) => /^(mixdrop|mixdropp|streamtape)$/.test(b.domain) ? 0 : /^(streamwish|vidhide)$/.test(b.domain) ? 1 : 2;
  return buttons.map((b, i) => ({ ...b, i, _lt: lang(b) })).sort((a, b) => a._lt - b._lt || cost(a) - cost(b) || a.i - b.i).slice(0, MAX_COPIES);
}
var STATS_KEY = "srvStats";
var STATS_CAP = 24;
function readStats() {
  try {
    const o = JSON.parse(kino.storage.get(STATS_KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch (_) {
    return {};
  }
}
function scoreOf(id, stats) {
  const s = stats[id] || { ok: 0, fail: 0 };
  return (s.ok + 1) / (s.ok + s.fail + 2);
}
function noteServer(id, ok) {
  try {
    const stats = readStats();
    const s = stats[id] || { ok: 0, fail: 0 };
    s[ok ? "ok" : "fail"] += 1;
    if (s.ok + s.fail > STATS_CAP) {
      s.ok = Math.round(s.ok / 2);
      s.fail = Math.round(s.fail / 2);
    }
    stats[id] = s;
    kino.storage.set(STATS_KEY, JSON.stringify(stats));
  } catch (_) {
  }
}
var post = (req, url, fields) => req(url, { method: "POST", body: new URLSearchParams(fields).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: API + "/" } });
async function embedOf(frame, req) {
  const goto = await req(`${API}/ir/goto.php?h=${frame}`, { headers: { Referer: SITE + "/" } });
  if (!goto.ok) return null;
  const u1 = inputValue(await goto.text(), "url");
  if (!u1) return null;
  const rd = await post(req, `${API}/ir/rd.php`, { url: u1 });
  if (!rd.ok) return null;
  const u2 = inputValue(await rd.text(), "url");
  if (!u2) return null;
  const ddh = await post(req, `${API}/ir/redir_ddh.php`, { url: u2, dl: "0" });
  if (!ddh.ok) return null;
  const html = await ddh.text();
  const action2 = formAction(html), vid = inputValue(html, "vid"), hash = inputValue(html, "hash");
  if (!action2 || !vid || !hash) return null;
  const last = await post(req, action2, { vid, hash });
  return last.ok ? finalLink(await last.text()) : null;
}
async function open(button, req, budget) {
  const embed = await embedOf(button.frame, req);
  if (!embed) return null;
  const out = await resolveViaHelper(embed, kino, SITE + "/", () => takeCapture(budget));
  return out;
}
var labelOf = (b) => `${t(b.lang || "sub")} \xB7 ${SERVER_NAME[b.domain] || b.domain}`;
async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  if (!await resolverInstalled(kino)) throw kino.error("unavailable", "resolver missing", { userMessage: t("needResolver") });
  const buttons = plan(parseButtons(await getPage(pageUrl, { Referer: SITE + "/" })));
  if (!buttons.length) throw kino.error("not_found", "no servers on " + pageUrl, { userMessage: t("noStreams") });
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const budget = { captures: MAX_CAPTURES, deadline: Date.now() + RESOLVE_MS };
  const stats = readStats();
  const order = only != null ? [only] : buttons.map((_, k) => k).sort((a, b) => buttons[a]._lt - buttons[b]._lt || scoreOf(buttons[b].domain, stats) - scoreOf(buttons[a].domain, stats) || a - b);
  const deliver = (i, out) => {
    const b = buttons[i];
    const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...out.headers || {} }, label: labelOf(b) };
    if (out.subtitles) stream.subtitles = out.subtitles;
    if (out.durationMs) stream.durationMs = out.durationMs;
    if (only == null) {
      const others = buttons.map((_, j) => j).filter((j) => j !== i);
      if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(buttons[j]) }));
      try {
        standard().notePlayed(base);
      } catch (_) {
      }
    }
    return stream;
  };
  let slow = null;
  const failures = [];
  for (const i of order) {
    const b = buttons[i];
    if (!b) continue;
    try {
      const out = await open(b, req, budget);
      if (!out) {
        failures.push(`${b.domain}: no stream`);
        noteServer(b.domain, false);
        continue;
      }
      if (!out.captured) {
        const answer = await peek(kino, { url: out.url, headers: { "User-Agent": UA, ...out.headers || {} } });
        if (answer === "slow") {
          if (!slow) slow = { i, out };
          failures.push(`${b.domain}: slow`);
          continue;
        }
        if (answer !== "ok") {
          failures.push(`${b.domain}: address does not answer`);
          noteServer(b.domain, false);
          continue;
        }
      }
      noteServer(b.domain, true);
      return deliver(i, out);
    } catch (e) {
      failures.push(`${b.domain}: ${e && e.code || ""} ${e && e.message || e}`.trim());
      noteServer(b.domain, false);
    }
  }
  if (slow) {
    kino.log(`resolve ${base}: only a slow server answered (${failures.join("; ")})`);
    return deliver(slow.i, slow.out);
  }
  kino.log(`resolve ${base} failed: ${failures.join("; ")}`);
  throw kino.error("not_found", "no server opened for " + pageUrl, { userMessage: t("noStreams") });
}
async function settingsStatus() {
  let n = 0;
  try {
    n = kino.storage.keys().filter((k) => k.startsWith("c:")).length;
  } catch (_) {
  }
  return { info: t("statusLine").replace("{n}", String(n)) };
}
async function action(key) {
  if (key === "clearCache") {
    try {
      for (const k of kino.storage.keys()) if (k.startsWith("c:")) kino.storage.remove(k);
    } catch (_) {
    }
    return { message: t("cacheCleared") };
  }
  return { message: "" };
}
var std = null;
var standard = () => std ?? (std = makeStandardScreen({
  kino,
  name: "CineHD Plus",
  logo: LOGO,
  logoAspect: LOGO_ASPECT,
  needsResolver: true,
  hasSettings: true,
  tabs: [
    { id: "novedades", label: "Novedades", labelEn: "What's new" },
    { id: "peliculas", label: "Pel\xEDculas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "generos", label: "G\xE9neros", labelEn: "Genres" }
  ],
  loadTab: async (tabId) => ({ rows: (await section({ tab: tabId })).rows })
}));
async function screen(ctx) {
  await null;
  return standard().screen(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return standard().screenEvent(ev && typeof ev === "object" ? ev : {});
}
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  resolve,
  screen,
  screenEvent,
  search,
  section,
  settingsStatus
};
