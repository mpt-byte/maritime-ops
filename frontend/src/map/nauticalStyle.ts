import type { StyleSpecification } from 'maplibre-gl';

export function nauticalStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Maritime Ops nautical chart',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'carto-base': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxzoom: 20,
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
      { id: 'background', type: 'background', paint: { 'background-color': '#bfe3f7' } },
      { id: 'carto-base', type: 'raster', source: 'carto-base' },
      { id: 'seamark', type: 'raster', source: 'seamark' },
    ],
  };
}
