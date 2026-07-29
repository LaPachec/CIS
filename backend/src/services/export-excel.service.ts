import ExcelJS from "exceljs";
import { calculateFinalCheck, calculateModuleCheck } from "../routes/checks.routes.js";
import { calculateCompetitionResult, calculateRanking } from "./results.service.js";

type WorkbookFile = {
  buffer: Buffer;
  filename: string;
};

const sheetMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const excelContentType = sheetMimeType;

export function sanitizeSheetName(name: string) {
  const sanitized = name.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();

  return (sanitized || "Planilha").slice(0, 31);
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatScore(value: number) {
  return Math.round(value * 100) / 100;
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

  if (params.lockedModules === params.modulesCount) {
    return "FECHADO";
  }

  return "COMPLETO";
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

function addTitle(worksheet: ExcelJS.Worksheet, title: string, subtitle?: string) {
  worksheet.addRow([title]);
  worksheet.getRow(1).font = { bold: true, size: 16 };

  if (subtitle) {
    worksheet.addRow([subtitle]);
  }

  worksheet.addRow([]);
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text = value === null || value === undefined ? "" : String(value);
      maxLength = Math.max(maxLength, text.length);
    });

    column.width = Math.min(maxLength + 2, 60);
  });
}

function formatMarkValues(marks: Array<{ expertName: string; value: number }>) {
  return marks.map((mark) => `${mark.expertName}: ${formatScore(mark.value)}`).join(" | ");
}

function formatMarkExperts(marks: Array<{ expertName: string }>) {
  return marks.map((mark) => mark.expertName).join(" | ");
}

function formatMarkObservations(marks: Array<{ expertName: string; observation: string | null }>) {
  return marks
    .filter((mark) => mark.observation?.trim())
    .map((mark) => `${mark.expertName}: ${mark.observation}`)
    .join(" | ");
}

async function workbookToFile(workbook: ExcelJS.Workbook, filename: string): Promise<WorkbookFile> {
  const data = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(data),
    filename,
  };
}

async function addRankingSheet(workbook: ExcelJS.Workbook, competitionId: number) {
  const [ranking, finalCheck] = await Promise.all([calculateRanking(competitionId), calculateFinalCheck(competitionId)]);

  if ("error" in finalCheck) {
    throw new Error(finalCheck.error);
  }

  const modules = finalCheck.competitors[0]?.modules ?? [];
  const worksheet = workbook.addWorksheet("Ranking Geral");
  addTitle(
    worksheet,
    `Ranking Geral - ${finalCheck.competition.name}`,
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
  );

  const headers = [
    "Posição",
    "Competidor",
    "Estado",
    "Posto",
    ...modules.map((module) => `Módulo ${module.code}`),
    "Total",
    "Máximo",
    "Percentual",
    "Pendências",
    "Revisões",
    "Status",
  ];
  const headerRow = worksheet.addRow(headers);
  styleHeaderRow(headerRow);

  for (const item of ranking) {
    const checkCompetitor = finalCheck.competitors.find((competitor) => competitor.id === item.competitor.id);
    const moduleScores = modules.map((module) => {
      const resultModule = item.modules.find((moduleResult) => moduleResult.module.id === module.id);

      return resultModule ? formatScore(resultModule.score) : 0;
    });
    const status = getCompetitorStatus({
      missingAspects: checkCompetitor?.summary.missingAspects ?? item.missingAspects,
      judgementReviewCount: checkCompetitor?.summary.judgementReviewCount ?? 0,
      lockedModules: checkCompetitor?.summary.lockedModules ?? 0,
      modulesCount: modules.length,
    });

    worksheet.addRow([
      item.position,
      item.competitor.name,
      item.competitor.state ?? "",
      item.competitor.workstation ?? "",
      ...moduleScores,
      formatScore(item.score),
      formatScore(item.maxPoints),
      `${formatScore(item.percentage)}%`,
      checkCompetitor?.summary.missingAspects ?? item.missingAspects,
      checkCompetitor?.summary.judgementReviewCount ?? 0,
      status,
    ]);
  }

  worksheet.views = [{ state: "frozen", ySplit: 4 }];
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: headers.length },
  };
  autoFitColumns(worksheet);

  return finalCheck;
}

async function addCompetitorSheets(workbook: ExcelJS.Workbook, competitionId: number, competitorId: number) {
  const [competitionResult, finalCheck] = await Promise.all([
    calculateCompetitionResult(competitionId, competitorId),
    calculateFinalCheck(competitionId),
  ]);

  if ("error" in finalCheck) {
    throw new Error(finalCheck.error);
  }

  const checkCompetitor = finalCheck.competitors.find((competitor) => competitor.id === competitorId);

  if (!checkCompetitor) {
    throw new Error("Competitor not found");
  }

  const summarySheet = workbook.addWorksheet("Resumo");
  addTitle(summarySheet, `Relatório - ${competitionResult.competitor.name}`, `Gerado em ${new Date().toLocaleString("pt-BR")}`);
  summarySheet.addRows([
    ["Competição", competitionResult.competition.name],
    ["Competidor", competitionResult.competitor.name],
    ["Estado", competitionResult.competitor.state ?? ""],
    ["Posto", competitionResult.competitor.workstation ?? ""],
    ["Total obtido", formatScore(competitionResult.score)],
    ["Total máximo", formatScore(competitionResult.maxPoints)],
    ["Percentual", `${formatScore(competitionResult.percentage)}%`],
    [
      "Status geral",
      getCompetitorStatus({
        missingAspects: checkCompetitor.summary.missingAspects,
        judgementReviewCount: checkCompetitor.summary.judgementReviewCount,
        lockedModules: checkCompetitor.summary.lockedModules,
        modulesCount: checkCompetitor.modules.length,
      }),
    ],
  ]);
  summarySheet.addRow([]);
  const moduleHeader = summarySheet.addRow(["Módulo", "Nome", "Pontuação", "Máximo", "Percentual", "Pendências", "Revisões", "Status"]);
  styleHeaderRow(moduleHeader);

  for (const module of checkCompetitor.modules) {
    summarySheet.addRow([
      module.code,
      module.name,
      formatScore(module.score),
      formatScore(module.maxPoints),
      `${formatScore(module.percentage)}%`,
      module.missingAspects,
      module.judgementReviewCount,
      module.status,
    ]);
  }

  autoFitColumns(summarySheet);

  for (const moduleResult of competitionResult.modules) {
    const moduleCheck = await calculateModuleCheck(competitorId, moduleResult.module.id);

    if ("error" in moduleCheck) {
      continue;
    }

    const worksheet = workbook.addWorksheet(sanitizeSheetName(`Modulo ${moduleResult.module.code}`));
    addTitle(worksheet, `${moduleResult.module.code} - ${moduleResult.module.name}`);
    const header = worksheet.addRow([
      "Critério",
      "Subcritério",
      "Código Aspecto",
      "Descrição do Aspecto",
      "Tipo",
      "WSOS",
      "Pontuação Máxima",
      "Nota Consolidada",
      "Valor(es) Lançado(s)",
      "Avaliador(es)",
      "Observação",
      "Bloqueada",
      "Status",
    ]);
    styleHeaderRow(header);

    for (const criterion of moduleResult.criteria) {
      for (const subCriterion of criterion.subCriteria) {
        for (const aspect of subCriterion.aspects) {
          const values = formatMarkValues(aspect.marks);
          const experts = formatMarkExperts(aspect.marks);
          const observations = formatMarkObservations(aspect.marks);
          const locked = aspect.marks.length > 0 && aspect.marks.every((mark) => mark.locked);
          const status = !aspect.isMarked ? "PENDENTE" : aspect.needsReview ? "REVISAR" : "OK";
          const row = worksheet.addRow([
            criterion.code,
            subCriterion.code,
            aspect.code,
            aspect.description,
            aspect.type,
            aspect.wsos ?? "",
            formatScore(aspect.maxPoints),
            formatScore(aspect.score),
            values,
            experts,
            observations,
            locked ? "Sim" : "Não",
            status,
          ]);

          if (status === "REVISAR") {
            row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
          }

          if (status === "PENDENTE") {
            row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
          }
        }
      }
    }

    worksheet.views = [{ state: "frozen", ySplit: 4 }];
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: 13 },
    };
    autoFitColumns(worksheet);
  }

  return { competitionResult, checkCompetitor };
}

export async function generateRankingWorkbook(competitionId: number) {
  const workbook = new ExcelJS.Workbook();
  await addRankingSheet(workbook, competitionId);

  return workbookToFile(workbook, `ranking-simulado-${competitionId}.xlsx`);
}

export async function generateCompetitorWorkbook(competitionId: number, competitorId: number) {
  const workbook = new ExcelJS.Workbook();
  const { competitionResult } = await addCompetitorSheets(workbook, competitionId, competitorId);
  const workstation = competitionResult.competitor.workstation ?? `competidor-${competitorId}`;
  const name = sanitizeFilename(competitionResult.competitor.name);

  return workbookToFile(workbook, `relatorio-${sanitizeFilename(workstation)}-${name}.xlsx`);
}

export async function generateCompetitionWorkbook(competitionId: number) {
  const workbook = new ExcelJS.Workbook();
  const finalCheck = await addRankingSheet(workbook, competitionId);
  const summarySheet = workbook.addWorksheet("Resumo Conferência");
  addTitle(summarySheet, `Resumo Conferência - ${finalCheck.competition.name}`);
  const header = summarySheet.addRow([
    "Competidor",
    "Estado",
    "Posto",
    "Módulo",
    "Status",
    "Aspectos Totais",
    "Aspectos Avaliados",
    "Pendências",
    "Revisões",
    "Notas Bloqueadas",
    "Pode Fechar",
  ]);
  styleHeaderRow(header);

  for (const competitor of finalCheck.competitors) {
    for (const module of competitor.modules) {
      summarySheet.addRow([
        competitor.name,
        competitor.state ?? "",
        competitor.workstation ?? "",
        module.code,
        module.status,
        module.totalAspects,
        module.markedAspects,
        module.missingAspects,
        module.judgementReviewCount,
        module.lockedMarks,
        finalCheck.summary.canCloseCompetition ? "Sim" : "Não",
      ]);
    }
  }

  autoFitColumns(summarySheet);

  for (const competitor of finalCheck.competitors) {
    const competitionResult = await calculateCompetitionResult(competitionId, competitor.id);
    const worksheet = workbook.addWorksheet(sanitizeSheetName(`${competitor.workstation ?? competitor.id} ${competitor.name}`));

    addTitle(worksheet, `RelatÃ³rio - ${competitionResult.competitor.name}`);
    worksheet.addRows([
      ["Competidor", competitionResult.competitor.name],
      ["Estado", competitionResult.competitor.state ?? ""],
      ["Posto", competitionResult.competitor.workstation ?? ""],
      ["Total obtido", formatScore(competitionResult.score)],
      ["Total mÃ¡ximo", formatScore(competitionResult.maxPoints)],
      ["Percentual", `${formatScore(competitionResult.percentage)}%`],
      [
        "Status geral",
        getCompetitorStatus({
          missingAspects: competitor.summary.missingAspects,
          judgementReviewCount: competitor.summary.judgementReviewCount,
          lockedModules: competitor.summary.lockedModules,
          modulesCount: competitor.modules.length,
        }),
      ],
    ]);
    worksheet.addRow([]);

    const detailHeader = worksheet.addRow([
      "MÃ³dulo",
      "CritÃ©rio",
      "SubcritÃ©rio",
      "CÃ³digo Aspecto",
      "DescriÃ§Ã£o do Aspecto",
      "Tipo",
      "WSOS",
      "PontuaÃ§Ã£o MÃ¡xima",
      "Nota Consolidada",
      "Valor(es) LanÃ§ado(s)",
      "Avaliador(es)",
      "ObservaÃ§Ã£o",
      "Bloqueada",
      "Status",
    ]);
    styleHeaderRow(detailHeader);

    for (const moduleResult of competitionResult.modules) {
      for (const criterion of moduleResult.criteria) {
        for (const subCriterion of criterion.subCriteria) {
          for (const aspect of subCriterion.aspects) {
            const values = formatMarkValues(aspect.marks);
            const experts = formatMarkExperts(aspect.marks);
            const observations = formatMarkObservations(aspect.marks);
            const locked = aspect.marks.length > 0 && aspect.marks.every((mark) => mark.locked);
            const status = !aspect.isMarked ? "PENDENTE" : aspect.needsReview ? "REVISAR" : "OK";
            const row = worksheet.addRow([
              moduleResult.module.code,
              criterion.code,
              subCriterion.code,
              aspect.code,
              aspect.description,
              aspect.type,
              aspect.wsos ?? "",
              formatScore(aspect.maxPoints),
              formatScore(aspect.score),
              values,
              experts,
              observations,
              locked ? "Sim" : "NÃ£o",
              status,
            ]);

            if (status === "REVISAR") {
              row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
            }

            if (status === "PENDENTE") {
              row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
            }
          }
        }
      }
    }

    worksheet.autoFilter = {
      from: { row: detailHeader.number, column: 1 },
      to: { row: detailHeader.number, column: 14 },
    };
    autoFitColumns(worksheet);
  }

  return workbookToFile(workbook, `relatorio-completo-competicao-${competitionId}.xlsx`);
}
