import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCreateReport } from "../../api/hooks";
import { LAOS_OPERATORS } from "../../data/operators";
import { LAOS_PROVINCES } from "../../data/laosProvinces";

const SIGNAL_TYPES = ["No signal", "2G", "3G", "4G", "4G+", "5G"];

export function ReportCoveragePage() {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [province, setProvince] = useState("");
  const [signalType, setSignalType] = useState("No signal");
  const [operator, setOperator] = useState("");
  const [comment, setComment] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const createReport = useCreateReport();

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location is unavailable in this browser. Enter coordinates manually.");
      return;
    }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLat(coords.latitude.toFixed(6));
        setLng(coords.longitude.toFixed(6));
        setLocationMessage("Current location added. Please check it before submitting.");
      },
      () => setLocationMessage("We could not get your location. Check permission or enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationMessage("Enter valid latitude and longitude values.");
      return;
    }
    createReport.mutate({
      lat: latitude,
      lng: longitude,
      signal_type: signalType.toLowerCase().replace("+", "_plus").replace(" ", "_"),
      operator: operator || undefined,
      province: province || undefined,
      comment: comment.trim() || undefined,
    });
  }

  if (createReport.isSuccess) {
    return (
      <section className="report-success panel">
        <span className="success-icon" aria-hidden="true">✓</span>
        <h1>Thank you for reporting</h1>
        <p className="muted">Your report has been saved and will help make the coverage map more useful for everyone.</p>
        <div className="report-success-actions">
          <Link className="btn-primary" to="/">View coverage map</Link>
          <button className="btn-ghost" onClick={() => createReport.reset()}>Submit another report</button>
        </div>
      </section>
    );
  }

  return (
    <section className="report-page">
      <div className="report-intro">
        <p className="eyebrow">Community coverage data</p>
        <h1>Report your connection</h1>
        <p className="muted">Share what mobile service is like where you are. It takes less than a minute and helps identify places that need better coverage.</p>
      </div>
      <form className="report-form panel" onSubmit={onSubmit}>
        <div className="form-section-header">
          <h2>Where are you?</h2>
          <button className="btn-ghost location-button" type="button" onClick={useCurrentLocation}>Use my location</button>
        </div>
        {locationMessage && <p className="location-message muted" aria-live="polite">{locationMessage}</p>}
        <div className="form-grid">
          <label>Latitude<input type="number" step="any" min="-90" max="90" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 17.9757" required /></label>
          <label>Longitude<input type="number" step="any" min="-180" max="180" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 102.6331" required /></label>
          <label className="form-span-2">Province<select value={province} onChange={(e) => setProvince(e.target.value)}><option value="">Select if known</option>{LAOS_PROVINCES.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
        </div>

        <h2>How is the connection?</h2>
        <div className="form-grid">
          <label>Network available<select value={signalType} onChange={(e) => setSignalType(e.target.value)}>{SIGNAL_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Mobile operator<select value={operator} onChange={(e) => setOperator(e.target.value)}><option value="">Not sure / other</option>{LAOS_OPERATORS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="form-span-2">Anything else to share?<textarea value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="For example: signal only works outdoors, calls drop often, or service is strong." rows={4} /></label>
        </div>
        {createReport.isError && <p className="error-text">Your report could not be saved. Please try again.</p>}
        <div className="form-actions"><button className="btn-primary" type="submit" disabled={createReport.isPending}>{createReport.isPending ? "Saving report…" : "Submit report"}</button></div>
      </form>
    </section>
  );
}
