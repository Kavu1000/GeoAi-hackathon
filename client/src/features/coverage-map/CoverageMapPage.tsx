import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapGL, Source, Layer } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import type { PickingInfo } from "@deck.gl/core";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCells, useSubmitMeasurement } from "../../api/hooks";
import { useMapStore, type Bbox } from "../../store/mapStore";
import { useConsentStore } from "../../store/consentStore";
import { captureSignalReport } from "../speed-test/captureSignalReport";
import type { CellFeature } from "../../api/types";
import { CELL_STATUS_ORDER, STATUS_HEX, STATUS_LABEL, statusHexRgba } from "../../api/networkStatus";
import { LAOS_PROVINCES, ALL_LAOS_BBOX, ALL_LAOS_ZOOM } from "../../data/laosProvinces";
import { LAOS_OPERATORS } from "../../data/operators";
import { osmRasterStyle } from "./osmStyle";

const STATUS_RGBA_FILL: Record<string, [number, number, number, number]> = Object.fromEntries(
  CELL_STATUS_ORDER.map((s) => [s, statusHexRgba(s, 140)])
);

function predictedFillAlpha(zoom: number): number {
  if (zoom >= 9) return 70;
  if (zoom <= 6) return 170;
  return Math.round(70 + ((9 - zoom) * (170 - 70)) / 3);
}
const PREDICTED_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 130];
const MEASURED_LINE_COLOR: [number, number, number, number] = [255, 255, 255, 60];

const HIDE_PREDICTED_ZOOM = 14;
// At a province/country view, thousands of cell borders obscure roads and
// satellite imagery. The coverage colour remains visible; borders return
// only when there are few enough cells on screen to inspect individually.
const SHOW_HEX_BORDERS_ZOOM = 13;

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE || osmRasterStyle;

// ─── Satellite imagery (EOX Sentinel-2 cloudless, CC BY 4.0, no API key) ───
// Layered on as an extra Source/Layer rather than a style swap: our base
// style is one flat OSM raster layer with no separate vector label layers to
// preserve, so there's nothing worth keeping underneath — the imagery just
// draws on top when switched on, and disappears (and stops fetching tiles)
// when switched off.
const SATELLITE_SOURCE_ID = "satellite";
const SATELLITE_TILE_URL =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg";

// ─── 3D terrain (AWS open elevation tiles, no API key) ───
// Laos's coverage gaps are largely a terrain story — a valley with no line of
// sight to a mast reads as an inexplicable gray patch head-on, and as an
// obvious one once you can see the ridge in the way. The source is declared
// unconditionally (cheap — a raster-dem source fetches nothing until
// something asks it for elevation) and only draped via the `terrain` prop
// when the toggle is on.
const TERRAIN_SOURCE_ID = "terrain-dem";
const TERRAIN_TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
// Laos rises ~2km over ~1000km end to end — true-to-scale relief is nearly
// flat at the zoom a province fits on screen, so this is a deliberate
// cartographic exaggeration, not a measurement.
const TERRAIN_EXAGGERATION = 1.4;

// ─── Shareable view (URL hash) ───
// The position a pasted link asked for, or null for a fresh visit. Parsed
// once at module scope, before React renders, and only ever applied to the
// very first camera position — a province jump afterwards should always win
// over a stale hash from whenever the page was first opened.
function parseViewHash(hash: string): { zoom: number; lat: number; lon: number } | null {
  const parts = hash.replace(/^#/, "").split("/");
  if (parts.length < 3) return null;
  const [zoom, lat, lon] = parts.map(Number);
  if (![zoom, lat, lon].every(Number.isFinite)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { zoom, lat, lon };
}
const INITIAL_VIEW_HASH = parseViewHash(window.location.hash);

// Module-level, not component state: React Router unmounts/remounts this
// page on every navigation away and back, so a component-scoped ref would
// silently re-trigger a fresh GPS fix + speed test on every tab switch back
// to the map. This guarantees at most one auto-capture attempt per browser
// tab session (reset only by a full page reload).
let hasAutoCapturedThisSession = false;

function writeViewHash(longitude: number, latitude: number, zoom: number): void {
  const next = `#${zoom.toFixed(2)}/${latitude.toFixed(5)}/${longitude.toFixed(5)}`;
  // replaceState, not a hash assignment — the map shouldn't fill the
  // browser's back button with an entry for every pan.
  window.history.replaceState(null, "", next);
}

function zoomForSpan(span: number): number {
  return Math.max(8, Math.min(12, 12 - span * 3));
}

// A shared link's position only ever applies to the very first camera the
// map shows, and only when nothing more specific (a province pick) has
// already claimed that first mount — bbox stays the whole-country default
// until a province is chosen, so that's the signal this is still "fresh".
// No explicit return-type annotation: DeckGL's `initialViewState` prop type
// depends on a generic that only resolves against a plain inline object
// literal's contextual type, not a named interface — see deck.gl/core's
// `ViewStateMap<ViewsT>`.
function initialCameraFor(bbox: Bbox, hash: { zoom: number; lat: number; lon: number } | null, terrainOn: boolean) {
  const terrainView = terrainOn ? { pitch: 55, bearing: -18 } : { pitch: 0, bearing: 0 };
  if (hash && bbox === ALL_LAOS_BBOX) {
    return { longitude: hash.lon, latitude: hash.lat, zoom: hash.zoom, ...terrainView };
  }
  return {
    longitude: (bbox.minLng + bbox.maxLng) / 2,
    latitude: (bbox.minLat + bbox.maxLat) / 2,
    zoom: bbox === ALL_LAOS_BBOX ? ALL_LAOS_ZOOM : zoomForSpan((bbox.maxLng - bbox.minLng) / 2),
    ...terrainView,
  };
}

export function CoverageMapPage() {
  const bbox = useMapStore((s) => s.bbox);
  const operator = useMapStore((s) => s.operator);
  const setBbox = useMapStore((s) => s.setBbox);
  const setOperator = useMapStore((s) => s.setOperator);
  const { data } = useCells(bbox, operator);
  // Click-to-open, not hover — a panel this detailed needs to stay put long
  // enough to actually read, and hover made it disappear the instant the
  // cursor drifted off the hex.
  const [selectedCell, setSelectedCell] = useState<CellFeature["properties"] | null>(null);
  const [zoom, setZoom] = useState(10);
  const [basemap, setBasemap] = useState<"streets" | "satellite">("streets");
  const [terrainOn, setTerrainOn] = useState(false);
  const [focusedProvince, setFocusedProvince] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shareLocationEnabled = useConsentStore((s) => s.shareLocationEnabled);
  const setShareLocationEnabled = useConsentStore((s) => s.setShareLocationEnabled);
  const submitMeasurement = useSubmitMeasurement();

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === mapContainerRef.current);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  // Auto-capture a location + signal reading the instant the map loads —
  // the browser's own geolocation prompt is the visible consent gate, the
  // "Auto-share" toggle in MapControls is the reversible control. Fails
  // silently in general (this is passive/implicit, unlike SpeedTestPage's
  // explicit user-initiated flow) except on a permission denial, where it
  // flips the toggle off so it never shows "On" while silently failing.
  useEffect(() => {
    if (hasAutoCapturedThisSession || !shareLocationEnabled) return;
    hasAutoCapturedThisSession = true;
    captureSignalReport()
      .then((report) => {
        submitMeasurement.mutate({
          lat: report.lat,
          lng: report.lng,
          accuracyM: report.accuracyM,
          networkType: report.networkType,
          latencyMs: report.latencyMs,
          downloadKbps: report.downloadKbps,
          source: "speedtest",
          recordedAt: new Date().toISOString(),
        });
      })
      .catch((err: unknown) => {
        if (err instanceof GeolocationPositionError && err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setShareLocationEnabled(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await mapContainerRef.current?.requestFullscreen();
    }
  }

  const hidePredicted = zoom > HIDE_PREDICTED_ZOOM;
  const showHexBorders = zoom >= SHOW_HEX_BORDERS_ZOOM;

  const visibleCells = useMemo(() => {
    if (!data) return data;
    if (!hidePredicted) return data;
    return { ...data, features: data.features.filter((f) => !f.properties.predicted) };
  }, [data, hidePredicted]);

  // A polygon with a hole over the selected province's focus bounds. DeckGL
  // dims the outside area while keeping the selected province clear.
  const provinceFocusMask = useMemo(() => {
    if (!focusedProvince) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
          [[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.minLat], [bbox.maxLng, bbox.maxLat], [bbox.minLng, bbox.maxLat], [bbox.minLng, bbox.minLat]],
        ],
      },
    };
  }, [bbox, focusedProvince]);

  const layers = [
    new GeoJsonLayer({
      id: "coverage-cells",
      data: visibleCells ?? { type: "FeatureCollection", features: [] },
      filled: true,
      stroked: showHexBorders,
      getFillColor: (f) => {
        const props = (f as CellFeature).properties;
        const [r, g, b, a] = STATUS_RGBA_FILL[props.status] ?? [120, 120, 120, 100];
        return [r, g, b, props.predicted ? predictedFillAlpha(zoom) : a];
      },
      getLineColor: (f) => ((f as CellFeature).properties.predicted ? PREDICTED_LINE_COLOR : MEASURED_LINE_COLOR),
      getLineWidth: (f) => ((f as CellFeature).properties.predicted ? 1.5 : 1),
      lineWidthMinPixels: 1,
      lineWidthUnits: "pixels",
      getDashArray: (f: CellFeature) => (f.properties.predicted ? [3, 2] : [0, 0]),
      dashJustified: true,
      extensions: [new PathStyleExtension({ dash: true })],
      updateTriggers: { getFillColor: zoom, getLineColor: showHexBorders },
      pickable: true,
      onClick: (info: PickingInfo) => setSelectedCell((info.object as CellFeature | undefined)?.properties ?? null),
    }),
    ...(provinceFocusMask
      ? [
          new GeoJsonLayer({
            id: "province-focus-mask",
            data: provinceFocusMask,
            filled: true,
            stroked: true,
            getFillColor: [15, 23, 42, 150],
            getLineColor: [255, 255, 255, 210],
            getLineWidth: 2,
            lineWidthUnits: "pixels",
            lineWidthMinPixels: 1.5,
            pickable: false,
          }),
        ]
      : []),
  ];

  const selected = selectedCell;

  return (
    <div>
      <div className="page-header">
        <h1>Coverage Map</h1>
        <Legend predictedHidden={hidePredicted} bordersHidden={!showHexBorders} />
      </div>
      <div className="map-wrap" ref={mapContainerRef}>
        <MapControls
          operator={operator}
          onOperatorChange={setOperator}
          focusedProvince={focusedProvince}
          onProvinceChange={(nextBbox, provinceName) => {
            setBbox(nextBbox);
            setFocusedProvince(provinceName);
            setSelectedCell(null);
          }}
          basemap={basemap}
          onBasemapToggle={() => setBasemap((b) => (b === "streets" ? "satellite" : "streets"))}
          terrainOn={terrainOn}
          onTerrainToggle={() => setTerrainOn((enabled) => !enabled)}
          shareLocationEnabled={shareLocationEnabled}
          onShareLocationToggle={() => setShareLocationEnabled(!shareLocationEnabled)}
        />
        {focusedProvince && (
          <div className="map-focus-status">
            Focused on <strong>{focusedProvince}</strong>
            <button type="button" onClick={() => { setBbox(ALL_LAOS_BBOX); setFocusedProvince(null); }}>Show all Laos</button>
          </div>
        )}
        <button
          type="button"
          className="map-fullscreen-button"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? "Exit full screen map" : "Show map in full screen"}
        >
          {isFullscreen ? "⤡ Exit full screen" : "⛶ Full screen"}
        </button>
        <DeckGL
          // Remounting on bbox change is what makes the province picker jump
          // the camera (see the comment further down where bbox is read) — a
          // shared link's position, when present, only ever applies to this
          // very first mount, since INITIAL_VIEW_HASH is a one-time module
          // constant, not something a later province pick could reintroduce.
          // DeckGL owns the camera. Remount for a terrain switch so its
          // initial view includes the pitch—MapLibre's own easeTo would be
          // overwritten by DeckGL's controller on the next render.
          key={`${bbox.minLng.toFixed(3)},${bbox.minLat.toFixed(3)},${terrainOn ? "terrain" : "flat"}`}
          initialViewState={initialCameraFor(bbox, INITIAL_VIEW_HASH, terrainOn)}
          controller
          layers={layers}
          getCursor={({ isHovering, isDragging }) => (isDragging ? "grabbing" : isHovering ? "pointer" : "grab")}
          onViewStateChange={({ viewState }) => {
            if (!("longitude" in viewState) || !("latitude" in viewState) || !("zoom" in viewState)) return;
            const { longitude, latitude, zoom: z } = viewState as { longitude: number; latitude: number; zoom: number };
            setZoom(z);
            writeViewHash(longitude, latitude, z);
          }}
        >
          <MapGL
            mapStyle={MAP_STYLE}
            attributionControl={false}
            terrain={terrainOn ? { source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION } : undefined}
          >
            <Source
              id={TERRAIN_SOURCE_ID}
              type="raster-dem"
              tiles={[TERRAIN_TILE_URL]}
              encoding="terrarium"
              tileSize={256}
              maxzoom={13}
            />
            {basemap === "satellite" && (
              <Source id={SATELLITE_SOURCE_ID} type="raster" tiles={[SATELLITE_TILE_URL]} tileSize={256} maxzoom={14}>
                <Layer id="satellite-layer" type="raster" />
              </Source>
            )}
          </MapGL>
        </DeckGL>
        <MapAttribution />

        {/* ── Hex cell detail panel ── */}
        {selected && (
          <div className="map-detail-panel">
            <button
              type="button"
              className="map-detail-close"
              onClick={() => setSelectedCell(null)}
              aria-label="Close cell details"
            >
              ×
            </button>
            <div className="map-detail-header">
              <span className="map-detail-badge" style={{ background: STATUS_HEX[selected.status] }}>
                {STATUS_LABEL[selected.status]}
              </span>
              {selected.predicted && <span className="ai-badge">PREDICTED</span>}
            </div>
            <div className="map-detail-stats">
              <div className="map-detail-stat">
                <span className="map-detail-stat-value">{Math.round(selected.avgDownloadKbps)}</span>
                <span className="map-detail-stat-label">kbps download</span>
              </div>
              <div className="map-detail-stat">
                <span className="map-detail-stat-value">
                  {selected.avgLatencyMs != null ? Math.round(selected.avgLatencyMs) : "—"}
                </span>
                <span className="map-detail-stat-label">ms latency</span>
              </div>
            </div>
            <div className="map-detail-secondary">
              <div>
                <b>Samples:</b> {selected.sampleCount}
              </div>
              <div>
                <b>Reports:</b> {selected.reportCount}
              </div>
              <div>
                <b>Confidence:</b> {Math.round(selected.confidence * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MapAttribution() {
  return (
    <details className="map-attribution">
      <summary>Map data &amp; imagery</summary>
      <div>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
        <span aria-hidden="true"> · </span>
        <a href="https://s2maps.eu/" target="_blank" rel="noreferrer">Sentinel-2 cloudless by EOX</a>
      </div>
    </details>
  );
}

function MapControls({
  operator,
  onOperatorChange,
  focusedProvince,
  onProvinceChange,
  basemap,
  onBasemapToggle,
  terrainOn,
  onTerrainToggle,
  shareLocationEnabled,
  onShareLocationToggle,
}: {
  operator: string;
  onOperatorChange: (operator: string) => void;
  focusedProvince: string | null;
  onProvinceChange: (bbox: Bbox, provinceName: string | null) => void;
  basemap: "streets" | "satellite";
  onBasemapToggle: () => void;
  terrainOn: boolean;
  onTerrainToggle: () => void;
  shareLocationEnabled: boolean;
  onShareLocationToggle: () => void;
}) {
  return (
    <div className="map-controls">
      <select
        className="map-select"
        value={focusedProvince ?? "__all__"}
        onChange={(e) => {
          if (e.target.value === "__all__") {
            onProvinceChange(ALL_LAOS_BBOX, null);
            return;
          }
          const province = LAOS_PROVINCES.find((p) => p.name === e.target.value);
          if (!province) return;
          onProvinceChange({
            minLng: province.lng - province.span,
            minLat: province.lat - province.span,
            maxLng: province.lng + province.span,
            maxLat: province.lat + province.span,
          }, province.name);
        }}
      >
        <option value="__all__">All Laos</option>
        {LAOS_PROVINCES.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <select className="map-select" value={operator} onChange={(e) => onOperatorChange(e.target.value)}>
        {LAOS_OPERATORS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="button" className="map-select map-toggle-btn" onClick={onBasemapToggle}>
        {basemap === "satellite" ? "🛰️ Satellite" : "🗺️ Streets"}
      </button>
      <button
        type="button"
        className={`map-select map-toggle-btn${terrainOn ? " map-toggle-btn-active" : ""}`}
        onClick={onTerrainToggle}
        title="Show elevation in a tilted 3D view"
      >
        ⛰️ 3D terrain
      </button>
      <button
        type="button"
        className={`map-select map-toggle-btn${shareLocationEnabled ? " map-toggle-btn-active" : ""}`}
        onClick={onShareLocationToggle}
        title="Automatically share a location + speed reading when you open this map"
      >
        📡 Auto-share: {shareLocationEnabled ? "On" : "Off"}
      </button>
    </div>
  );
}

function Legend({ predictedHidden, bordersHidden }: { predictedHidden: boolean; bordersHidden: boolean }) {
  return (
    <div className="legend-stack">
      <div className="legend">
        {CELL_STATUS_ORDER.map((s) => (
          <Fragment key={s}>
            <span className="legend-dot" style={{ background: STATUS_HEX[s] }} /> {STATUS_LABEL[s]}
          </Fragment>
        ))}
        <span className="legend-dot legend-dot-predicted" /> Predicted (model estimate)
        {predictedHidden && <span className="muted"> — hidden at this zoom</span>}
        {bordersHidden && <span className="muted"> · zoom in for hex borders</span>}
      </div>
    </div>
  );
}
