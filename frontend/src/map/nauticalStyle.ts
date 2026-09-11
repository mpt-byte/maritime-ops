import type { StyleSpecification } from 'maplibre-gl';

export function nauticalStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Maritime Ops nautical chart (OSM + OpenSeaMap)',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'osm-base': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
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
      { id: 'background', type: 'background', paint: { 'background-color': '#bfe3f7' } },
      { id: 'osm-base', type: 'raster', source: 'osm-base' },
      { id: 'seamark', type: 'raster', source: 'seamark' },
    ],
  };
}
