// Parsers for cinehdplus.org: listing and search cards, a title's page, a series' seasons and the player buttons of a page.
// Follows the CloudStream provider "CineHdPlusProvider" (redblacker8/storm-ext), updated to the site's current layout.

export const SITE = "https://cinehdplus.org";
export const API = "https://api.cinehdplus.org";

/** The site's genres (slug, name). */
export const GENRES = [
  ["accion", "Acción"], ["animacion", "Animación"], ["anime", "Anime"], ["aventura", "Aventura"], ["belica", "Bélica"], ["ciencia-ficcion", "Ciencia ficción"],
  ["comedia", "Comedia"], ["crimen", "Crimen"], ["documental", "Documental"], ["drama", "Drama"], ["familia", "Familia"], ["fantasia", "Fantasía"],
  ["historia", "Historia"], ["misterio", "Misterio"], ["musica", "Música"], ["romance", "Romance"], ["suspense", "Suspense"], ["terror", "Terror"], ["western", "Western"],
];

/** Mirror domains the site's players use, and the host Kino knows them by (the provider's `fixHostsLinks`). */
const MIRRORS = [
  ["streamwish.to", "vibuxer.com"], ["hglink.to", "vibuxer.com"], ["swdyu.com", "vibuxer.com"], ["cybervynx.com", "vibuxer.com"], ["dumbalag.com", "vibuxer.com"],
  ["mivalyo.com", "vidhidepro.com"], ["dinisglows.com", "vidhidepro.com"], ["dhtpre.com", "vidhidepro.com"],
];
export function fixHost(url) {
  let u;
  try { u = new URL(url); } catch (_) { return url; }
  for (const [from, to] of MIRRORS) if (u.hostname === from) { u.hostname = to; return u.href; }
  return url;
}

const decode = (s) => String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (s) => decode(String(s || "").replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** The site's image proxy (`/wp-json/rm/v1/img/?src=/x.jpg&origin=tmdb`) names a TMDB file; Kino loads TMDB directly, at the size a card needs. */
export function posterOf(src, w = "w500") {
  const s = decode(src || "");
  const m = /[?&]src=(\/[^&]+)&[^"]*origin=tmdb/.exec(s) || /[?&]src=(\/[^&]+)/.exec(s);
  if (m && /origin=tmdb/.test(s)) return `https://image.tmdb.org/t/p/${w}${decodeURIComponent(m[1])}`;
  return s;
}

const LANG = (alt) => { const f = String(alt || "").toLowerCase(); return /latino/.test(f) ? "lat" : /castellano|espa[nñ]a/.test(f) ? "cast" : /sub|vose/.test(f) ? "sub" : ""; };

const PAT = '(pelicula|series-tv)-(\\d+)\\/([^"\\/?#]+)';

/**
 * The cards of a listing or a search page: `{ id, slug, kind: "movie"|"series", title, year, poster, rating, quality, lang, overview, genres }`.
 * Two layouts: a poster card (listings: one anchor around the picture and texts) and a wide card (search: an empty anchor with an
 * `aria-label`, and the texts after it).
 */
export function parseCards(html) {
  const out = [];
  const seen = new Set();
  const h = String(html || "");
  const re = new RegExp(`<a ([^>]*)href="https:\\/\\/cinehdplus\\.org\\/${PAT}\\/?"([^>]*)>([\\s\\S]*?)<\\/a>`, "g");
  const all = [...h.matchAll(re)];
  all.forEach((m, i) => {
    const id = m[3];
    if (seen.has(id)) return;
    const inner = m[6];
    const wide = !/<img/.test(inner) && /aria-label="/.test(m[1] + m[5]);
    const chunk = wide ? h.slice(m.index + m[0].length, Math.min(i + 1 < all.length ? all[i + 1].index : Infinity, m.index + m[0].length + 4000)) : inner;
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
      title = at > 0 ? ps[at - 1] : (alt ? text(alt[1]).replace(/\s+-\s+(Película|Serie de TV)$/, "") : "");
      year = at >= 0 ? /^(\d{4})/.exec(ps[at])[1] : undefined;
      overview = ps.find((x) => x.length > 40 && !/·/.test(x) && x !== title);
    }
    if (!title) return;
    seen.add(id);
    const rate = /<span[^>]*>\s*(\d(?:\.\d)?|10(?:\.0)?)\s*<\/span>/.exec(chunk);
    const lang = /alt="(Latino|Castellano|Subtitulado)"/.exec(chunk);
    out.push({
      id, slug: m[4], kind: m[2] === "pelicula" ? "movie" : "series", title, year: year ? Number(year) : undefined, poster: pic ? posterOf(pic[1]) : "",
      rating: rate ? Number(rate[1]) : undefined, quality: quality || "", lang: lang ? LANG(lang[1]) : "", overview: overview || "", genres,
    });
  });
  return out;
}

const meta = (html, prop) => { const m = new RegExp(`<meta property="${prop}" content="([^"]*)"`).exec(html); return m ? decode(m[1]) : ""; };

/** A title's page: overview, original title, year, genres, runtime, cover and the seasons of a series with their episodes. */
export function parseTitle(html) {
  const h = String(html || "");
  const t = /<h2[^>]*class="[^"]*text-xl[^"]*"[^>]*>\s*([\s\S]*?)\s*<span[^>]*>\(?(\d{4})\)?<\/span>/.exec(h);
  const title = t ? text(t[1]) : text((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(h) || [])[1]);
  if (!title) return null;
  const original = (/Título original:\s*([^<]*)/.exec(h) || [])[1];
  const head = t ? h.slice(t.index, t.index + 3500) : h.slice(0, 3500);
  const genres = [...new Set([...head.matchAll(/href="https:\/\/cinehdplus\.org\/genero\/[a-z0-9-]+\/"[^>]*>\s*([^<]+?)\s*</g)].map((m) => text(m[1])))].slice(0, 5);
  const pics = t ? [...h.slice(Math.max(0, t.index - 2500), t.index).matchAll(/<img[^>]*\bsrc="([^"]+)"/g)] : [];
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
      const pic = /<img[^>]*\bsrc="([^"]+)"/.exec(e);
      const date = /<span[^>]*>\s*([A-Z][a-zé]{2,4}\.? \d{1,2}, \d{4})\s*<\/span>/.exec(e);
      eps.push({ id: link[1], slug: link[2], season, number: Number(n[1]), title: ttl ? text(ttl[1]) : "", thumb: pic ? pic[1] : "", date: date ? date[1] : "" });
    }
    if (eps.length && !seasons.some((s) => s.season === season)) seasons.push({ season, episodes: eps });
  }
  return {
    title, original: original ? text(original) : "", overview: meta(h, "og:description"), year: t ? Number(t[2]) : undefined, genres, poster: pic ? posterOf(pic[1]) : meta(h, "og:image"), seasons,
  };
}

/** The player buttons of a movie or episode page: `{ lang: "lat"|"cast"|"sub", domain, frame }` (`frame` is the code after `player.php?h=`). */
export function parseButtons(html) {
  const out = [];
  for (const m of String(html || "").matchAll(/<button[^>]*\bdata-url="([^"]+)"[^>]*\bdata-domain="([^"]*)"[^>]*\bdata-lang="([^"]*)"[^>]*\bdata-type="server"/g)) {
    const f = /player\.php\?h=([^&"]+)/.exec(decode(m[1]));
    if (f) out.push({ lang: LANG(m[3]), domain: m[2], frame: f[1] });
  }
  return out;
}

/** The value of `<input id="...">` in a form page. */
export function inputValue(html, id) {
  const m = new RegExp(`<input[^>]*\\bid="${id}"[^>]*\\bvalue="([^"]*)"|<input[^>]*\\bvalue="([^"]*)"[^>]*\\bid="${id}"`).exec(String(html || ""));
  return m ? decode(m[1] ?? m[2]) : null;
}

/** The address of the form in a page (`<form action="...">`). */
export function formAction(html) {
  const m = /<form[^>]*\baction="([^"]+)"/.exec(String(html || ""));
  return m ? decode(m[1]) : null;
}

/** The video address of the last hop: `link = '<base64>'`. */
export function finalLink(html) {
  const m = /link = '([^']+)'/.exec(String(html || ""));
  if (!m) return null;
  try { return fixHost(atob(m[1])); } catch (_) { return null; }
}
