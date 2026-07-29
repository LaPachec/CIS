import { ExpertRole } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

export type RequiredJudgementMarks = {
  requiredJudgementMarks: number;
  totalMarkingUsers: number;
};

export async function getRequiredJudgementMarks(competitionId: number): Promise<RequiredJudgementMarks> {
  const totalMarkingUsers = await prisma.expert.count({
    where: {
      competitionId,
      role: {
        in: [ExpertRole.EXPERT, ExpertRole.SUPERVISOR, ExpertRole.ADMIN],
      },
    },
  });

  return {
    requiredJudgementMarks: Math.max(1, Math.min(3, totalMarkingUsers)),
    totalMarkingUsers,
  };
}

export function buildIncompleteJudgementReason(marksCount: number, requiredJudgementMarks: number) {
  return `O julgamento possui ${marksCount} nota(s), mas são necessárias ${requiredJudgementMarks} nota(s) para esta competição.`;
}
