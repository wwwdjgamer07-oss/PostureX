import { jsPDF } from "jspdf";

export interface GameSuggestionPDFInput {
  game: string;
  model: string;
  why: string;
  code: string;
}

export async function generateGameSuggestionPDF(input: GameSuggestionPDFInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(7, 12, 23);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(12, 19, 35);
  doc.roundedRect(12, 12, 186, 24, 4, 4, "F");
  doc.setTextColor(34, 211, 238);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PostureX Game Model Suggestion", 18, 22);
  doc.setTextColor(224, 242, 254);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Game: ${input.game.toUpperCase()}`, 18, 29);
  doc.text(`Suggested Model: ${input.model}`, 90, 29);

  doc.setFillColor(15, 29, 48);
  doc.roundedRect(12, 42, 186, 34, 4, 4, "F");
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Why this model", 18, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const whyLines = doc.splitTextToSize(input.why, 174);
  doc.text(whyLines, 18, 57);

  doc.setFillColor(2, 6, 23);
  doc.roundedRect(12, 82, 186, 197, 4, 4, "F");
  doc.setTextColor(103, 232, 249);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Reference Snippet", 18, 90);
  doc.setTextColor(186, 230, 253);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  const codeLines = doc.splitTextToSize(input.code, 174);
  doc.text(codeLines.slice(0, 140), 18, 96);

  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(0.3);
  doc.line(12, 286, 198, 286);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 12, 292);

  const fileName = `PostureX_${input.game}_model_suggestion.pdf`;
  doc.save(fileName);
}

