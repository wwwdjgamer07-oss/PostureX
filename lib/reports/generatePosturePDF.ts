import { jsPDF } from "jspdf";
import type { PostureReportMetrics } from "@/lib/reports/types";

const PAGE = {
  width: 210,
  height: 297,
  margin: 12
};

const COLORS = {
  bg: [7, 12, 23] as [number, number, number],
  panel: [12, 19, 35] as [number, number, number],
  panelSoft: [15, 29, 48] as [number, number, number],
  accent: [34, 211, 238] as [number, number, number],
  accentSoft: [103, 232, 249] as [number, number, number],
  text: [224, 242, 254] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number]
};

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function drawPanel(doc: jsPDF, x: number, y: number, w: number, h: number, soft = false) {
  doc.setFillColor(...(soft ? COLORS.panelSoft : COLORS.panel));
  doc.roundedRect(x, y, w, h, 4, 4, "F");
}

function drawGraph(doc: jsPDF, points: Array<{ label: string; value: number }>, x: number, y: number, w: number, h: number) {
  drawPanel(doc, x, y, w, h, true);

  const pad = 8;
  const graphX = x + pad;
  const graphY = y + pad;
  const graphW = w - pad * 2;
  const graphH = h - pad * 2 - 8;

  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.35);
  for (let i = 0; i <= 4; i += 1) {
    const yy = graphY + (graphH * i) / 4;
    doc.line(graphX, yy, graphX + graphW, yy);
  }

  if (points.length === 0) {
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("No daily scores available for this period.", graphX, graphY + graphH / 2);
    return;
  }

  const max = Math.max(100, ...points.map((point) => point.value));
  const min = 0;

  const coord = points.map((point, index) => {
    const px = graphX + (index / Math.max(points.length - 1, 1)) * graphW;
    const py = graphY + graphH - ((point.value - min) / Math.max(max - min, 1)) * graphH;
    return { x: px, y: py };
  });

  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1.2);
  for (let i = 1; i < coord.length; i += 1) {
    doc.line(coord[i - 1].x, coord[i - 1].y, coord[i].x, coord[i].y);
  }

  doc.setFillColor(...COLORS.accentSoft);
  coord.forEach((point) => doc.circle(point.x, point.y, 1.4, "F"));

  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  points.forEach((point, index) => {
    const px = graphX + (index / Math.max(points.length - 1, 1)) * graphW;
    doc.text(point.label, px - 4, y + h - 3);
  });
}

function prepareReportPage(doc: jsPDF) {
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
}

function ensureSectionFits(doc: jsPDF, startY: number, sectionHeight: number) {
  const footerReserve = 18;
  if (startY + sectionHeight <= PAGE.height - footerReserve) {
    return startY;
  }
  doc.addPage();
  prepareReportPage(doc);
  return PAGE.margin;
}

export async function generatePosturePDF(data: PostureReportMetrics): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  prepareReportPage(doc);

  drawPanel(doc, PAGE.margin, PAGE.margin, PAGE.width - PAGE.margin * 2, 24);
  doc.setTextColor(...COLORS.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PostureX AI Posture Report", PAGE.margin + 6, PAGE.margin + 9);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`User: ${data.userName}`, PAGE.margin + 6, PAGE.margin + 15);
  doc.text(`Period: ${formatDate(data.range.start)} to ${formatDate(data.range.end)} (${data.period})`, PAGE.margin + 6, PAGE.margin + 20);

  const y1 = PAGE.margin + 30;
  drawPanel(doc, PAGE.margin, y1, PAGE.width - PAGE.margin * 2, 20);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Average Posture Score", PAGE.margin + 6, y1 + 8);
  doc.setTextColor(...COLORS.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`${data.averagePostureScore.toFixed(1)} / 100`, PAGE.margin + 6, y1 + 16);

  const graphY = y1 + 24;
  drawGraph(
    doc,
    data.dailyScores.map((row) => ({
      label: row.date.slice(5),
      value: row.avg_score
    })),
    PAGE.margin,
    graphY,
    PAGE.width - PAGE.margin * 2,
    62
  );
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Daily Posture Score Graph", PAGE.margin + 5, graphY + 6);

  const metricsY = graphY + 68;
  drawPanel(doc, PAGE.margin, metricsY, PAGE.width - PAGE.margin * 2, 58);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Metrics", PAGE.margin + 5, metricsY + 7);

  const metrics = [
    ["Total Sitting Time", formatDuration(data.totalSittingTimeSeconds)],
    ["Slouch Events", String(data.slouchEventsCount)],
    ["Neck Tilt Deviation Avg", `${data.neckTiltDeviationAverage.toFixed(1)}%`],
    ["Shoulder Imbalance", `${data.shoulderImbalancePercent.toFixed(1)}%`],
    ["Fatigue Index", `${data.fatigueIndex.toFixed(1)}%`],
    ["Improvement vs Previous", `${data.improvementVsPreviousPeriod >= 0 ? "+" : ""}${data.improvementVsPreviousPeriod.toFixed(1)}`],
    ["Streak Days", String(data.streakDays)],
    ["Risk Level", data.riskLevelClassification]
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...COLORS.muted);
  const colX = [PAGE.margin + 5, PAGE.margin + 105];
  metrics.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const yy = metricsY + 14 + row * 10;
    doc.text(String(label), colX[col], yy);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), colX[col], yy + 4);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
  });

  const contentWidth = PAGE.width - PAGE.margin * 2 - 10;
  const summaryLinesRaw = doc.splitTextToSize(data.aiInsightsSummary, contentWidth);
  const summaryLines = Array.isArray(summaryLinesRaw) ? summaryLinesRaw : [String(summaryLinesRaw)];
  const recommendationLines = data.recommendedCorrections.slice(0, 3).map((item, index) => {
    const text = doc.splitTextToSize(`${index + 1}. ${item}`, PAGE.width - PAGE.margin * 2 - 14);
    return Array.isArray(text) ? text : [String(text)];
  });

  const summaryPanelHeight = 14 + summaryLines.length * 4 + 8;
  const recommendationPanelHeight =
    12 +
    recommendationLines.reduce((sum, lines) => sum + lines.length * 4 + 3, 0) +
    5;
  const totalSectionHeight = summaryPanelHeight + 6 + recommendationPanelHeight;

  let aiY = metricsY + 64;
  aiY = ensureSectionFits(doc, aiY, totalSectionHeight);

  drawPanel(doc, PAGE.margin, aiY, PAGE.width - PAGE.margin * 2, summaryPanelHeight);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("AI Insights Summary", PAGE.margin + 5, aiY + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8.4);
  doc.text(summaryLines, PAGE.margin + 5, aiY + 13);

  const recommendationY = aiY + summaryPanelHeight + 6;
  drawPanel(doc, PAGE.margin, recommendationY, PAGE.width - PAGE.margin * 2, recommendationPanelHeight);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Recommended Corrections", PAGE.margin + 5, recommendationY + 7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);

  let currentY = recommendationY + 13;
  recommendationLines.forEach((lines) => {
    doc.text(lines, PAGE.margin + 7, currentY);
    currentY += lines.length * 4 + 3;
  });

  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, PAGE.height - 13, PAGE.width - PAGE.margin, PAGE.height - 13);
  doc.setTextColor(...COLORS.accentSoft);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Generated by PostureX AI", PAGE.margin, PAGE.height - 8);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
