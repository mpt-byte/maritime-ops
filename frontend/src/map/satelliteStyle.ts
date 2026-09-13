import type { StyleSpecification } from 'maplibre-gl';

export function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Maritime Ops satellite',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
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
      { id: 'background', type: 'background', paint: { 'background-color': '#0b1020' } },
      { id: 'esri-satellite', type: 'raster', source: 'esri-satellite' },
      { id: 'seamark', type: 'raster', source: 'seamark' },
    ],
  };
}
