import { useState } from "react";
import { Map } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
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

// Predicted (model-estimated) cells render lighter and with a dashed
// outline so they read as "our best guess" rather than a measurement —
// matches the "Predicted (model estimate)" legend entry.
const PREDICTED_FILL_ALPHA = 70;
const PREDICTED_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 130];
const MEASURED_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 60];

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
      getFillColor: (f) => {
        const props = (f as CellFeature).properties;
        const [r, g, b, a] = STATUS_RGBA[props.status] ?? [120, 120, 120, 100];
        return [r, g, b, props.predicted ? PREDICTED_FILL_ALPHA : a];
      },
      getLineColor: (f) => ((f as CellFeature).properties.predicted ? PREDICTED_LINE_COLOR : MEASURED_LINE_COLOR),
      getLineWidth: (f) => ((f as CellFeature).properties.predicted ? 1.5 : 1),
      lineWidthMinPixels: 1,
      lineWidthUnits: "pixels",
      // Dash predicted cells' borders only — measured cells get a solid line.
      getDashArray: (f: CellFeature) => (f.properties.predicted ? [3, 2] : [0, 0]),
      dashJustified: true,
      extensions: [new PathStyleExtension({ dash: true })],
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
              <b>Status:</b> {hover.status} {hover.predicted && <span className="ai-badge">PREDICTED</span>}
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
            <div>
              <b>Confidence:</b> {Math.round(hover.confidence * 100)}%
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
      <span className="legend-dot" style={{ background: "#22c55e" }} /> Strong / stable
      <span className="legend-dot" style={{ background: "#eab308" }} /> Weak / unstable
      <span className="legend-dot" style={{ background: "#ef4444" }} /> No signal
      <span className="legend-dot legend-dot-predicted" /> Predicted (model estimate)
    </div>
  );
}
