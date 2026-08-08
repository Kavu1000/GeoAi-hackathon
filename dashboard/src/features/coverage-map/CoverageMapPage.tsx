import { useState } from "react";
import { Map } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCells } from "../../api/hooks";
import { useMapStore } from "../../store/mapStore";
import type { CellFeature } from "../../api/types";
import { osmRasterStyle } from "./osmStyle";

const STATUS_RGBA: Record<string, [number, number, number, number]> = {
  green: [34, 197, 94, 140],
  yellow: [234, 179, 8, 140],
  red: [239, 68, 68, 140],
};

// VITE_MAP_STYLE can point at a hosted style URL (e.g. MapTiler) to override
// the raw OSM raster tiles used by default.
const MAP_STYLE = import.meta.env.VITE_MAP_STYLE || osmRasterStyle;

export function CoverageMapPage() {
  const bbox = useMapStore((s) => s.bbox);
  const operator = useMapStore((s) => s.operator);
  const { data } = useCells(bbox, operator);
  const [hover, setHover] = useState<CellFeature["properties"] | null>(null);

  const layers = [
    new GeoJsonLayer({
      id: "coverage-cells",
      data: data ?? { type: "FeatureCollection", features: [] },
      filled: true,
      stroked: true,
      getFillColor: (f) => STATUS_RGBA[(f as CellFeature).properties.status] ?? [120, 120, 120, 100],
      getLineColor: [255, 255, 255, 60],
      lineWidthMinPixels: 1,
      pickable: true,
      onHover: (info: PickingInfo) => setHover((info.object as CellFeature | undefined)?.properties ?? null),
    }),
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Coverage Map</h1>
        <Legend />
      </div>
      <div className="map-wrap">
        <DeckGL
          initialViewState={{
            longitude: (bbox.minLng + bbox.maxLng) / 2,
            latitude: (bbox.minLat + bbox.maxLat) / 2,
            zoom: 10,
          }}
          controller
          layers={layers}
        >
          <Map mapStyle={MAP_STYLE} />
        </DeckGL>
        {hover && (
          <div className="map-tooltip">
            <div>
              <b>Status:</b> {hover.status}
            </div>
            <div>
              <b>Avg download:</b> {Math.round(hover.avgDownloadKbps)} kbps
            </div>
            <div>
              <b>Samples:</b> {hover.sampleCount}
            </div>
            <div>
              <b>Reports:</b> {hover.reportCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span className="legend-dot" style={{ background: "#22c55e" }} /> Good
      <span className="legend-dot" style={{ background: "#eab308" }} /> Slow
      <span className="legend-dot" style={{ background: "#ef4444" }} /> None
    </div>
  );
}
