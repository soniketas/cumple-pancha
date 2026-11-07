# Cumple Pancha

Pagina minimalista para el cumpleanos de Pancha. Sin framework: HTML/CSS/JS plano.
En vez de scroll vertical, el scroll mueve la escena en el eje Z — las fotos flotan en el espacio y se acercan a camara a medida que se avanza.

## Desarrollo

```
npm run dev
```

Sirve el sitio estatico en `http://localhost:5800`.

## Imagenes

`images/*.webp` son conversiones de las fotos originales (`npm run convert`, usa `sharp` sobre PNGs intermedios generados con `sips`). Las posiciones y profundidad (`--x`, `--y`, `--z`, `--rot`) de cada foto se definen inline en `index.html`.
