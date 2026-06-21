"use client";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { EventConfig, ForecastResult, EVENT_TYPES } from "@/lib/engine";

interface ExportReportProps {
  config: EventConfig;
  forecast: ForecastResult;
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 9.5, color: "#747B88", fontWeight: 700, letterSpacing: "0.09em" }}>{num}</span>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F2F3F5", letterSpacing: "-0.01em" }}>{title}</h2>
    </div>
  );
}

// ── Issue 6: PDF corruption fix ──────────────────────────────────────────
// jsPDF's built-in Helvetica font uses WinAnsi encoding, which has no glyph
// for the arrow, en-dash, bullet, and several other Unicode characters.
// Passing those straight into doc.text() silently breaks character spacing
// (the "T u m k u r" symptom). This sanitizer runs on every string
// immediately before it's written to the PDF, and ONLY there — on-screen UI
// strings and engine.ts data are left untouched, since browsers render
// Unicode fine.
function sanitizeForPdf(text: string): string {
  return text
    .replace(/\s*\u2192\s*/g, " to ")  // right arrow -> "to"
    .replace(/\s*\u21aa\s*/g, " to ")  // diversion arrow variant
    .replace(/\u2013/g, "-")            // en-dash -> hyphen
    .replace(/\u2014/g, "-")            // em-dash -> hyphen
    .replace(/\u2022/g, "-")            // bullet -> hyphen
    .replace(/[^\x00-\x7F]/g, "")       // strip any remaining non-ASCII (emoji, etc.)
    .replace(/\s{2,}/g, " ")            // collapse double spaces left by replacements
    .trim();
}

export function ExportReportSection({ config, forecast }: ExportReportProps) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      let y = 56;

      const eventLabel = sanitizeForPdf(
        EVENT_TYPES.find(e => e.value === config.eventType)?.label || config.eventType
      );

      const addHeading = (text: string, size = 16) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.setTextColor(20, 24, 38);
        doc.text(sanitizeForPdf(text), margin, y);
        y += size * 0.95;
      };
      const addLabel = (text: string) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 130, 150);
        doc.text(sanitizeForPdf(text).toUpperCase(), margin, y);
        y += 14;
      };
      const addBody = (text: string, size = 10.5) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.setTextColor(40, 44, 56);
        const clean = sanitizeForPdf(text);
        const lines = doc.splitTextToSize(clean, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * (size * 1.35) + 5;
      };
      const addDivider = () => {
        y += 6;
        doc.setDrawColor(225, 228, 235);
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;
      };
      const checkPageBreak = (needed = 90) => {
        if (y + needed > pageHeight - 50) {
          doc.addPage();
          y = 56;
        }
      };

      const addTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
        const usableWidth = pageWidth - margin * 2;
        const widths = colWidths || headers.map(() => usableWidth / headers.length);
        const rowHeight = 20;
        const headerHeight = 22;

        checkPageBreak(headerHeight + rowHeight * rows.length + 10);

        doc.setFillColor(23, 24, 28);
        doc.rect(margin, y, usableWidth, headerHeight, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        let xPos = margin + 8;
        headers.forEach((h, i) => {
          doc.text(sanitizeForPdf(h).toUpperCase(), xPos, y + 14.5);
          xPos += widths[i];
        });
        y += headerHeight;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        rows.forEach((row, rIdx) => {
          checkPageBreak(rowHeight + 5);
          const bg = rIdx % 2 === 0 ? 248 : 255;
          doc.setFillColor(bg, bg, bg + 1);
          doc.rect(margin, y, usableWidth, rowHeight, "F");
          doc.setDrawColor(225, 228, 235);
          doc.rect(margin, y, usableWidth, rowHeight, "S");

          doc.setTextColor(40, 44, 56);
          xPos = margin + 8;
          row.forEach((cell, i) => {
            doc.text(sanitizeForPdf(cell), xPos, y + 13.5);
            xPos += widths[i];
          });
          y += rowHeight;
        });
        y += 16;
      };

      // Cover
      doc.setFillColor(7, 9, 15);
      doc.rect(0, 0, pageWidth, 140, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("UrbanFlow AI", margin, 62);
      doc.setFontSize(11);
      doc.setTextColor(150, 160, 185);
      doc.text(sanitizeForPdf("Traffic Disruption Command Center - Event Impact Report"), margin, 82);
      doc.setFontSize(9);
      doc.setTextColor(110, 120, 145);
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, 100);
      y = 168;

      addHeading("Executive Summary");
      addBody(
        `A ${eventLabel} is expected at ${config.location} with ${forecast.riskLevel.toLowerCase()} risk classification. ` +
        `The AI model forecasts a ${forecast.expectedDelayMin}-minute peak delay across a ${forecast.impactRadiusKm} km radius, ` +
        `affecting ${forecast.affectedJunctions.length} junctions during the window ${forecast.peakWindowStart} to ${forecast.peakWindowEnd}. ` +
        `Recommended deployment: ${forecast.officersRequired} officers and ${forecast.barricadesRequired} barricades. ` +
        `With AI-recommended interventions, projected delay reduces from ${forecast.delayBefore} to ${forecast.delayAfter} minutes ` +
        `(${Math.round((1 - forecast.delayAfter / forecast.delayBefore) * 100)}% improvement).`
      );
      addDivider();

      addHeading("Event Summary", 13);
      addTable(
        ["Item", "Value"],
        [
          ["Event type", eventLabel],
          ["Location", config.location],
          ["Expected crowd", config.crowd],
          ["Duration", `${config.duration} hour(s)`],
          ["VIP presence", config.vipPresence ? "Yes" : "No"],
          ["Rain expected", config.rainExpected ? "Yes" : "No"],
        ],
        [200, 320]
      );

      checkPageBreak();
      addHeading("Impact Analysis", 13);
      addTable(
        ["Item", "Value"],
        [
          ["Risk level", forecast.riskLevel],
          ["Impact radius", `${forecast.impactRadiusKm} km`],
          ["Expected delay", `${forecast.expectedDelayMin} min`],
          ["Peak window", `${forecast.peakWindowStart} to ${forecast.peakWindowEnd}`],
          ["Model confidence", `${forecast.confidencePct}%`],
        ],
        [200, 320]
      );
      addLabel("Affected junctions");
      addBody(forecast.affectedJunctions.map(j => j.name).join(", "));
      addDivider();

      checkPageBreak();
      addHeading("Resource Allocation", 13);
      addTable(
        ["Resource", "Count"],
        [
          ["Officers required", String(forecast.officersRequired)],
          ["Barricades required", String(forecast.barricadesRequired)],
          ["Tow trucks required", String(forecast.towTrucksRequired)],
          ["Fire response units", String(forecast.fireUnitsRequired)],
        ],
        [280, 240]
      );
      addLabel("Deployment priority");
      addBody(forecast.deploymentPriority.map(d => `P${d.priority} ${d.gate}`).join(", "));
      addDivider();

      checkPageBreak();
      addHeading("Traffic Diversions", 13);
      addLabel("Roads closed");
      addBody(forecast.roadsClosed.join(", "));
      addLabel("Diversion routes");
      forecast.diversionRoutes.forEach(d => addBody(`${d.from} to ${d.to}: ${d.reason}`));
      addDivider();

      checkPageBreak();
      addHeading("BMTC Impact", 13);
      addTable(
        ["Route", "Original", "Diverted via"],
        forecast.bmtcRoutes.map(r => [r.route, r.original, r.diverted]),
        [60, 230, 230]
      );

      checkPageBreak();
      addHeading("Metro Impact", 13);
      addTable(
        ["Station", "Footfall", "Additional staff"],
        forecast.metroStations.map(s => [s.name, `+${s.footfallIncreasePct}%`, String(s.additionalStaff)]),
        [260, 130, 130]
      );

      checkPageBreak();
      addHeading("Emergency Mobility Advisory", 13);
      addTable(
        ["Type", "Route"],
        [
          ["Preferred", forecast.preferredRoute],
          ["Backup", forecast.backupRoute],
          ["Avoid", forecast.avoidRoute],
        ],
        [150, 370]
      );

      checkPageBreak();
      addHeading("Before vs After Intervention", 13);
      const congestionImp = Math.round((1 - forecast.congestionAfterPct / forecast.congestionBeforePct) * 100);
      const delayImp = Math.round((1 - forecast.delayAfter / forecast.delayBefore) * 100);
      const speedImp = Math.round((forecast.speedAfter / forecast.speedBefore - 1) * 100);
      addTable(
        ["Metric", "Before", "After", "Improvement"],
        [
          ["Congestion", `${forecast.congestionBeforePct}%`, `${forecast.congestionAfterPct}%`, `+${congestionImp}%`],
          ["Delay", `${forecast.delayBefore} min`, `${forecast.delayAfter} min`, `+${delayImp}%`],
          ["Average speed", `${forecast.speedBefore} km/h`, `${forecast.speedAfter} km/h`, `+${speedImp}%`],
        ],
        [160, 120, 120, 120]
      );

      const overallScore = Math.round((congestionImp + delayImp + speedImp) / 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 24, 38);
      doc.text(`Overall Improvement Score: ${overallScore}%`, margin, y);

      doc.save(`UrbanFlow_${config.location.replace(/\s+/g, "_")}_Report.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Report export failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: "16px 20px", borderTop: "1px solid #2A2D34" }}>
      <SectionHeader num="09" title="Export Report" />
      <button
        onClick={handleExport}
        disabled={generating}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "11px",
          background: "#1D1F24",
          border: "1px solid #2A2D34",
          borderRadius: 8,
          color: generating ? "#747B88" : "#F2F3F5",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: generating ? "not-allowed" : "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {generating ? (
          <>
            <FileText size={14} /> Generating PDF...
          </>
        ) : (
          <>
            <Download size={14} /> Export Full Report (PDF)
          </>
        )}
      </button>
      <div style={{ fontSize: 10.5, color: "#747B88", marginTop: 8, textAlign: "center" as const }}>
        Includes impact analysis, resource allocation, diversions, BMTC &amp; Metro impact, and before/after comparison
      </div>
    </div>
  );
}
