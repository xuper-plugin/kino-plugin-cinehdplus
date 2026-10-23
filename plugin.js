var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
var decode = (s) => String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
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

// src/extractors/mixdrop.js
var mixdrop_exports = {};
__export(mixdrop_exports, {
  HOSTS: () => HOSTS,
  extract: () => extract
});

// src/util/unpack.js
var ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var toNum = (s, radix) => [...s].reduce((n, ch) => n * radix + ALPHA.indexOf(ch), 0);
function unpack(source) {
  const m = /}\s*\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'\.split\('\|'\)/.exec(source || "");
  if (!m) return null;
  const payload = m[1].replace(/\\'/g, "'");
  const radix = Number(m[2]);
  const keys = m[4].split("|");
  if (radix < 2 || radix > 62) return null;
  return payload.replace(/\b[0-9a-zA-Z]+\b/g, (w) => {
    const i = toNum(w, radix);
    return Number.isInteger(i) && i >= 0 && keys[i] ? keys[i] : w;
  });
}

// src/extractors/shared.js
var HLS_MIME = "application/vnd.apple.mpegurl";
function fileM3u8(text2, base) {
  const m = /\bfile\s*:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(text2 || "");
  return m ? absolute(m[1], base) : null;
}
function hlsKey(text2, keys, base) {
  for (const k of keys) {
    const m = new RegExp(`["']${k}["']\\s*:\\s*["']([^"']+)["']`).exec(text2 || "");
    if (m) return absolute(m[1].replace(/\\\//g, "/"), base);
  }
  return null;
}
function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch (_) {
    return null;
  }
}
function findIn(html, pick) {
  return pick(html) || pick(unpack(html) || "") || null;
}
function miss(kino2, server, reason) {
  if (kino2 && typeof kino2.log === "function") kino2.log("[cinehdplus]", server, reason);
  return null;
}
async function pageText(req, url, headers, kino2, server) {
  const r = await req(url, { headers });
  return r.ok ? r.text() : miss(kino2, server || "embed", "status " + r.status);
}
var LANG_CODES = [
  [/^(español|espanol|spanish|castellano|latino|spa|esp?)\b/i, "es"],
  [/^(english|inglés|ingles|eng?)\b/i, "en"],
  [/^(portugu[eê]s|portuguese|pt)\b/i, "pt"],
  // never a bare "por": "Por defecto" is not Portuguese
  [/^(fran[cç]ais|french|franc[eé]s|fre|fra|fr)\b/i, "fr"],
  [/^(italiano|italian|ita|it)\b/i, "it"],
  [/^(deutsch|german|alem[aá]n|ger|deu|de)\b/i, "de"]
];
function langCode(label) {
  const s = String(label || "").trim();
  for (const [re, code] of LANG_CODES) if (re.test(s)) return code;
  return null;
}
function captionTracks(text2, base) {
  const m = /["']?\btracks["']?\s*:\s*\[([\s\S]*?)\]/.exec(text2 || "");
  if (!m) return [];
  const out = [];
  for (const [obj] of m[1].matchAll(/\{[^{}]*\}/g)) {
    const field = (k) => (new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']*)["']`).exec(obj) || [])[1] || "";
    const kind = field("kind").toLowerCase();
    if (kind && kind !== "captions" && kind !== "subtitles") continue;
    const file = field("file");
    const format = (/\.(vtt|srt)(?:[?#]|$)/i.exec(file) || [])[1];
    const label = field("label");
    const lang = langCode(label);
    const url = format && lang ? absolute(file, base) : null;
    if (!url || out.some((t2) => t2.url === url)) continue;
    out.push({ lang, url, label, format: format.toLowerCase() });
  }
  return out;
}
function durationMsOf(text2) {
  const re = /(?<![-\w])duration["']?\s*:\s*["']?(\d+(?:\.\d+)?)(?![\d.])(?!\s*m?s\b)/g;
  for (const m of String(text2 || "").matchAll(re)) {
    const ms = Math.round(Number(m[1]) * 1e3);
    if (ms >= 6e4) return ms;
  }
  return null;
}
function pageExtras(html, base) {
  const unpacked = unpack(html) || "";
  const subs = captionTracks(html, base);
  const subtitles = subs.length ? subs : captionTracks(unpacked, base);
  const durationMs = durationMsOf(html) || durationMsOf(unpacked);
  return { ...subtitles.length ? { subtitles } : {}, ...durationMs ? { durationMs } : {} };
}

// src/extractors/mixdrop.js
var HOSTS = ["mxdrop.click", "mixdrop.top", "mixdrop.to", "mixdrop.co", "mixdrop.ag", "mixdrop.ch", "mixdrop.ps", "mixdrop.sx", "mixdrop.bz", "mxdrop.to"];
async function extract(embedUrl, req, kino2) {
  const html = await pageText(req, embedUrl, { Referer: "https://www.doramasyt.com/" }, kino2, "mixdrop");
  if (html == null) return null;
  const raw = findIn(html, (t2) => (/MDCore\.wurl\s*=\s*["']([^"']+)["']/.exec(t2) || [])[1]);
  const url = raw && absolute(raw.startsWith("//") ? "https:" + raw : raw, embedUrl);
  if (!url) return miss(kino2, "mixdrop", "no file in page");
  return { url, mime: "video/mp4", headers: { Referer: new URL(embedUrl).origin + "/" } };
}

// src/extractors/streamtape.js
var streamtape_exports = {};
__export(streamtape_exports, {
  HOSTS: () => HOSTS2,
  addressOf: () => addressOf,
  extract: () => extract2
});
var HOSTS2 = ["streamtape.com", "streamtape.to", "streamtape.net", "streamta.pe", "strtape.cloud", "strcloud.link", "stape.fun", "streamadblocker.xyz"];
var LINE = /getElementById\(\s*['"](robotlink|norobotlink|ideoolink|botlink)['"]\s*\)\.innerHTML\s*=\s*(["'])([^"']*)\2\s*\+\s*(?:''\s*\+\s*)?\(\s*(["'])([^"']*)\4\s*\)((?:\s*\.substring\(\s*\d+\s*\))+)/g;
function addressOf(html) {
  const found = [];
  for (const m of String(html || "").matchAll(LINE)) {
    let tail = m[5];
    for (const [, n] of m[6].matchAll(/\.substring\(\s*(\d+)\s*\)/g)) tail = tail.substring(Number(n));
    found.push({ id: m[1], url: m[3] + tail });
  }
  const pick = found.filter((f) => /get_video\?/.test(f.url) && /token=/.test(f.url));
  const best = pick.find((f) => f.id === "robotlink") || pick.find((f) => f.id === "norobotlink") || pick[pick.length - 1];
  return best ? best.url.startsWith("//") ? "https:" + best.url : best.url : null;
}
async function extract2(embedUrl, req, kino2) {
  const html = await pageText(req, embedUrl, { Referer: "https://www.doramasyt.com/" }, kino2, "streamtape");
  if (html == null) return null;
  const url = addressOf(html);
  if (!url) return miss(kino2, "streamtape", "no address in page");
  return { url, mime: "video/mp4", headers: { Referer: new URL(embedUrl).origin + "/" } };
}

// src/extractors/streamwish.js
var streamwish_exports = {};
__export(streamwish_exports, {
  HOSTS: () => HOSTS3,
  extract: () => extract3
});

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

// src/extractors/streamwish.js
var HOSTS3 = ["embedwish.com", "hlswish.com", "streamwish.com", "streamwish.to", "strwish.com", "wishembed.com", "filelions.com", "hglink.to", "vibuxer.com"];
async function extract3(embedUrl, req, kino2) {
  const u = new URL(embedUrl);
  if (u.hostname === "hglink.to") u.hostname = "vibuxer.com";
  const referer = u.origin + "/";
  const html = await pageText(req, u.href, { Referer: referer }, kino2, "streamwish");
  if (html == null) return null;
  const url = findIn(html, (t2) => hlsKey(t2, ["hls4", "hls2", "hls3"], u.origin) || fileM3u8(t2, u.origin));
  if (!url) return miss(kino2, "streamwish", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { "User-Agent": UA, Referer: referer }, ...pageExtras(html, u.origin) };
}

// src/extractors/vidhide.js
var vidhide_exports = {};
__export(vidhide_exports, {
  HOSTS: () => HOSTS4,
  extract: () => extract4
});
var HOSTS4 = ["vidhide.com", "vidhidepro.com", "vidhideplus.com", "vidhidefast.com", "dintezuvio.com", "minochinos.com", "filelions.to", "morencius.com"];
async function extract4(embedUrl, req, kino2) {
  const u = new URL(embedUrl);
  const html = await pageText(req, embedUrl, { Referer: u.origin + "/" }, kino2, "vidhide");
  if (html == null) return null;
  const url = findIn(html, (t2) => hlsKey(t2, ["hls4", "hls2"], u.origin) || fileM3u8(t2, u.origin));
  if (!url) return miss(kino2, "vidhide", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { Referer: u.origin + "/", Origin: u.origin }, ...pageExtras(html, u.origin) };
}

// src/extractors/index.js
var TABLE = { mixdrop: mixdrop_exports, streamtape: streamtape_exports, streamwish: streamwish_exports, vidhide: vidhide_exports };
function extractorFor(embedUrl) {
  let host;
  try {
    host = new URL(embedUrl).hostname.replace(/^www\./, "");
  } catch (_) {
    return null;
  }
  for (const [name, mod] of Object.entries(TABLE)) {
    if (mod.HOSTS.some((h) => host === h || host.endsWith("." + h))) return { name, extract: mod.extract };
  }
  return null;
}
var HOSTS5 = Object.values(TABLE).flatMap((m) => m.HOSTS);

// src/plugin.js
var CACHE_MS = 10 * 60 * 1e3;
var RESOLVE_MS = 6e4;
var CAPTURE_MS = 2e4;
var MAX_CAPTURES = 1;
var MAX_COPIES = 10;
var PAGE = 24;
var HLS = "application/vnd.apple.mpegurl";
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
    cacheCleared: "Cach\xE9 vaciada."
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
    cacheCleared: "Cache cleared."
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
  return (await Promise.all([
    safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    safeRow("series", () => rowOf("series", "list:series")),
    safeRow("populares", () => rowOf("populares", "list:populares")),
    safeRow("spopulares", () => rowOf("spopulares", "list:spopulares")),
    safeRow("mejores", () => rowOf("mejores", "list:mejores"))
  ])).filter(Boolean);
}
async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : void 0 };
}
async function search(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/search/${encodeURIComponent(q)}/`)));
  const only = within ? within.genre === "peliculas" ? "movie" : within.genre === "series" ? "series" : null : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}
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
  const m = new RegExp(`^${prefix}:(\\d+):([a-z0-9-]+)$`).exec(String(ref || ""));
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
  return buttons.filter((b) => !/^(veev|streamplay)$/.test(b.domain)).map((b, i) => ({ ...b, i })).sort((a, b) => lang(a) - lang(b) || cost(a) - cost(b) || a.i - b.i).slice(0, MAX_COPIES);
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
  const ex = extractorFor(embed);
  if (ex) return ex.extract(embed, req, kino);
  if (!kino.browser || typeof kino.browser.capture !== "function" || budget.captures <= 0) return null;
  budget.captures -= 1;
  const page = await kino.browser.capture(embed, { timeoutMs: CAPTURE_MS, match: "\\.m3u8|\\.mp4", headers: { Referer: SITE + "/" } });
  const media = page && page.media || [];
  const best = media.find((x) => /m3u8/i.test(x.url)) || media[0];
  if (!best) return null;
  return { url: best.url, mime: best.mime || (/\.mp4/i.test(best.url) ? "video/mp4" : HLS), headers: best.headers || { Referer: embed } };
}
var labelOf = (b) => `${t(b.lang || "sub")} \xB7 ${SERVER_NAME[b.domain] || b.domain}`;
async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  const buttons = plan(parseButtons(await getPage(pageUrl, { Referer: SITE + "/" })));
  if (!buttons.length) throw kino.error("not_found", "no servers on " + pageUrl, { userMessage: t("noStreams") });
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const budget = { captures: MAX_CAPTURES };
  const failures = [];
  for (const i of only != null ? [only] : buttons.map((_, k) => k)) {
    const b = buttons[i];
    if (!b) continue;
    try {
      const out = await open(b, req, budget);
      if (!out) {
        failures.push(`${b.domain}: no stream`);
        continue;
      }
      const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...out.headers || {} }, label: labelOf(b) };
      if (out.subtitles) stream.subtitles = out.subtitles;
      if (out.durationMs) stream.durationMs = out.durationMs;
      if (only == null) {
        const others = buttons.map((_, j) => j).filter((j) => j !== i);
        if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(buttons[j]) }));
      }
      return stream;
    } catch (e) {
      failures.push(`${b.domain}: ${e && e.code || ""} ${e && e.message || e}`.trim());
    }
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
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  resolve,
  search,
  section,
  settingsStatus
};
