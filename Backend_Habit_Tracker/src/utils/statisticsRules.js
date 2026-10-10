import { addDays, dates, monday, periods } from "./habitCalendar.js";
import { dateValue, invalid } from "./habitValidation.js";

export function statisticsRange(query, cutoff) {
  const period = query?.periodo ?? "mes";
  if (!["semana", "mes", "ano", "rango"].includes(period))
    throw invalid("Período inválido.");
  const anchor = dateValue(query?.fecha ?? cutoff);
  let from, to;
  if (period === "semana") {
    from = monday(anchor);
    to = addDays(from, 6);
  }
  if (period === "mes") {
    from = anchor.slice(0, 7) + "-01";
    const next = new Date(`${from}T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    to = addDays(next.toISOString().slice(0, 10), -1);
  }
  if (period === "ano") {
    from = anchor.slice(0, 4) + "-01-01";
    to = anchor.slice(0, 4) + "-12-31";
  }
  if (period === "rango") {
    from = dateValue(query.desde);
    to = dateValue(query.hasta);
  }
  if (from > to || dates(from, to).length > 366)
    throw invalid("Elegí un rango de hasta 366 días.");
  return { periodo: period, desde: from, hasta: to };
}

export function periodStatistics(habits, range, cutoff) {
  // Full periods, never the 60-period display slice. Open obligations are included
  // in the denominator, while future obligations are excluded.
  const all = habits.flatMap((habit) => periods(habit, cutoff));
  const eligible = all.filter(
    (p) => p.fin >= range.desde && p.fin <= range.hasta && p.fecha <= cutoff,
  );
  const buckets =
    range.periodo === "ano"
      ? Array.from({ length: 12 }, (_, index) => ({
          fecha: `${range.desde.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`,
          label: new Intl.DateTimeFormat("es-AR", {
            month: "short",
            timeZone: "UTC",
          }).format(
            new Date(Date.UTC(Number(range.desde.slice(0, 4)), index, 1)),
          ),
        }))
      : dates(range.desde, range.hasta).map((fecha) => ({
          fecha,
          label: fecha.slice(8),
        }));
  const evolution = buckets.map((bucket) => {
    const obligations = eligible.filter((p) =>
      range.periodo === "ano"
        ? p.fin.startsWith(bucket.fecha)
        : p.fin === bucket.fecha,
    );
    const completed = obligations.filter((p) => p.completado).length;
    return {
      ...bucket,
      total: obligations.length,
      completados: completed,
      porcentaje: obligations.length
        ? Math.round((completed / obligations.length) * 100)
        : null,
    };
  });
  const completed = eligible.filter((p) => p.completado).length;
  return {
    serie: evolution,
    resumenPeriodo: {
      programados: eligible.length,
      completados: completed,
      porcentaje: eligible.length
        ? Math.round((completed / eligible.length) * 100)
        : null,
    },
  };
}
