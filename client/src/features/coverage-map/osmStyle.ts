import type { StyleSpecification } from "maplibre-gl";

// Raw OpenStreetMap raster tiles as a MapLibre style. Free, no API key, but
// subject to OSM's usage policy (https://operations.osmfoundation.org/policies/tiles/) —
// fine for development/demo traffic; swap VITE_MAP_STYLE for a provider like
// MapTiler/Stadia Maps before any real production load.
export const osmRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};
