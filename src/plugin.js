// @ts-check
// Kino plugin: CineHD Plus -- movies and series in Spanish (Latino, Castilian) from cinehdplus.org.
// Follows the CloudStream provider "CineHdPlusProvider", updated to the site's current layout: the listing and title pages, and the player
// buttons of a page, each of which leads through four small pages on the site's own API (api.cinehdplus.org) to the server's video address.
// MixDrop, StreamTape, StreamWish and VidHide open with plain requests (./extractors); VOE goes through the hidden browser.

import { SITE, API, GENRES, parseCards, parseTitle, parseButtons, inputValue, formAction, finalLink } from "./cinehdplus.js";
import { makeReq, UA } from "./util/http.js";
import { makeStandardScreen } from "./std/index.js";
import { LOGO, LOGO_ASPECT } from "./logo.js";
import { resolveViaHelper, resolverInstalled } from "./resolve-door.js";
import { searchWithTerms } from "./util/terms.js";
import { peek } from "./util/probe.js";
import { homeWithin } from "./util/home.js";

// Kino waits for every request a call left running before it delivers the call's answer (quickjs-kt joins the pending async work), so a Home that
// gave up on a slow row at its own budget was still held until that row's request ended, or retried: measured on users' devices Home ran 21-34 s
// with rows logged as "skipped: its source did not answer in time", and Kino threw the whole answer away at 20 s. Asking Kino to drop what a call
// leaves running (the prelude reads this flag after every call; Kino 0.9.55 and later, an older one ignores it) lets the answer leave at the budget.
globalThis.__kinoDropPendingFetches = true;


const CACHE_MS = 10 * 60 * 1000;
const RESOLVE_MS = 60000;
const CAPTURE_MS = 20000;
const MAX_CAPTURES = 2;

// A WebView capture costs up to 20 s whether or not it finds the video, so the budget is spent on the ATTEMPT, and a capture
// only starts if a whole page still fits before this resolve's deadline (Kino gives a browser plugin 75 s; a resolve that
// chained several failed captures ran past it and the person was left on an endless spinner).
const CAPTURE_PAGE_MS = 23000;
/** Spend one hidden-browser capture if the budget and the clock allow it; asked right before the capture starts. */
function takeCapture(budget) {
  if (!budget || budget.captures <= 0 || budget.deadline - Date.now() < CAPTURE_PAGE_MS) return false;
  budget.captures -= 1;
  return true;
}

const MAX_COPIES = 10;
const PAGE = 24;
const HLS = "application/vnd.apple.mpegurl";

// ---- i18n ----

const STRINGS = {
  es: {
    news: "Novedades", movies: "Películas", series: "Series", genres: "Géneros", popular: "Populares", recentMovies: "Películas recientes", recentSeries: "Series recientes",
    popularMovies: "Películas populares", popularSeries: "Series populares", topMovies: "Películas mejor valoradas", topSeries: "Series mejor valoradas", more: "Más",
    lat: "Latino", cast: "Castellano", sub: "Subtitulado", episode: "Episodio",
    heroText: "Películas y series en español, con estrenos al día.",
    unavailable: "El servicio no está disponible en este momento.", noEpisodes: "No se encontraron episodios de esta serie.", noStreams: "Ningún servidor de este título abrió. Prueba más tarde.",
    statusLine: "Listas guardadas: {n}", cacheCleared: "Caché vaciada.",
    needResolver: "Para reproducir, abre CineHD Plus desde el menú e instala el motor de reproducción que te pedirá.",
  },
  en: {
    news: "What's new", movies: "Movies", series: "Series", genres: "Genres", popular: "Popular", recentMovies: "Recent movies", recentSeries: "Recent series",
    popularMovies: "Popular movies", popularSeries: "Popular series", topMovies: "Top rated movies", topSeries: "Top rated series", more: "More",
    lat: "Latino", cast: "Castilian", sub: "Subtitled", episode: "Episode",
    heroText: "Movies and series in Spanish, with new releases.",
    unavailable: "The service is not available right now.", noEpisodes: "No episodes found for this series.", noStreams: "No server of this title opened. Try again later.",
    statusLine: "Lists kept: {n}", cacheCleared: "Cache cleared.",
    needResolver: "To play, open CineHD Plus from the menu and install the playback engine it asks for.",
  },
};
const t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};

// ---- helpers ----

async function getPage(url, headers) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...(headers || {}) }, timeoutMs: 15000 });
  if (!r.ok) throw kino.error("unavailable", `CineHD Plus ${r.status} ${url}`, { userMessage: t("unavailable") });
  return r.text();
}

async function cached(key, fn) {
  try {
    const raw = kino.storage.get("c:" + key);
    const e = raw ? JSON.parse(raw) : null;
    if (e && Date.now() - e.at < CACHE_MS) return e.v;
  } catch (_) { /* no cache */ }
  const v = await fn();
  if (Array.isArray(v) && !v.length) return v; // an empty answer may be a throttle or a hiccup: not kept
  try { kino.storage.set("c:" + key, JSON.stringify({ at: Date.now(), v }), { ttlMs: CACHE_MS }); } catch (_) { /* a full storage only costs a refetch */ }
  return v;
}

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hash36 = (s) => { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0; return h.toString(36); };

function toItem(card, genreName) {
  const item = { id: "ch-" + card.id, ref: (card.kind === "movie" ? "m:" : "s:") + card.id + ":" + card.slug, title: card.title, kind: card.kind };
  if (card.poster) item.poster = card.poster;
  if (card.year) item.year = String(card.year);
  if (card.rating) item.rating = card.rating;
  if (card.quality) { item.quality = card.quality.slice(0, 20); item.badges = [card.quality]; }
  if (card.lang === "lat") item.lang = "es-419"; else if (card.lang === "cast") item.lang = "es-ES";
  if (card.overview) item.overview = card.overview;
  const genres = card.genres && card.genres.length ? card.genres : genreName ? [genreName] : [];
  if (genres.length) item.genres = genres.slice(0, 5);
  return item;
}

// ---- the lists ----

const LISTS = {
  peliculas: { path: "/peliculas/", query: "sort=recent", titleKey: "recentMovies", genre: "peliculas" },
  populares: { path: "/peliculas/", query: "sort=popular", titleKey: "popularMovies", genre: "peliculas" },
  mejores: { path: "/peliculas/", query: "sort=rating", titleKey: "topMovies", genre: "peliculas" },
  series: { path: "/series/", query: "sort=recent", titleKey: "recentSeries", genre: "series" },
  spopulares: { path: "/series/", query: "sort=popular", titleKey: "popularSeries", genre: "series" },
  smejores: { path: "/series/", query: "sort=rating", titleKey: "topSeries", genre: "series" },
};

/** `{ path, query?, title, genre }` for a browse ref ("list:<name>" or "genre:<slug>"); null for anything else. */
function refOf(ref) {
  const m = /^(list|genre):([a-z0-9-]+)$/.exec(String(ref || ""));
  if (!m) return null;
  if (m[1] === "list") { const l = LISTS[m[2]]; return l ? { ...l, title: t(l.titleKey) } : null; }
  const g = GENRES.find((x) => x[0] === m[2]);
  return g ? { path: "/genero/" + g[0] + "/", title: g[1], genre: undefined, genreName: g[1] } : null;
}

/** A sorted list pages with `&page=N` (as the CloudStream provider does); the others with `/page/N/`. */
async function listPage(def, page) {
  const url = SITE + def.path + (def.query ? "?" + def.query + (page > 1 ? "&page=" + page : "") : page > 1 ? "page/" + page + "/" : "");
  const cards = await cached(`l:${def.path}:${def.query || ""}:${page}`, async () => parseCards(await getPage(url)));
  return { cards, more: cards.length >= PAGE };
}

const safeRow = async (id, fn) => { try { return await fn(); } catch (e) { kino.log("row " + id + ": " + (e && e.message)); return null; } };

async function rowOf(id, ref, genre) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1);
  const items = cards.slice(0, 20).map((c) => toItem(c, def.genreName));
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}

// ---- exports ----

export async function home() {
  return homeWithin([
    () => safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    () => safeRow("series", () => rowOf("series", "list:series")),
    () => safeRow("populares", () => rowOf("populares", "list:populares")),
    () => safeRow("spopulares", () => rowOf("spopulares", "list:spopulares")),
    () => safeRow("mejores", () => rowOf("mejores", "list:mejores")),
  ]);
}

export async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : undefined };
}

/** Search is `/search/<text>/`: a page of wide cards, movies and series together. */
async function searchOne(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/search/${encodeURIComponent(q)}/`)));
  const only = within ? (within.genre === "peliculas" ? "movie" : within.genre === "series" ? "series" : null) : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}

export const search = (arg) => searchWithTerms(arg, searchOne);

// ---- the plugin's own section, categories and details ----

export async function section({ tab } = {}) {
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

export async function categories() {
  return GENRES.map(([slug, name]) => ({ id: "g-" + slug, title: name, ref: "genre:" + slug }));
}

/** `{ id, slug }` of a ref with the given prefix ("m", "s" or "e"), or null. A slug may be percent-encoded: the site names
 *  the episodes of an Asian series by their original title (`e:283327:%ed%91%b8...-1x1`), so `%` and either case are allowed. */
const partsOf = (ref, prefix) => { const m = new RegExp(`^${prefix}:(\\d+):([A-Za-z0-9%._-]+)$`).exec(String(ref || "")); return m ? { id: m[1], slug: m[2] } : null; };
const titlePage = (kind, id, slug) => cached("p:" + kind + id, async () => parseTitle(await getPage(`${SITE}/${kind === "movie" ? "pelicula" : "series-tv"}-${id}/${slug}/`)));

/** A movie's own page: synopsis, genres, year and the picture, from the site. */
export async function details(ref) {
  const x = partsOf(ref, "m");
  if (!x) return null;
  const p = await titlePage("movie", x.id, x.slug);
  if (!p) return null;
  const out = { overview: p.overview || undefined, genres: p.genres.length ? p.genres : undefined, poster: p.poster || undefined, year: p.year ? String(p.year) : undefined };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

export async function episodes(ref) {
  const x = partsOf(ref, "s");
  if (!x) throw kino.error("not_found", "unknown ref: " + ref);
  const p = await titlePage("series", x.id, x.slug);
  const list = p ? p.seasons.flatMap((s) => s.episodes) : [];
  if (!list.length) throw kino.error("not_found", "no episodes for " + x.slug, { userMessage: t("noEpisodes") });
  const series = { title: p.title || undefined, poster: p.poster || undefined, overview: p.overview || undefined, genres: p.genres.length ? p.genres : undefined, year: p.year ? String(p.year) : undefined };
  for (const k of Object.keys(series)) if (series[k] === undefined) delete series[k];
  return {
    series,
    episodes: list.map((e) => {
      const ep = { season: e.season, number: e.number, ref: `e:${e.id}:${e.slug}`, title: e.title || `${t("episode")} ${e.number}` };
      if (e.thumb) ep.still = e.thumb;
      return ep;
    }),
  };
}

// ---- resolve ----

const SERVER_NAME = { voe: "VOE", mixdropp: "MixDrop", mixdrop: "MixDrop", streamtape: "StreamTape", streamwish: "StreamWish", vidhide: "VidHide", veev: "Veev", streamplay: "StreamPlay" };

/** The page of a movie ("m:<id>:<slug>") or an episode ("e:<id>:<slug>"). */
function pageOf(ref) {
  const m = partsOf(ref, "m");
  if (m) return `${SITE}/pelicula-${m.id}/${m.slug}/`;
  const e = partsOf(ref, "e");
  return e ? `${SITE}/episodio-${e.id}/${e.slug}/` : null;
}

/** The buttons of a page in the order to try them: the preferred language first, then the quicker inline hosts. Nothing is
 *  dropped up front -- the shared resolver covers far more hosts than this plugin ever did, and a host it does not know
 *  inline (Veev, StreamPlay, ...) is still handed to the WebView capture. */
function plan(buttons) {
  let pref = "lat";
  try { pref = String(kino.config.get("audio") || "lat"); } catch (_) { pref = "lat"; }
  const lang = (b) => (b.lang === pref ? 0 : b.lang === "lat" ? 1 : b.lang === "cast" ? 2 : 3);
  const cost = (b) => (/^(mixdrop|mixdropp|streamtape)$/.test(b.domain) ? 0 : /^(streamwish|vidhide)$/.test(b.domain) ? 1 : 2);
  // `_lt` (the language tier) rides along so resolve can learn a better server order inside each language without disturbing it.
  return buttons.map((b, i) => ({ ...b, i, _lt: lang(b) })).sort((a, b) => a._lt - b._lt || cost(a) - cost(b) || a.i - b.i).slice(0, MAX_COPIES);
}

// ---- learned server reliability (kept in storage; inside a language, the server that opens for this person is tried first next time) ----
const STATS_KEY = "srvStats";
const STATS_CAP = 24; // halve the counts past this, so a server that recovers climbs back
function readStats() { try { const o = JSON.parse(kino.storage.get(STATS_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (_) { return {}; } }
/** Laplace-smoothed success rate of a server domain (unknown = 0.5). */
function scoreOf(id, stats) { const s = stats[id] || { ok: 0, fail: 0 }; return (s.ok + 1) / (s.ok + s.fail + 2); }
/** Record that a server opened (ok=true) or not; never throws. */
function noteServer(id, ok) {
  try {
    const stats = readStats();
    const s = stats[id] || { ok: 0, fail: 0 };
    s[ok ? "ok" : "fail"] += 1;
    if (s.ok + s.fail > STATS_CAP) { s.ok = Math.round(s.ok / 2); s.fail = Math.round(s.fail / 2); }
    stats[id] = s;
    kino.storage.set(STATS_KEY, JSON.stringify(stats));
  } catch (_) { /* the stats are a nicety */ }
}

const post = (req, url, fields) => req(url, { method: "POST", body: new URLSearchParams(fields).toString(), headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: API + "/" } });

/**
 * One button's video address through the site's four small pages: `goto.php?h=<code>` holds a form with the next address, `rd.php` another,
 * `redir_ddh.php` a form that posts `vid` and `hash`, and the last answer names the address in base64.
 */
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
  const action = formAction(html), vid = inputValue(html, "vid"), hash = inputValue(html, "hash");
  if (!action || !vid || !hash) return null;
  const last = await post(req, action, { vid, hash });
  return last.ok ? finalLink(await last.text()) : null;
}

async function open(button, req, budget) {
  const embed = await embedOf(button.frame, req);
  if (!embed) return null;
  // Every hoster embed goes to the shared kino-resolver (door), which falls back to a WebView capture for gated
  // hosts (e.g. VOE) while this call still has capture budget. A `captured` stream skips the playable() probe below.
  const out = await resolveViaHelper(embed, kino, SITE + "/", () => takeCapture(budget));
  return out;
}

const labelOf = (b) => `${t(b.lang || "sub")} · ${SERVER_NAME[b.domain] || b.domain}`;

/** `ref` is a movie ("m:<id>:<slug>"), an episode ("e:<id>:<slug>") or one of their other servers ("c:<ref>@<i>"). */
export async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  if (!(await resolverInstalled(kino))) throw kino.error("unavailable", "resolver missing", { userMessage: t("needResolver") });
  const buttons = plan(parseButtons(await getPage(pageUrl, { Referer: SITE + "/" })));
  if (!buttons.length) throw kino.error("not_found", "no servers on " + pageUrl, { userMessage: t("noStreams") });
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const budget = { captures: MAX_CAPTURES, deadline: Date.now() + RESOLVE_MS };
  // Auto pick: keep the plan's language tiers, but inside each try the server that has opened for this person first.
  // The cp:<base>@<i> indices and the alternatives stay in the stable plan order, so a saved copy ref always holds.
  const stats = readStats();
  const order = only != null ? [only] : buttons.map((_, k) => k).sort((a, b) => buttons[a]._lt - buttons[b]._lt || scoreOf(buttons[b].domain, stats) - scoreOf(buttons[a].domain, stats) || a - b);
  const deliver = (i, out) => {
    const b = buttons[i];
    const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...(out.headers || {}) }, label: labelOf(b) };
    if (out.subtitles) stream.subtitles = out.subtitles;
    if (out.durationMs) stream.durationMs = out.durationMs;
    if (only == null) {
      const others = buttons.map((_, j) => j).filter((j) => j !== i);
      if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(buttons[j]) }));
      try { standard().notePlayed(base); } catch (_) { /* never fails a play */ }
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
      if (!out) { failures.push(`${b.domain}: no stream`); noteServer(b.domain, false); continue; }
      if (!out.captured) {
        const answer = await peek(kino, { url: out.url, headers: { "User-Agent": UA, ...(out.headers || {}) } });
        // A slow CDN is kept as the last resort: the next server is tried, and only if none answers is this one played.
        if (answer === "slow") { if (!slow) slow = { i, out }; failures.push(`${b.domain}: slow`); continue; }
        if (answer !== "ok") { failures.push(`${b.domain}: address does not answer`); noteServer(b.domain, false); continue; }
      }
      noteServer(b.domain, true);
      return deliver(i, out);
    } catch (e) {
      failures.push(`${b.domain}: ${(e && e.code) || ""} ${(e && e.message) || e}`.trim());
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

// ---- Ajustes ▸ CineHD Plus ----

export async function settingsStatus() {
  let n = 0;
  try { n = kino.storage.keys().filter((k) => k.startsWith("c:")).length; } catch (_) { /* no storage */ }
  return { info: t("statusLine").replace("{n}", String(n)) };
}

export async function action(key) {
  if (key === "clearCache") {
    try { for (const k of kino.storage.keys()) if (k.startsWith("c:")) kino.storage.remove(k); } catch (_) { /* nothing to clear */ }
    return { message: t("cacheCleared") };
  }
  return { message: "" };
}

// ---- the screen: the standard xuper-plugin screen (src/std) ----

// CineHD Plus delegates every hoster to kino-resolver (resolve() refuses with needResolver while it is missing), so the screen is the install gate until it is installed.
let std = null;
const standard = () => (std ??= makeStandardScreen({
  kino, name: "CineHD Plus", logo: LOGO, logoAspect: LOGO_ASPECT, needsResolver: true, hasSettings: true,
  tabs: [
    { id: "novedades", label: "Novedades", labelEn: "What's new" },
    { id: "peliculas", label: "Películas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "generos", label: "Géneros", labelEn: "Genres" },
  ],
  loadTab: async (tabId) => ({ rows: (await section({ tab: tabId })).rows }),
}));

export async function screen(ctx) {
  await null;
  return standard().screen(ctx && typeof ctx === "object" ? ctx : {});
}

export async function screenEvent(ev) {
  await null;
  return standard().screenEvent(ev && typeof ev === "object" ? ev : {});
}
