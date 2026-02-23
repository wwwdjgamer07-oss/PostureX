import { jsPDF } from "jspdf";

export interface PostureReportData {
  alignment: number;
  stability: number;
  symmetry: number;
  score: number;
  riskLevel: string;
  fatigue: number;
  duration: number;
  user: string;
  sessionId: string;
  aiFeedback: string;
  suggestions: string[];
  riskExplanation: string;
  date?: Date | string;
}

const PAGE = {
  width: 210,
  height: 297,
  margin: 14
};

const COLORS = {
  bg: [246, 247, 250] as [number, number, number],
  panel: [255, 255, 255] as [number, number, number],
  panelSoft: [238, 242, 250] as [number, number, number],
  accent: [33, 48, 77] as [number, number, number],
  accentSoft: [64, 86, 128] as [number, number, number],
  text: [20, 29, 46] as [number, number, number],
  muted: [96, 109, 134] as [number, number, number]
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapRiskWeight(riskLevel: string) {
  switch (riskLevel.toUpperCase()) {
    case "LOW":
      return 20;
    case "MODERATE":
      return 45;
    case "HIGH":
      return 70;
    case "SEVERE":
      return 85;
    case "CRITICAL":
      return 100;
    default:
      return 30;
  }
}

function riskColor(riskLevel: string): [number, number, number] {
  switch (riskLevel.toUpperCase()) {
    case "LOW":
      return [34, 197, 94];
    case "MODERATE":
      return [250, 204, 21];
    case "HIGH":
      return [249, 115, 22];
    case "SEVERE":
    case "CRITICAL":
      return [239, 68, 68];
    default:
      return COLORS.accentSoft;
  }
}

function formatDuration(durationSeconds: number) {
  const total = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDate(value?: Date | string) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit"
  }).format(date);
}

function fileDateStamp(value?: Date | string) {
  const date = value ? new Date(value) : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function loadLogo(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    return dataUrl;
  } catch {
    return null;
  }
}

function drawProgressRing(doc: jsPDF, x: number, y: number, radius: number, percent: number) {
  const normalized = clampPercent(percent);
  const segments = 72;
  const stroke = 2.2;
  const startAngle = -90;
  const active = Math.round((segments * normalized) / 100);

  doc.setDrawColor(192, 202, 220);
  doc.setLineWidth(stroke);
  doc.circle(x, y, radius, "S");

  doc.setDrawColor(...COLORS.accentSoft);
  for (let index = 0; index < active; index += 1) {
    const angle = startAngle + (index / segments) * 360;
    const rad = (Math.PI / 180) * angle;
    const fromR = radius - 0.6;
    const toR = radius + 0.8;
    const x1 = x + fromR * Math.cos(rad);
    const y1 = y + fromR * Math.sin(rad);
    const x2 = x + toR * Math.cos(rad);
    const y2 = y + toR * Math.sin(rad);
    doc.line(x1, y1, x2, y2);
  }
}

function drawLandingCard(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...COLORS.panel);
  doc.roundedRect(x, y, w, h, 4, 4, "F");
  doc.setDrawColor(206, 216, 236);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 4, 4, "S");
}

function drawPageBackground(doc: jsPDF) {
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  doc.setFillColor(233, 238, 248);
  doc.circle(54, 42, 35, "F");
  doc.setFillColor(227, 233, 246);
  doc.circle(160, 56, 44, "F");
  doc.setFillColor(236, 240, 249);
  doc.circle(106, 254, 60, "F");
}

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
}

function formatSessionIdForWrap(value: string, chunkSize = 10) {
  const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, "g"));
  return chunks ? chunks.join(" ") : value;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function generatePostureReport(data: PostureReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const reportDate = formatDate(data.date);
  const filename = `PostureX_Report_${fileDateStamp(data.date)}.pdf`;
  const safeScore = clampPercent(data.score);
  const safeAlignment = clampPercent(data.alignment);
  const safeStability = clampPercent(data.stability);
  const safeSymmetry = clampPercent(data.symmetry);
  const safeFatigue = clampPercent(data.fatigue);
  const riskWeight = mapRiskWeight(data.riskLevel);
  const riskTint = riskColor(data.riskLevel);
  const logoDataUrl = (await loadLogo("/px-logo.jpeg")) || (await loadLogo("/logo.png"));

  drawPageBackground(doc);

  drawLandingCard(doc, PAGE.margin, PAGE.margin, PAGE.width - PAGE.margin * 2, 34);
  doc.setFillColor(...COLORS.panelSoft);
  doc.roundedRect(PAGE.margin, PAGE.margin, PAGE.width - PAGE.margin * 2, 9, 4, 4, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, imageFormatFromDataUrl(logoDataUrl), PAGE.margin + 4, PAGE.margin + 11, 12, 12);
  } else {
    doc.setFillColor(...COLORS.accentSoft);
    doc.circle(PAGE.margin + 10, PAGE.margin + 17, 5, "F");
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("PX", PAGE.margin + 8.2, PAGE.margin + 18);
  }

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("PostureX", PAGE.margin + 20, PAGE.margin + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text("Engineered posture intelligence", PAGE.margin + 20, PAGE.margin + 21);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Date: ${reportDate}`, PAGE.width - PAGE.margin - 46, PAGE.margin + 16);
  doc.text(`User: ${data.user}`, PAGE.width - PAGE.margin - 46, PAGE.margin + 21);

  drawLandingCard(doc, PAGE.margin, 54, PAGE.width - PAGE.margin * 2, 32);
  doc.setTextColor(...COLORS.accentSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.4);
  doc.text("AI POSTURE SYSTEM", PAGE.margin + 6, 63);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(19);
  doc.text("Engineered posture intelligence", PAGE.margin + 6, 73);
  doc.text("for extreme people", PAGE.margin + 6, 81);

  let y = 94;

  const metricW = (PAGE.width - PAGE.margin * 2 - 6) / 2;
  const metricH = 29;
  const metricCards: Array<{ label: string; value: string; tone: [number, number, number] }> = [
    { label: "Overall Score", value: `${safeScore}%`, tone: COLORS.accentSoft },
    { label: "Alignment", value: `${safeAlignment}%`, tone: [38, 58, 98] },
    { label: "Stability", value: `${safeStability}%`, tone: [56, 76, 114] },
    { label: "Symmetry", value: `${safeSymmetry}%`, tone: [40, 72, 92] }
  ];

  metricCards.forEach((item, index) => {
    const isRight = index % 2 === 1;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + (isRight ? metricW + 6 : 0);
    const cardY = y + row * (metricH + 5);
    drawLandingCard(doc, x, cardY, metricW, metricH);

    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.text(item.label, x + 4, cardY + 9);

    doc.setTextColor(...item.tone);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(item.value, x + 4, cardY + 19);
  });

  y += metricH * 2 + 10;

  const analyticsHeight = 78;
  drawLandingCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, analyticsHeight);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Session Analytics", PAGE.margin + 5, y + 9);

  const ringPanelX = PAGE.margin + 4;
  const ringPanelY = y + 12;
  const ringPanelW = 30;
  const ringPanelH = 42;
  doc.setFillColor(...COLORS.panelSoft);
  doc.roundedRect(ringPanelX, ringPanelY, ringPanelW, ringPanelH, 3, 3, "F");

  const ringX = ringPanelX + ringPanelW / 2;
  const ringY = ringPanelY + 18;
  drawProgressRing(doc, ringX, ringY, 10.2, safeScore);
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.text);
  doc.text(`${safeScore}%`, ringX, ringY + 1.2, { align: "center" });
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.text("Posture Score", ringX, ringPanelY + 34.5, { align: "center" });

  const riskBarX = PAGE.margin + 40;
  const riskBarY = y + 22;
  const riskBarW = PAGE.width - PAGE.margin * 2 - 46;
  const wrappedSessionId = formatSessionIdForWrap(data.sessionId);
  const riskLabel = String(data.riskLevel || "LOW").toUpperCase();
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8.2);
  doc.text("Risk Profile", riskBarX, riskBarY - 3);

  const riskBadgeW = Math.max(22, doc.getTextWidth(riskLabel) + 8);
  const riskBadgeX = riskBarX + riskBarW - riskBadgeW;
  doc.setFillColor(...COLORS.panelSoft);
  doc.roundedRect(riskBadgeX, riskBarY - 8, riskBadgeW, 5.8, 1.8, 1.8, "F");
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text(riskLabel, riskBadgeX + riskBadgeW / 2, riskBarY - 4, { align: "center" });

  doc.setFillColor(228, 234, 245);
  doc.roundedRect(riskBarX, riskBarY, riskBarW, 6, 2, 2, "F");
  doc.setFillColor(...riskTint);
  doc.roundedRect(riskBarX, riskBarY, (riskBarW * riskWeight) / 100, 6, 2, 2, "F");

  const infoY = y + 34;
  const pillH = 8;
  const gap = 4;
  const pillW = (riskBarW - gap) / 2;
  doc.setFillColor(...COLORS.panelSoft);
  doc.roundedRect(riskBarX, infoY, pillW, pillH, 2, 2, "F");
  doc.roundedRect(riskBarX + pillW + gap, infoY, pillW, pillH, 2, 2, "F");

  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text("Duration", riskBarX + 2.5, infoY + 3);
  doc.text("Fatigue", riskBarX + pillW + gap + 2.5, infoY + 3);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  doc.text(formatDuration(data.duration), riskBarX + 2.5, infoY + 6.6);
  doc.text(`${safeFatigue}%`, riskBarX + pillW + gap + 2.5, infoY + 6.6);

  const sessionY = infoY + 12.5;
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.text("Session ID", riskBarX, sessionY);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(7.2);
  const sessionIdLines = doc.splitTextToSize(wrappedSessionId, riskBarW);
  doc.text(sessionIdLines, riskBarX, sessionY + 4.5);

  y += analyticsHeight + 7;

  const contentWidth = PAGE.width - PAGE.margin * 2 - 10;
  const aiFeedbackLines = doc.splitTextToSize(data.aiFeedback, contentWidth);
  const suggestionOneLines = doc.splitTextToSize(
    `1. ${data.suggestions[0] ?? "Keep shoulders relaxed and spine neutral."}`,
    contentWidth
  );
  const suggestionTwoLines = doc.splitTextToSize(
    `2. ${data.suggestions[1] ?? "Take short posture resets every 20 minutes."}`,
    contentWidth
  );
  const riskLines = doc.splitTextToSize(data.riskExplanation, contentWidth);
  const lineHeight = 4.4;

  const aiCardHeight =
    16 +
    aiFeedbackLines.length * lineHeight +
    8 +
    suggestionOneLines.length * lineHeight +
    suggestionTwoLines.length * lineHeight +
    8 +
    riskLines.length * lineHeight +
    8;

  const footerY = PAGE.height - 18;
  if (y + aiCardHeight > footerY - 6) {
    doc.addPage();
    drawPageBackground(doc);
    y = PAGE.margin;
  }

  drawLandingCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, aiCardHeight);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("AI Coach Insights", PAGE.margin + 5, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...COLORS.muted);
  let textY = y + 16;

  doc.text("AI Feedback", PAGE.margin + 5, textY);
  doc.setTextColor(...COLORS.text);
  textY += 5;
  doc.text(aiFeedbackLines, PAGE.margin + 5, textY);
  textY += aiFeedbackLines.length * lineHeight + 3;

  doc.setTextColor(...COLORS.muted);
  doc.text("Action Suggestions", PAGE.margin + 5, textY);
  doc.setTextColor(...COLORS.text);
  textY += 5;
  doc.text(suggestionOneLines, PAGE.margin + 5, textY);
  textY += suggestionOneLines.length * lineHeight;
  doc.text(suggestionTwoLines, PAGE.margin + 5, textY);
  textY += suggestionTwoLines.length * lineHeight + 3;

  doc.setTextColor(...COLORS.muted);
  doc.text("Risk Explanation", PAGE.margin + 5, textY);
  doc.setTextColor(...COLORS.text);
  textY += 5;
  doc.text(riskLines, PAGE.margin + 5, textY);

  doc.setDrawColor(206, 216, 236);
  doc.line(PAGE.margin, PAGE.height - 18, PAGE.width - PAGE.margin, PAGE.height - 18);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.text("Generated by PostureX", PAGE.margin, PAGE.height - 12);
  doc.text(`Session ${data.sessionId}`, PAGE.width - PAGE.margin - 31, PAGE.height - 12);

  const blob = doc.output("blob");
  downloadBlob(blob, filename);
  return blob;
}
