# CineHD Plus para Kino

Plugin de [Kino](https://github.com/kinotvapp/kino-light) para ver **películas y series** en español latino o castellano de
[cinehdplus.org](https://cinehdplus.org/). Sigue el proveedor «CineHdPlus» del repositorio de CloudStream `redblacker8/storm-ext`, puesto al día con
el diseño actual del sitio.

> Plugin no oficial. El catálogo y los videos pertenecen al sitio y a los servidores donde están alojados; este plugin solo los lista y abre
> dentro de Kino.

## Instalar

En Kino: **Ajustes ▸ Plugins ▸ Agregar**, y pega:

```
xuper-plugin/kino-plugin-cinehdplus
```

Kino pide tres permisos en rojo: *abrir páginas web ocultas para encontrar el video*, *reproducir video desde cualquier servidor que indique* y *conectarse a cualquier servidor público* (solo https, nunca tu red local).
Hacen falta para VOE, que arma su dirección con JavaScript, y para las direcciones de video que cambian de dominio.

## Qué trae

- **Una sección propia** («CineHD Plus») con cuatro pestañas —*Novedades*, *Películas*, *Series* y *Géneros*— y un destacado.
- **Inicio** con películas y series recientes, populares y mejor valoradas.
- **Categorías**: 19 géneros, cada uno con su lista por páginas.
- **Búsqueda** (también dentro de Películas o Series), **ficha** con sinopsis, géneros y año, **temporadas y episodios** con su imagen, y **descarga**.
- **Ajustes ▸ CineHD Plus**: idioma preferido (latino, castellano o subtitulado) y vaciar la caché.
- Las tarjetas traen calidad, idioma y sinopsis; el icono es el del sitio.

## Servidores

Cada botón de reproductor pasa por cuatro páginas pequeñas de la API del propio sitio (`api.cinehdplus.org`, y `fotise.com`) hasta dar la dirección
del servidor. Kino abre primero el idioma que elijas y deja los demás en el menú **Servidor**:

| Servidor | Cómo se abre |
| --- | --- |
| MixDrop y StreamTape | peticiones normales, sin navegador |
| StreamWish y VidHide | peticiones normales (StreamWish por `vibuxer.com`) |
| VOE | el navegador oculto de Kino (`kino.browser`), una sola página por título |
| Veev y StreamPlay | no se usan (no tienen lector) |

## Límites

- Los títulos antiguos suelen tener enlaces caídos (StreamTape responde 404): el plugin los intenta y pasa al siguiente.
- La ficha no trae la duración: el sitio no la muestra.

## Desarrollo

```
npm test            # pruebas sin red
npm run validate    # compila plugin.js y valida el manifiesto con el kit
node sdk/run.mjs ./plugin.js resolve 'm:281722:dead-residents-evil'
```

Licencia Apache-2.0 (ver `LICENSE` y `NOTICE`).
