import test from "node:test";
import assert from "node:assert/strict";
import { parseCards, parseTitle, parseButtons, inputValue, formAction, finalLink, posterOf, fixHost } from "../src/cinehdplus.js";

const IMG = (src, alt) => `<img src="https://cinehdplus.org/wp-json/rm/v1/img/?src=/${src}.jpg&#038;w=300&#038;q=82&#038;f=webp&#038;origin=tmdb" alt="${alt}">`;
const POSTER = (kind, id, slug, title, year, kindText) => `<a href="https://cinehdplus.org/${kind}-${id}/${slug}/"><div>${IMG("abc", title + " - " + kindText)}<div><span>2.7</span></div><div><span>HD</span></div><div><img src="x/latino.svg" alt="Latino"><span>Lat</span></div><div><p>Una sinopsis bastante larga para que cuente como sinopsis de la tarjeta.</p></div><div><p>${title}</p><p>${year} · ${kindText}</p></div></div></a>`;
const WIDE = (kind, id, slug, title) => `<a href="https://cinehdplus.org/${kind}-${id}/${slug}/" aria-label="${title}"></a><div>${IMG("w", title)}<div><span>7.9</span></div><div><h3>${title}</h3><span>Original</span></div><div><span>HD</span></div><div><span> Película</span> <span></span> 2026 <span></span> 2.2K visitas</div></div>`;

test("parseCards reads a poster card (title, year, kind, quality, language, TMDB picture)", () => {
  const c = parseCards(POSTER("pelicula", 281722, "dead-residents-evil", "Dead Residents &amp; Evil", 2026, "Película") + POSTER("series-tv", 5, "wanda", "Wanda", 2024, "Serie de TV"));
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { id: "281722", slug: "dead-residents-evil", kind: "movie", title: "Dead Residents & Evil", year: 2026, poster: "https://image.tmdb.org/t/p/w500/abc.jpg", rating: 2.7, quality: "HD", lang: "lat", overview: "Una sinopsis bastante larga para que cuente como sinopsis de la tarjeta.", genres: [] });
  assert.equal(c[1].kind, "series");
});

test("parseCards reads a wide search card and skips an anchor with no card", () => {
  const c = parseCards(`<a href="https://cinehdplus.org/pelicula-1/x/">Ver Detalles</a>` + WIDE("pelicula", 102762, "batman-x", "Batman X"));
  assert.equal(c.length, 1);
  assert.equal(c[0].title, "Batman X");
  assert.equal(c[0].id, "102762");
  assert.equal(c[0].quality, "HD");
  assert.equal(c[0].poster, "https://image.tmdb.org/t/p/w500/w.jpg");
});

test("posterOf takes the TMDB file out of the site's image proxy", () => {
  assert.equal(posterOf("https://cinehdplus.org/wp-json/rm/v1/img/?src=/q.jpg&#038;w=300&#038;origin=tmdb", "w780"), "https://image.tmdb.org/t/p/w780/q.jpg");
  assert.equal(posterOf("https://other.test/p.jpg"), "https://other.test/p.jpg");
});

test("parseTitle reads the year, original title, genres next to the title and the seasons", () => {
  const html = `<img src="https://cinehdplus.org/wp-json/rm/v1/img/?src=/p.jpg&#038;origin=tmdb" alt="T"><div><h2 class="text-xl font-bold"> The Show <span>(2010)</span></h2><p>Título original: Orig</p><a href="https://cinehdplus.org/genero/drama/">Drama</a></div><meta property="og:description" content="Sinopsis &amp; más"/>
<div id="season-content-1"><a href="https://cinehdplus.org/episodio-30260/the-show-1x1/" class="g"><img src="https://image.tmdb.org/t/p/w300/e.jpg"><span>E01</span><h3> Episodio 1 (Piloto)</h3></a></div>
<div id="season-content-2"><a href="https://cinehdplus.org/episodio-30270/the-show-2x1/" class="g"><span>E01</span><h3> Episodio 1</h3></a></div>`;
  const p = parseTitle(html);
  assert.equal(p.title, "The Show");
  assert.equal(p.year, 2010);
  assert.equal(p.original, "Orig");
  assert.deepEqual(p.genres, ["Drama"]);
  assert.equal(p.overview, "Sinopsis & más");
  assert.equal(p.poster, "https://image.tmdb.org/t/p/w500/p.jpg");
  assert.deepEqual(p.seasons.map((s) => [s.season, s.episodes.length]), [[1, 1], [2, 1]]);
  assert.deepEqual(p.seasons[0].episodes[0], { id: "30260", slug: "the-show-1x1", season: 1, number: 1, title: "Episodio 1 (Piloto)", thumb: "https://image.tmdb.org/t/p/w300/e.jpg", date: "" });
});

test("parseButtons reads the player code, its host and its language; a trailer is not a server", () => {
  const html = `<button data-url="//api.cinehdplus.org/ir/player.php?h=ABC" data-domain="voe" data-lang="Español Latino" data-flag="x" data-type="server" ></button><button data-url="https://www.youtube.com/embed/x" data-lang="Oficial" data-flag="" data-type="trailer" ></button>`;
  assert.deepEqual(parseButtons(html), [{ lang: "lat", domain: "voe", frame: "ABC" }]);
});

test("the four pages of the chain: inputs, form action, final base64 link and mirrors", () => {
  assert.equal(inputValue('<input type="hidden" id="url" name="url" value="u1">', "url"), "u1");
  assert.equal(inputValue('<input value="v2" id="vid">', "vid"), "v2");
  assert.equal(formAction('<form method="post" action="https://fotise.com">'), "https://fotise.com");
  assert.equal(finalLink(`<script>var link = '${btoa("https://voe.sx/e/abc")}';</script>`), "https://voe.sx/e/abc");
  assert.equal(finalLink(`link = '${btoa("https://streamwish.to/e/q")}'`), "https://vibuxer.com/e/q");
  assert.equal(finalLink("nothing"), null);
  assert.equal(fixHost("https://hglink.to/e/q"), "https://vibuxer.com/e/q");
});
