import type { StyleSpecification } from 'maplibre-gl';

export function darkStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Maritime Ops dark',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxzoom: 19,
      },
      seamark: {
        type: 'raster',
        tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenSeaMap contributors',
        maxzoom: 18,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0a0f1e' } },
      { id: 'carto-dark', type: 'raster', source: 'carto-dark' },
      { id: 'seamark', type: 'raster', source: 'seamark' },
    ],
  };
}
