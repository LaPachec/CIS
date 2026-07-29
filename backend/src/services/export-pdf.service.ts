import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma.js";
import { calculateFinalCheck, calculateModuleCheck } from "../routes/checks.routes.js";
import { calculateRanking } from "./results.service.js";

type PdfFile = {
  buffer: Buffer;
  filename: string;
};

type TableColumn = {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center" | "right";
};

type TableRow = Record<string, string | number>;

const pageMargin = 42;
const generatedAt = () => new Date();

export const pdfContentType = "application/pdf";

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatDateBR(date: Date | string | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

function formatDateTimeBR(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatScore(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return `${formatScore(value)}%`;
}

function getCompetitorStatus(params: {
  missingAspects: number;
  judgementReviewCount: number;
  lockedModules: number;
  modulesCount: number;
}) {
  if (params.judgementReviewCount > 0) {
    return "REVISAR";
  }

  if (params.missingAspects > 0) {
    return "PENDENTE";
  }

  if (params.modulesCount > 0 && params.lockedModules === params.modulesCount) {
    return "FECHADO";
  }

  return "COMPLETO";
}

function translateModuleStatus(status: string) {
  const labels: Record<string, string> = {
    EMPTY: "PENDENTE",
    PARTIAL: "PENDENTE",
    COMPLETE: "COMPLETO",
    REVIEW_REQUIRED: "REVISAR",
    LOCKED: "FECHADO",
  };

  return labels[status] ?? status;
}

function drawTitle(doc: PDFKit.PDFDocument, text: string, size = 18) {
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(size).fillColor("#111827").text(text, pageMargin, doc.y, {
    width: doc.page.width - pageMargin * 2,
    align: "left",
  });
  doc.moveDown(0.7);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, text: string) {
  checkPageBreak(doc, 56);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827").text(text, pageMargin, doc.y, {
    width: doc.page.width - pageMargin * 2,
    align: "left",
  });
  doc
    .moveTo(pageMargin, doc.y + 4)
    .lineTo(doc.page.width - pageMargin, doc.y + 4)
    .strokeColor("#CBD5E1")
    .stroke();
  doc.x = pageMargin;
  doc.moveDown(0.8);
}

function checkPageBreak(doc: PDFKit.PDFDocument, requiredHeight: number) {
  if (doc.y + requiredHeight > doc.page.height - pageMargin - 36) {
    doc.addPage();
  }
}

function drawKeyValueTable(doc: PDFKit.PDFDocument, items: Array<[string, string | number]>) {
  const labelWidth = 190;
  const valueWidth = doc.page.width - pageMargin * 2 - labelWidth;

  for (const [label, value] of items) {
    checkPageBreak(doc, 24);
    const y = doc.y;
    doc
      .rect(pageMargin, y, labelWidth, 22)
      .fillAndStroke("#F8FAFC", "#CBD5E1")
      .rect(pageMargin + labelWidth, y, valueWidth, 22)
      .fillAndStroke("#FFFFFF", "#CBD5E1");
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#334155")
      .text(label, pageMargin + 6, y + 6, { width: labelWidth - 12 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#111827")
      .text(String(value), pageMargin + labelWidth + 6, y + 6, { width: valueWidth - 12 });
    doc.y = y + 22;
  }

  doc.moveDown(0.7);
}

function calculateRowHeight(doc: PDFKit.PDFDocument, columns: TableColumn[], row: TableRow) {
  const heights = columns.map((column) =>
    doc.heightOfString(String(row[column.key] ?? ""), {
      width: column.width - 8,
      align: column.align ?? "left",
    }),
  );

  return Math.max(22, Math.max(...heights) + 10);
}

function drawSimpleTable(doc: PDFKit.PDFDocument, columns: TableColumn[], rows: TableRow[]) {
  const drawHeader = () => {
    checkPageBreak(doc, 32);
    const y = doc.y;
    let x = pageMargin;

    for (const column of columns) {
      doc.rect(x, y, column.width, 24).fillAndStroke("#E2E8F0", "#CBD5E1");
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#334155")
        .text(column.header, x + 4, y + 7, {
          width: column.width - 8,
          align: column.align ?? "left",
        });
      x += column.width;
    }

    doc.y = y + 24;
  };

  if (rows.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text("Nenhum registro encontrado.");
    doc.moveDown(0.6);
    return;
  }

  drawHeader();
  doc.font("Helvetica").fontSize(8);

  for (const row of rows) {
    const rowHeight = calculateRowHeight(doc, columns, row);

    if (doc.y + rowHeight > doc.page.height - pageMargin - 36) {
      doc.addPage();
      drawHeader();
    }

    const y = doc.y;
    let x = pageMargin;

    for (const column of columns) {
      doc.rect(x, y, column.width, rowHeight).fillAndStroke("#FFFFFF", "#CBD5E1");
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#111827")
        .text(String(row[column.key] ?? ""), x + 4, y + 6, {
          width: column.width - 8,
          align: column.align ?? "left",
        });
      x += column.width;
    }

    doc.y = y + rowHeight;
  }

  doc.x = pageMargin;
  doc.moveDown(0.8);
}

function addHeaderAndFooter(doc: PDFKit.PDFDocument, competitionName: string, reportGeneratedAt: Date) {
  const pages = doc.bufferedPageRange();

  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(pages.start + index);
    const pageNumber = index + 1;
    const width = doc.page.width;
    const height = doc.page.height;
    const footerY = height - pageMargin - 10;

    if (pageNumber > 1) {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#475569")
        .text("CIS Simulado - Skill 17 Tecnologias Web", pageMargin, 22, {
          width: width - pageMargin * 2,
          align: "left",
        });
      doc
        .moveTo(pageMargin, 36)
        .lineTo(width - pageMargin, 36)
        .strokeColor("#CBD5E1")
        .stroke();
    }

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748B")
      .text(`Página ${pageNumber}`, pageMargin, footerY, { width: 80, lineBreak: false });
    doc
      .text(`Gerado em ${formatDateTimeBR(reportGeneratedAt)} - ${competitionName}`, pageMargin + 80, footerY, {
        width: width - pageMargin * 2 - 80,
        align: "right",
        lineBreak: false,
      });
  }
}

function documentToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

async function buildPendingRows(finalCheck: Awaited<ReturnType<typeof calculateFinalCheck>>) {
  if ("error" in finalCheck) {
    return [];
  }

  const rows: TableRow[] = [];

  for (const competitor of finalCheck.competitors) {
    for (const module of competitor.modules) {
      const moduleCheck = await calculateModuleCheck(competitor.id, module.id);

      if (!("error" in moduleCheck)) {
        for (const missing of moduleCheck.missing) {
          rows.push({
            competitor: `${competitor.workstation ?? "-"} - ${competitor.name}`,
            module: `${module.code} - ${module.name}`,
            subCriterion: missing.subCriterionCode,
            aspect: missing.aspectCode,
            description: missing.description,
            type: "Sem nota",
            values: "-",
            difference: "-",
          });
        }

        for (const review of moduleCheck.needsReview) {
          rows.push({
            competitor: `${competitor.workstation ?? "-"} - ${competitor.name}`,
            module: `${module.code} - ${module.name}`,
            subCriterion: review.subCriterionCode,
            aspect: review.aspectCode,
            description: review.description,
            type: "Julgamento com diferença maior que 1",
            values: review.values.join(", "),
            difference: formatScore(review.difference),
          });
        }
      } else {
        if (module.missingAspects > 0) {
        rows.push({
          competitor: `${competitor.workstation ?? "-"} - ${competitor.name}`,
          module: `${module.code} - ${module.name}`,
          subCriterion: "-",
          aspect: "-",
          description: `${module.missingAspects} aspecto(s) sem nota`,
          type: "Sem nota",
          values: "-",
          difference: "-",
        });
      }

        if (module.judgementReviewCount > 0) {
        rows.push({
          competitor: `${competitor.workstation ?? "-"} - ${competitor.name}`,
          module: `${module.code} - ${module.name}`,
          subCriterion: "-",
          aspect: "-",
          description: `${module.judgementReviewCount} julgamento(s) com diferença maior que 1`,
          type: "Julgamento com diferença maior que 1",
          values: "Ver conferência do módulo",
          difference: "-",
        });
        }
      }

      if (module.status !== "LOCKED") {
        rows.push({
          competitor: `${competitor.workstation ?? "-"} - ${competitor.name}`,
          module: `${module.code} - ${module.name}`,
          subCriterion: "-",
          aspect: "-",
          description: "Módulo ainda não bloqueado",
          type: "Módulo não bloqueado",
          values: "-",
          difference: "-",
        });
      }
    }
  }

  return rows;
}

export async function generateClosingPdf(competitionId: number): Promise<PdfFile> {
  const [competition, finalCheck, ranking, modules] = await Promise.all([
    prisma.competition.findUnique({ where: { id: competitionId } }),
    calculateFinalCheck(competitionId),
    calculateRanking(competitionId),
    prisma.module.findMany({ where: { competitionId }, orderBy: { code: "asc" } }),
  ]);

  if (!competition || "error" in finalCheck) {
    throw new Error("Competition not found");
  }

  const reportGeneratedAt = generatedAt();
  const doc = new PDFDocument({
    size: "A4",
    margin: pageMargin,
    bufferPages: true,
    info: {
      Title: `Relatório Oficial de Fechamento - ${competition.name}`,
      Author: "CIS Simulado",
      Subject: "Fechamento oficial da avaliação",
    },
  });
  const statusText = finalCheck.summary.canCloseCompetition
    ? "AVALIAÇÃO PRONTA PARA FECHAMENTO"
    : "AVALIAÇÃO COM PENDÊNCIAS";
  const rankingFixedWidth = 304;
  const rankingContentWidth = doc.page.width - pageMargin * 2;
  const rankingModuleWidth = modules.length > 0
    ? (rankingContentWidth - rankingFixedWidth) / modules.length
    : 0;
  const moduleHeaders = modules.map((module) => ({
    header: `Mód. ${module.code}`,
    key: `module_${module.id}`,
    width: rankingModuleWidth,
    align: "right" as const,
  }));

  drawTitle(doc, "RELATÓRIO OFICIAL DE FECHAMENTO", 22);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#334155").text("CIS Simulado - Skill 17 Tecnologias Web");
  doc.moveDown(2);
  drawKeyValueTable(doc, [
    ["Competição", competition.name],
    ["Local", competition.location ?? "-"],
    ["Período", `${formatDateBR(competition.startDate)} a ${formatDateBR(competition.endDate)}`],
    ["Gerado em", formatDateTimeBR(reportGeneratedAt)],
    ["Status", statusText],
  ]);
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(10).fillColor("#475569").text(
    "Documento oficial de fechamento gerado a partir dos dados registrados no sistema CIS Simulado.",
    { align: "left" },
  );

  doc.addPage();
  drawSectionTitle(doc, "RESUMO GERAL DA AVALIAÇÃO");
  drawKeyValueTable(doc, [
    ["Total de competidores", finalCheck.summary.competitorsCount],
    ["Total de módulos", finalCheck.summary.modulesCount],
    ["Total de módulos esperados", finalCheck.summary.totalExpectedModules],
    ["Módulos completos", finalCheck.summary.completeModules],
    ["Módulos incompletos", finalCheck.summary.incompleteModules],
    ["Módulos bloqueados", finalCheck.summary.lockedModules],
    ["Aspectos totais", finalCheck.summary.totalAspects],
    ["Aspectos avaliados", finalCheck.summary.markedAspects],
    ["Aspectos pendentes", finalCheck.summary.missingAspects],
    ["Julgamentos para revisar", finalCheck.summary.judgementReviewCount],
    ["Status de fechamento", statusText],
  ]);

  drawSectionTitle(doc, "RANKING FINAL");
  if (ranking.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text("Nenhum competidor cadastrado.");
    doc.moveDown(0.8);
  } else {
    const rankingRows = ranking.map((item) => {
      const checkCompetitor = finalCheck.competitors.find((competitor) => competitor.id === item.competitor.id);
      const row: TableRow = {
        position: item.position,
        competitor: item.competitor.name,
        state: item.competitor.state ?? "-",
        workstation: item.competitor.workstation ?? "-",
        total: formatScore(item.score),
        percentage: formatPercentage(item.percentage),
        status: getCompetitorStatus({
          missingAspects: checkCompetitor?.summary.missingAspects ?? item.missingAspects,
          judgementReviewCount: checkCompetitor?.summary.judgementReviewCount ?? 0,
          lockedModules: checkCompetitor?.summary.lockedModules ?? 0,
          modulesCount: modules.length,
        }),
      };

      for (const module of modules) {
        const moduleResult = item.modules.find((resultModule) => resultModule.module.id === module.id);
        row[`module_${module.id}`] = moduleResult ? formatScore(moduleResult.score) : "0";
      }

      return row;
    });

    drawSimpleTable(
      doc,
      [
        { header: "Pos.", key: "position", width: 26, align: "center" },
        { header: "Competidor", key: "competitor", width: 94 },
        { header: "Estado", key: "state", width: 30, align: "center" },
        { header: "Posto", key: "workstation", width: 34 },
        ...moduleHeaders,
        { header: "Total", key: "total", width: 38, align: "right" },
        { header: "%", key: "percentage", width: 32, align: "right" },
        { header: "Status", key: "status", width: 50 },
      ],
      rankingRows,
    );
  }

  drawSectionTitle(doc, "RESUMO POR COMPETIDOR");
  if (finalCheck.competitors.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text("Nenhum competidor cadastrado.");
  }

  for (const competitor of finalCheck.competitors) {
    checkPageBreak(doc, 120);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111827")
      .text(`COMPETIDOR: ${competitor.workstation ?? "-"} - ${competitor.name}`);
    doc.moveDown(0.4);
    drawKeyValueTable(doc, [
      ["Estado", competitor.state ?? "-"],
      ["Posto", competitor.workstation ?? "-"],
      ["Total obtido", formatScore(competitor.summary.score)],
      ["Total máximo", formatScore(competitor.summary.maxPoints)],
      ["Percentual", formatPercentage(competitor.summary.percentage)],
      [
        "Status",
        getCompetitorStatus({
          missingAspects: competitor.summary.missingAspects,
          judgementReviewCount: competitor.summary.judgementReviewCount,
          lockedModules: competitor.summary.lockedModules,
          modulesCount: competitor.modules.length,
        }),
      ],
    ]);
    drawSimpleTable(
      doc,
      [
        { header: "Módulo", key: "module", width: 118 },
        { header: "Pontuação", key: "score", width: 55, align: "right" },
        { header: "Máximo", key: "maxPoints", width: 50, align: "right" },
        { header: "%", key: "percentage", width: 42, align: "right" },
        { header: "Avaliados", key: "markedAspects", width: 55, align: "center" },
        { header: "Pend.", key: "missingAspects", width: 42, align: "center" },
        { header: "Rev.", key: "reviews", width: 38, align: "center" },
        { header: "Bloqueio", key: "lock", width: 58 },
        { header: "Status", key: "status", width: 68 },
      ],
      competitor.modules.map((module) => ({
        module: `${module.code} - ${module.name}`,
        score: formatScore(module.score),
        maxPoints: formatScore(module.maxPoints),
        percentage: formatPercentage(module.percentage),
        markedAspects: `${module.markedAspects}/${module.totalAspects}`,
        missingAspects: module.missingAspects,
        reviews: module.judgementReviewCount,
        lock: module.status === "LOCKED" ? "Bloqueado" : "Aberto",
        status: translateModuleStatus(module.status),
      })),
    );
  }

  drawSectionTitle(doc, "PENDÊNCIAS E REVISÕES");
  const pendingRows = await buildPendingRows(finalCheck);

  if (pendingRows.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#166534")
      .text("Não foram encontradas pendências ou revisões obrigatórias.");
    doc.moveDown(0.8);
  } else {
    drawSimpleTable(
      doc,
      [
        { header: "Competidor", key: "competitor", width: 78 },
        { header: "Módulo", key: "module", width: 74 },
        { header: "Subcritério", key: "subCriterion", width: 44 },
        { header: "Aspecto", key: "aspect", width: 40 },
        { header: "Descrição", key: "description", width: 122 },
        { header: "Tipo", key: "type", width: 70 },
        { header: "Notas", key: "values", width: 55 },
        { header: "Dif.", key: "difference", width: 28, align: "center" },
      ],
      pendingRows,
    );
  }

  drawSectionTitle(doc, "CONFERÊNCIA E ASSINATURAS");
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
    .text(
      "Declaramos que as informações apresentadas neste relatório correspondem aos dados registrados no sistema CIS Simulado até a data e horário de geração deste documento.",
      { align: "left" },
    );
  doc.moveDown(2.5);

  for (const label of ["Avaliador Responsável", "Supervisor / Chefe de Oficina", "Coordenação da Competição"]) {
    checkPageBreak(doc, 54);
    doc
      .moveTo(pageMargin, doc.y)
      .lineTo(pageMargin + 260, doc.y)
      .strokeColor("#334155")
      .stroke();
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#334155").text(label);
    doc.moveDown(2);
  }

  addHeaderAndFooter(doc, competition.name, reportGeneratedAt);

  return {
    buffer: await documentToBuffer(doc),
    filename: `fechamento-simulado-${sanitizeFileName(String(competitionId))}.pdf`,
  };
}
