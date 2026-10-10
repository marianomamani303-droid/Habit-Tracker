import { addDays, daily, metrics, monday, periods } from "./habitCalendar.js";

export const achievementCatalog = [
  {
    codigo: "primero",
    nombre: "La primera hoja",
    descripcion: "Completá tu primer hábito.",
    objetivo: 1,
    icono: "leaf",
  },
  {
    codigo: "racha7",
    nombre: "Raíces firmes",
    descripcion: "Cumplí 7 días programados consecutivos de un hábito.",
    objetivo: 7,
    icono: "flame",
  },
  {
    codigo: "racha30",
    nombre: "En plena floración",
    descripcion: "Cumplí 30 días programados consecutivos de un hábito.",
    objetivo: 30,
    icono: "flower",
  },
  {
    codigo: "total50",
    nombre: "Un bosque de pasos",
    descripcion: "Completá 50 hábitos en días programados.",
    objetivo: 50,
    icono: "tree",
  },
  {
    codigo: "total100",
    nombre: "Tu propia primavera",
    descripcion: "Completá 100 hábitos en días programados.",
    objetivo: 100,
    icono: "sun",
  },
  {
    codigo: "perfecta",
    nombre: "Semana en equilibrio",
    descripcion:
      "Cumplí todos los hábitos programados de una semana completa y cerrada.",
    objetivo: 1,
    icono: "medal",
  },
];

export function achievementEvidence(habits, cutoff) {
  let total = 0;
  let bestDailyStreak = 0;
  let bestStreak = 0;
  for (const habit of habits) {
    total += habit.registros.filter(
      (row) =>
        row.fecha <= cutoff &&
        daily(habit, row.fecha).programado &&
        daily(habit, row.fecha).completado,
    ).length;
    bestStreak = Math.max(bestStreak, metrics(habit, cutoff).mejorRacha);
    let streak = 0;
    for (const period of periods(habit, cutoff)) {
      if (period.frecuencia === "semanal") {
        streak = 0;
        continue;
      }
      if (period.completado) {
        streak++;
        bestDailyStreak = Math.max(bestDailyStreak, streak);
      } else if (!period.actual) streak = 0;
    }
  }
  const first = habits
    .flatMap((habit) => habit.versiones.slice(0, 1).map((v) => v.desde))
    .sort()[0];
  const allPeriods = habits.flatMap((habit) => periods(habit, cutoff));
  let perfect = false;
  if (first)
    for (
      let start = monday(first);
      addDays(start, 6) < cutoff;
      start = addDays(start, 7)
    ) {
      const end = addDays(start, 6);
      if (first > start) continue;
      const obligations = allPeriods.filter(
        (p) => p.fecha >= start && p.fin <= end,
      );
      if (obligations.length && obligations.every((p) => p.completado)) {
        perfect = true;
        break;
      }
    }
  return {
    totalCompletados: total,
    mejorRacha: bestStreak,
    mejorRachaDiaria: bestDailyStreak,
    progreso: {
      primero: total,
      racha7: bestDailyStreak,
      racha30: bestDailyStreak,
      total50: total,
      total100: total,
      perfecta: perfect ? 1 : 0,
    },
  };
}
