import ExcelJS from "exceljs";
import { AspectType, type AspectType as AspectTypeValue } from "../../generated/prisma/enums.js";

export type ImportedAssessmentRow = {
  sheetName: string;
  rowNumber: number;
  moduleCode: string;
  moduleName: string;
  moduleTotalPoints: number | null;
  criterionCode: string;
  criterionName: string;
  criterionDescription: string | null;
  criterionTotalPoints: number | null;
  subCriterionCode: string;
  subCriterionName: string;
  subCriterionDescription: string | null;
  markingDay: string | null;
  aspectCode: string;
  description: string;
  extraDescription: string | null;
  requirement: string | null;
  type: AspectTypeValue;
  wsos: string | null;
  maxPoints: number;
  calculationRule: string | null;
  descriptor0: string | null;
  descriptor1: string | null;
  descriptor2: string | null;
  descriptor3: string | null;
};

export type ImportedAssessmentModule = {
  code: string;
  name: string;
  totalPoints: number;
};

const defaultModuleTotalPoints = 20;

type ColumnKey =
  | "module"
  | "criterion"
  | "subCriterion"
  | "aspect"
  | "description"
  | "type"
  | "wsos"
  | "maxPoints"
  | "descriptor0"
  | "descriptor1"
  | "descriptor2"
  | "descriptor3";

type HeaderMap = Partial<Record<ColumnKey, number>>;

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  module: ["modulo", "module"],
  criterion: ["criterio", "criterion", "codigo criterio"],
  subCriterion: ["subcriterio", "sub criterion", "subcriterion"],
  aspect: ["aspecto", "aspect", "codigo aspecto"],
  description: ["descricao", "description", "aspect description"],
  type: ["tipo", "type", "metodo", "measurement judgement", "measurement/judgement"],
  wsos: ["wsos", "wsss"],
  maxPoints: ["pontos", "pontuacao", "max points", "maximum mark", "marks"],
  descriptor0: ["descritor 0", "descriptor 0"],
  descriptor1: ["descritor 1", "descriptor 1"],
  descriptor2: ["descritor 2", "descriptor 2"],
  descriptor3: ["descritor 3", "descriptor 3"],
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\w\s/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cellToText(cell: ExcelJS.Cell) {
  const value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && value.text) {
      return normalizeText(value.text);
    }

    if ("result" in value && value.result !== undefined) {
      return normalizeText(value.result);
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return normalizeText(value.richText.map((item) => item.text).join(""));
    }

    return normalizeText(cell.text);
  }

  return normalizeText(value);
}

function identifyHeader(row: ExcelJS.Row) {
  const headerMap: HeaderMap = {};

  row.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cellToText(cell));

    if (!header) {
      return;
    }

    for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [ColumnKey, string[]][]) {
      if (!headerMap[key] && aliases.includes(header)) {
        headerMap[key] = colNumber;
      }
    }
  });

  return headerMap;
}

function hasMinimumHeaders(headerMap: HeaderMap) {
  const mappedHeaders = Object.keys(headerMap).length;

  return mappedHeaders >= 4 && Boolean(headerMap.description) && Boolean(headerMap.type) && Boolean(headerMap.maxPoints);
}

function getCell(row: ExcelJS.Row, headerMap: HeaderMap, key: ColumnKey) {
  const colNumber = headerMap[key];

  if (!colNumber) {
    return "";
  }

  return cellToText(row.getCell(colNumber));
}

function normalizeAspectType(value: string) {
  const normalized = normalizeHeader(value);

  if (["medicao", "measurement", "meas", "m"].includes(normalized)) {
    return AspectType.MEASUREMENT;
  }

  if (["julgamento", "judgement", "judgment", "judg", "j"].includes(normalized)) {
    return AspectType.JUDGEMENT;
  }

  return null;
}

function parseDecimal(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = normalizeText(value).replace(",", ".").trim();
  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function normalizeModule(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return {
      code: "Geral",
      name: "Modulo Geral",
    };
  }

  const withoutPrefix = normalized.replace(/^modulo\s+/i, "").trim();
  const code = withoutPrefix.split(" ")[0]?.trim() || normalized;
  const name = /^modulo\s+/i.test(normalized) ? normalized : `Modulo ${code}`;

  return {
    code,
    name,
  };
}

function normalizeCode(value: string) {
  return normalizeText(value);
}

function getCellByColumn(row: ExcelJS.Row, colNumber: number) {
  return cellToText(row.getCell(colNumber));
}

function rowHasText(row: ExcelJS.Row, expectedText: string) {
  let found = false;
  const normalizedExpectedText = normalizeHeader(expectedText);

  row.eachCell((cell) => {
    if (normalizeHeader(cellToText(cell)) === normalizedExpectedText) {
      found = true;
    }
  });

  return found;
}

function isCisMainHeaderRow(row: ExcelJS.Row) {
  const firstColumn = normalizeHeader(getCellByColumn(row, 1));

  return firstColumn.includes("sub") && firstColumn.includes("criterion") && firstColumn.includes("id");
}

function isRepeatedHeaderRow(row: ExcelJS.Row) {
  return isCisMainHeaderRow(row);
}

function isEmptyRow(row: ExcelJS.Row) {
  for (let colNumber = 1; colNumber <= 11; colNumber += 1) {
    if (normalizeText(getCellByColumn(row, colNumber))) {
      return false;
    }
  }

  return true;
}

function getModuleCodeFromSubCriterion(subCriterionCode: string) {
  return normalizeText(subCriterionCode).charAt(0).toUpperCase();
}

function isSubCriterionRow(row: ExcelJS.Row) {
  const code = normalizeCode(getCellByColumn(row, 1)).toUpperCase();
  const name = normalizeText(getCellByColumn(row, 2));
  const type = normalizeText(getCellByColumn(row, 4));

  return /^[A-Z][0-9]+/.test(code) && Boolean(name) && !type;
}

function isAspectRow(row: ExcelJS.Row) {
  const type = normalizeAspectType(getCellByColumn(row, 4));
  const description = normalizeText(getCellByColumn(row, 5));
  const maxPoints = parseDecimal(getCellByColumn(row, 11));

  return Boolean(type) && Boolean(description) && maxPoints !== null;
}

function isJudgementDescriptorRow(row: ExcelJS.Row) {
  const score = parseDecimal(getCellByColumn(row, 6));
  const description = normalizeText(getCellByColumn(row, 7));

  return score !== null && [0, 1, 2, 3].includes(score) && Boolean(description);
}

function findCisCriteriaHeader(worksheet: ExcelJS.Worksheet) {
  let titleRow = 0;

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    if (rowHasText(row, "Criteria")) {
      titleRow = rowNumber;
      continue;
    }

    if (titleRow > 0 && rowNumber > titleRow) {
      let idColumn = 0;
      let nameColumn = 0;
      let markColumn = 0;

      row.eachCell((cell, colNumber) => {
        const header = normalizeHeader(cellToText(cell));

        if (header === "id") {
          idColumn = colNumber;
        }

        if (header === "name") {
          nameColumn = colNumber;
        }

        if (header === "mark") {
          markColumn = colNumber;
        }
      });

      if (idColumn && nameColumn && markColumn) {
        return {
          rowNumber,
          idColumn,
          nameColumn,
          markColumn,
        };
      }
    }
  }

  return null;
}

function extractModuleDefinitions(worksheet: ExcelJS.Worksheet) {
  const modules: ImportedAssessmentModule[] = [];
  const header = findCisCriteriaHeader(worksheet);

  if (!header) {
    return modules;
  }

  for (let rowNumber = header.rowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const code = normalizeCode(getCellByColumn(row, header.idColumn)).toUpperCase();
    const name = normalizeText(getCellByColumn(row, header.nameColumn));
    const totalPoints = parseDecimal(getCellByColumn(row, header.markColumn));

    if (isCisMainHeaderRow(row)) {
      break;
    }

    if (!code && !name && totalPoints === null) {
      break;
    }

    if (!/^[A-Z]$/.test(code) || !name || totalPoints === null) {
      continue;
    }

    modules.push({
      code,
      name,
      totalPoints,
    });
  }

  return modules;
}

function findCisMainHeaderRow(worksheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    if (isCisMainHeaderRow(worksheet.getRow(rowNumber))) {
      return rowNumber;
    }
  }

  return 0;
}

function getModuleForSubCriterion(subCriterionCode: string, modulesByCode: Map<string, ImportedAssessmentModule>) {
  const moduleCode = getModuleCodeFromSubCriterion(subCriterionCode) || "Geral";
  const module = modulesByCode.get(moduleCode);

  return {
    code: moduleCode,
    name: module?.name ?? `Modulo ${moduleCode}`,
    totalPoints: module?.totalPoints ?? defaultModuleTotalPoints,
  };
}

function parseCisWorksheet(worksheet: ExcelJS.Worksheet) {
  const modules = extractModuleDefinitions(worksheet);
  const modulesByCode = new Map(modules.map((module) => [module.code, module]));
  const rows: ImportedAssessmentRow[] = [];
  const warnings: string[] = [];
  const hasMainHeader = Boolean(findCisMainHeaderRow(worksheet));

  if (!hasMainHeader) {
    warnings.push(`Aba ${worksheet.name} ignorada: cabecalho da tabela principal nao identificado`);
    return { modules, rows, warnings };
  }

  let currentSubCriterion:
    | {
        code: string;
        name: string;
        description: string;
        markingDay: string | null;
      }
    | null = null;
  const aspectCountersBySubCriterion = new Map<string, number>();
  let lastJudgementAspect: ImportedAssessmentRow | null = null;
  let mainTableStarted = false;

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    if (isEmptyRow(row)) {
      continue;
    }

    if (isRepeatedHeaderRow(row)) {
      mainTableStarted = true;
      lastJudgementAspect = null;
      continue;
    }

    if (!mainTableStarted) {
      continue;
    }

    if (isSubCriterionRow(row)) {
      const codeMatch = normalizeCode(getCellByColumn(row, 1)).toUpperCase().match(/^[A-Z][0-9]+/);
      const code = codeMatch?.[0] ?? normalizeCode(getCellByColumn(row, 1)).toUpperCase();
      const description = normalizeText(getCellByColumn(row, 2));

      currentSubCriterion = {
        code,
        name: description,
        description,
        markingDay: normalizeText(getCellByColumn(row, 3)) || null,
      };
      lastJudgementAspect = null;
      continue;
    }

    if (lastJudgementAspect && isJudgementDescriptorRow(row)) {
      const score = parseDecimal(getCellByColumn(row, 6));
      const description = normalizeText(getCellByColumn(row, 7));

      if (score === 0) {
        lastJudgementAspect.descriptor0 = description;
      }

      if (score === 1) {
        lastJudgementAspect.descriptor1 = description;
      }

      if (score === 2) {
        lastJudgementAspect.descriptor2 = description;
      }

      if (score === 3) {
        lastJudgementAspect.descriptor3 = description;
      }

      continue;
    }

    const rawType = getCellByColumn(row, 4);
    const description = normalizeText(getCellByColumn(row, 5));
    const rawMaxPoints = getCellByColumn(row, 11);
    const maxPoints = parseDecimal(rawMaxPoints);
    const type = normalizeAspectType(rawType);

    if (!rawType && !description && !rawMaxPoints) {
      continue;
    }

    if (!isAspectRow(row)) {
      if (rawType || description || rawMaxPoints) {
        const reason = !type
          ? "tipo de aspecto invalido"
          : !description
            ? "aspecto sem descricao"
            : "aspecto sem pontuacao";
        warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: ${reason}`);
      }
      lastJudgementAspect = null;
      continue;
    }

    if (!currentSubCriterion) {
      warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: aspecto sem subcriterio`);
      lastJudgementAspect = null;
      continue;
    }

    const module = getModuleForSubCriterion(currentSubCriterion.code, modulesByCode);
    const nextAspectNumber = (aspectCountersBySubCriterion.get(currentSubCriterion.code) ?? 0) + 1;
    aspectCountersBySubCriterion.set(currentSubCriterion.code, nextAspectNumber);

    const requirement = normalizeText(getCellByColumn(row, 8));
    const extraDescription = normalizeText(getCellByColumn(row, 7));
    const aspect: ImportedAssessmentRow = {
      sheetName: worksheet.name,
      rowNumber,
      moduleCode: module.code,
      moduleName: module.name,
      moduleTotalPoints: module.totalPoints,
      criterionCode: module.code,
      criterionName: module.name,
      criterionDescription: "Criterio importado da ficha CIS",
      criterionTotalPoints: module.totalPoints,
      subCriterionCode: currentSubCriterion.code,
      subCriterionName: currentSubCriterion.name,
      subCriterionDescription: currentSubCriterion.description,
      markingDay: currentSubCriterion.markingDay,
      aspectCode: `${currentSubCriterion.code}.${nextAspectNumber}`,
      description,
      extraDescription: extraDescription || null,
      requirement: requirement || null,
      type: type as AspectTypeValue,
      wsos: normalizeText(getCellByColumn(row, 9)) || null,
      maxPoints: maxPoints as number,
      calculationRule: type === AspectType.MEASUREMENT ? "FULL_OR_ZERO" : "JUDGEMENT_0_3",
      descriptor0: null,
      descriptor1: null,
      descriptor2: null,
      descriptor3: null,
    };

    rows.push(aspect);
    lastJudgementAspect = type === AspectType.JUDGEMENT ? aspect : null;
  }

  return { modules, rows, warnings };
}

export async function parseAssessmentSheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  const modules: ImportedAssessmentModule[] = [];
  const warnings: string[] = [];
  const rows: ImportedAssessmentRow[] = [];

  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new Error("Spreadsheet could not be read");
  }

  workbook.eachSheet((worksheet) => {
    const normalizedSheetName = normalizeHeader(worksheet.name);

    if (normalizedSheetName === "calculations") {
      return;
    }

    if (normalizedSheetName === "cis marking scheme import") {
      const cisResult = parseCisWorksheet(worksheet);
      modules.push(...cisResult.modules);
      rows.push(...cisResult.rows);
      warnings.push(...cisResult.warnings);
      return;
    }

    let headerMap: HeaderMap | null = null;
    let headerRowNumber = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (!headerMap) {
        const candidateHeader = identifyHeader(row);

        if (hasMinimumHeaders(candidateHeader)) {
          headerMap = candidateHeader;
          headerRowNumber = rowNumber;
        }

        return;
      }

      if (rowNumber <= headerRowNumber) {
        return;
      }

      const description = normalizeText(getCell(row, headerMap, "description"));
      const rawMaxPoints = getCell(row, headerMap, "maxPoints");

      if (!description && !rawMaxPoints) {
        return;
      }

      const type = normalizeAspectType(getCell(row, headerMap, "type"));

      if (!type) {
        warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: tipo de aspecto nao identificado`);
        return;
      }

      const maxPoints = parseDecimal(rawMaxPoints);

      if (maxPoints === null || maxPoints < 0) {
        warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: pontuacao invalida`);
        return;
      }

      const aspectCode = normalizeCode(getCell(row, headerMap, "aspect"));

      if (!aspectCode) {
        warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: codigo do aspecto ausente`);
        return;
      }

      if (!description) {
        warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: descricao ausente`);
        return;
      }

      const criterionCode = normalizeCode(getCell(row, headerMap, "criterion"));

      if (!criterionCode) {
        warnings.push(`Aba ${worksheet.name} linha ${rowNumber} ignorada: codigo do criterio ausente`);
        return;
      }

      const module = normalizeModule(getCell(row, headerMap, "module"));
      const subCriterionCode = normalizeCode(getCell(row, headerMap, "subCriterion")) || `${criterionCode}.1`;

      rows.push({
        sheetName: worksheet.name,
        rowNumber,
        moduleCode: module.code,
        moduleName: module.name,
        moduleTotalPoints: null,
        criterionCode,
        criterionName: `Criterio ${criterionCode}`,
        criterionDescription: null,
        criterionTotalPoints: null,
        subCriterionCode,
        subCriterionName: subCriterionCode === `${criterionCode}.1` ? "Geral" : `Subcriterio ${subCriterionCode}`,
        subCriterionDescription: subCriterionCode === `${criterionCode}.1` ? "Geral" : `Subcriterio ${subCriterionCode}`,
        markingDay: null,
        aspectCode,
        description,
        extraDescription: null,
        requirement: null,
        type,
        wsos: normalizeText(getCell(row, headerMap, "wsos")) || null,
        maxPoints,
        calculationRule: null,
        descriptor0: normalizeText(getCell(row, headerMap, "descriptor0")) || null,
        descriptor1: normalizeText(getCell(row, headerMap, "descriptor1")) || null,
        descriptor2: normalizeText(getCell(row, headerMap, "descriptor2")) || null,
        descriptor3: normalizeText(getCell(row, headerMap, "descriptor3")) || null,
      });
    });

    if (!headerMap) {
      warnings.push(`Aba ${worksheet.name} ignorada: cabecalho nao identificado`);
    }
  });

  return {
    modules,
    rows,
    warnings,
  };
}
