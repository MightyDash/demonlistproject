import { difficultyClass, isInProgressDemon } from "./demonUtils.js";

export const STATISTICS_DIFFICULTIES = [
  { key: "easy", label: "Easy Demon" },
  { key: "medium", label: "Medium Demon" },
  { key: "hard", label: "Hard Demon" },
  { key: "insane", label: "Insane Demon" },
  { key: "extreme", label: "Extreme Demon" }
];

function strongestDemon(demons) {
  return demons
    .slice()
    .sort((first, second) => Number(second.tier || 0) - Number(first.tier || 0))[0] || null;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

export function buildDemonStatistics(demons) {
  const completed = (Array.isArray(demons) ? demons : []).filter(demon => !isInProgressDemon(demon));
  const totalAttempts = completed.reduce((sum, demon) => sum + Number(demon.attempts || 0), 0);
  const difficultyCounts = Object.fromEntries(STATISTICS_DIFFICULTIES.map(({ key }) => [key, 0]));
  const yearlyGroups = new Map();

  completed.forEach(demon => {
    const difficulty = difficultyClass(demon.difficulty);
    if (difficultyCounts[difficulty] !== undefined) difficultyCounts[difficulty] += 1;

    const year = Number(demon.dateYear || demon.year || 0);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
    if (!yearlyGroups.has(year)) yearlyGroups.set(year, []);
    yearlyGroups.get(year).push(demon);
  });

  const years = Array.from(yearlyGroups.entries())
    .sort(([firstYear], [secondYear]) => firstYear - secondYear)
    .map(([year, yearDemons]) => {
      const attempts = yearDemons.reduce((sum, demon) => sum + Number(demon.attempts || 0), 0);
      return {
        year,
        total: yearDemons.length,
        attempts,
        averageAttempts: Math.round(average(yearDemons.map(demon => demon.attempts))),
        averageTier: average(yearDemons.map(demon => demon.tier)),
        hardest: strongestDemon(yearDemons),
        totalChange: 0,
        attemptsChange: 0
      };
    });

  years.forEach((summary, index) => {
    const previous = years[index - 1];
    if (!previous) return;
    summary.totalChange = summary.total - previous.total;
    summary.attemptsChange = summary.attempts - previous.attempts;
  });

  const latestYear = years.at(-1) || null;

  return {
    total: completed.length,
    attempts: totalAttempts,
    averageAttempts: Math.round(average(completed.map(demon => demon.attempts))),
    averageTier: average(completed.map(demon => demon.tier)),
    hardest: strongestDemon(completed),
    difficultyCounts,
    years,
    latestYear,
    maxYearTotal: Math.max(1, ...years.map(summary => summary.total))
  };
}
