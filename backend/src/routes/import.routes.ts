import type { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { parseAssessmentSheet } from "../services/import-assessment-sheet.service.js";
import { parsePositiveInt, sendData, sendError } from "./helpers.js";

type ImportCounters = {
  modulesCreated: number;
  modulesUpdated: number;
  criteriaCreated: number;
  criteriaUpdated: number;
  subCriteriaCreated: number;
  subCriteriaUpdated: number;
  aspectsCreated: number;
  aspectsUpdated: number;
  warnings: string[];
};

export async function importRoutes(app: FastifyInstance) {
  app.post("/import/assessment-sheet", async (request, reply) => {
    let competitionId: number | null = null;
    let fileBuffer: Buffer | null = null;
    let filename = "";

    for await (const part of request.parts()) {
      if (part.type === "field" && part.fieldname === "competitionId") {
        competitionId = parsePositiveInt(String(part.value));
      }

      if (part.type === "file" && part.fieldname === "file") {
        filename = part.filename;
        fileBuffer = await part.toBuffer();
      }
    }

    if (!competitionId) {
      return sendError(reply, 400, "competitionId is required");
    }

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return sendError(reply, 404, "Competition not found");
    }

    if (!fileBuffer || !filename) {
      return sendError(reply, 400, "file is required");
    }

    if (!filename.toLowerCase().endsWith(".xlsx")) {
      return sendError(reply, 400, "Only .xlsx files are accepted");
    }

    try {
      const parsedSheet = await parseAssessmentSheet(fileBuffer);

      const counters: ImportCounters = {
        modulesCreated: 0,
        modulesUpdated: 0,
        criteriaCreated: 0,
        criteriaUpdated: 0,
        subCriteriaCreated: 0,
        subCriteriaUpdated: 0,
        aspectsCreated: 0,
        aspectsUpdated: 0,
        warnings: [...parsedSheet.warnings],
      };

      const moduleTotals = new Map<string, number>();
      const criterionTotals = new Map<string, number>();
      const moduleNames = new Map<string, string>();
      const criterionNames = new Map<string, string>();
      const criterionDescriptions = new Map<string, string | null>();
      const moduleIdsByCode = new Map<string, number>();
      const criterionIdsByKey = new Map<string, number>();
      const subCriterionIdsByKey = new Map<string, number>();

      for (const module of parsedSheet.modules) {
        moduleTotals.set(module.code, module.totalPoints);
        moduleNames.set(module.code, module.name);
        criterionTotals.set(`${module.code}::${module.code}`, module.totalPoints);
        criterionNames.set(`${module.code}::${module.code}`, module.name);
        criterionDescriptions.set(`${module.code}::${module.code}`, "Criterio importado da ficha CIS");
      }

      for (const row of parsedSheet.rows) {
        if (!moduleTotals.has(row.moduleCode)) {
          moduleTotals.set(row.moduleCode, (moduleTotals.get(row.moduleCode) ?? 0) + row.maxPoints);
        }

        moduleNames.set(row.moduleCode, row.moduleName);
        const criterionKey = `${row.moduleCode}::${row.criterionCode}`;

        if (!criterionTotals.has(criterionKey)) {
          criterionTotals.set(criterionKey, (criterionTotals.get(criterionKey) ?? 0) + row.maxPoints);
        }

        criterionNames.set(criterionKey, row.criterionName);
        criterionDescriptions.set(criterionKey, row.criterionDescription);
      }

      await prisma.$transaction(async (tx) => {
        for (const [moduleCode, totalPoints] of moduleTotals) {
          const existingModule = await tx.module.findUnique({
            where: {
              competitionId_code: {
                competitionId,
                code: moduleCode,
              },
            },
          });

          const moduleData = {
            name: moduleNames.get(moduleCode) ?? `Modulo ${moduleCode}`,
            description: null,
            totalPoints: new Prisma.Decimal(totalPoints),
          };

          const module = existingModule
            ? await tx.module.update({
                where: { id: existingModule.id },
                data: moduleData,
              })
            : await tx.module.create({
                data: {
                  competitionId,
                  code: moduleCode,
                  ...moduleData,
                },
              });

          if (existingModule) {
            counters.modulesUpdated += 1;
          } else {
            counters.modulesCreated += 1;
          }

          moduleIdsByCode.set(moduleCode, module.id);

          const defaultCriterionKey = `${moduleCode}::${moduleCode}`;

          if (criterionTotals.has(defaultCriterionKey)) {
            const existingCriterion = await tx.criterion.findUnique({
              where: {
                moduleId_code: {
                  moduleId: module.id,
                  code: moduleCode,
                },
              },
            });

            const criterionData = {
              name: criterionNames.get(defaultCriterionKey) ?? moduleData.name,
              description: criterionDescriptions.get(defaultCriterionKey) ?? null,
              totalPoints: new Prisma.Decimal(criterionTotals.get(defaultCriterionKey) ?? totalPoints),
            };

            const criterion = existingCriterion
              ? await tx.criterion.update({
                  where: { id: existingCriterion.id },
                  data: criterionData,
                })
              : await tx.criterion.create({
                  data: {
                    moduleId: module.id,
                    code: moduleCode,
                    ...criterionData,
                  },
                });

            if (existingCriterion) {
              counters.criteriaUpdated += 1;
            } else {
              counters.criteriaCreated += 1;
            }

            criterionIdsByKey.set(`${module.id}::${moduleCode}`, criterion.id);
          }
        }

        for (const row of parsedSheet.rows) {
          const moduleId = moduleIdsByCode.get(row.moduleCode);

          if (!moduleId) {
            counters.warnings.push(`Aba ${row.sheetName} linha ${row.rowNumber} ignorada: modulo nao encontrado`);
            continue;
          }

          const criterionKey = `${moduleId}::${row.criterionCode}`;
          let criterionId = criterionIdsByKey.get(criterionKey);

          if (!criterionId) {
            const existingCriterion = await tx.criterion.findUnique({
              where: {
                moduleId_code: {
                  moduleId,
                  code: row.criterionCode,
                },
              },
            });

            const criterionData = {
              name: criterionNames.get(`${row.moduleCode}::${row.criterionCode}`) ?? row.criterionName,
              description: criterionDescriptions.get(`${row.moduleCode}::${row.criterionCode}`) ?? null,
              totalPoints: new Prisma.Decimal(criterionTotals.get(`${row.moduleCode}::${row.criterionCode}`) ?? row.maxPoints),
            };

            const criterion = existingCriterion
              ? await tx.criterion.update({
                  where: { id: existingCriterion.id },
                  data: criterionData,
                })
              : await tx.criterion.create({
                  data: {
                    moduleId,
                    code: row.criterionCode,
                    ...criterionData,
                  },
                });

            if (existingCriterion) {
              counters.criteriaUpdated += 1;
            } else {
              counters.criteriaCreated += 1;
            }

            criterionId = criterion.id;
            criterionIdsByKey.set(criterionKey, criterion.id);
          }

          const subCriterionKey = `${criterionId}::${row.subCriterionCode}`;
          let subCriterionId = subCriterionIdsByKey.get(subCriterionKey);

          if (!subCriterionId) {
            const existingSubCriterion = await tx.subCriterion.findUnique({
              where: {
                criterionId_code: {
                  criterionId,
                  code: row.subCriterionCode,
                },
              },
            });

            const subCriterionData = {
              name: row.subCriterionName,
              description: row.subCriterionDescription,
              markingDay: row.markingDay,
              markingTeam: null,
            };

            const subCriterion = existingSubCriterion
              ? await tx.subCriterion.update({
                  where: { id: existingSubCriterion.id },
                  data: subCriterionData,
                })
              : await tx.subCriterion.create({
                  data: {
                    criterionId,
                    code: row.subCriterionCode,
                    ...subCriterionData,
                  },
                });

            if (existingSubCriterion) {
              counters.subCriteriaUpdated += 1;
            } else {
              counters.subCriteriaCreated += 1;
            }

            subCriterionId = subCriterion.id;
            subCriterionIdsByKey.set(subCriterionKey, subCriterion.id);
          }

          const existingAspect = await tx.aspect.findUnique({
            where: {
              subCriterionId_code: {
                subCriterionId,
                code: row.aspectCode,
              },
            },
          });

          const aspectData = {
            description: row.description,
            type: row.type,
            wsos: row.wsos,
            maxPoints: new Prisma.Decimal(row.maxPoints),
            calculationRule: row.calculationRule,
            descriptor0: row.descriptor0,
            descriptor1: row.descriptor1,
            descriptor2: row.descriptor2,
            descriptor3: row.descriptor3,
          };

          if (existingAspect) {
            await tx.aspect.update({
              where: { id: existingAspect.id },
              data: aspectData,
            });
            counters.aspectsUpdated += 1;
          } else {
            await tx.aspect.create({
              data: {
                subCriterionId,
                code: row.aspectCode,
                ...aspectData,
              },
            });
            counters.aspectsCreated += 1;
          }
        }
      });

      return sendData(reply, counters);
    } catch (error) {
      return sendError(reply, 400, error instanceof Error ? error.message : "Spreadsheet could not be read");
    }
  });
}
