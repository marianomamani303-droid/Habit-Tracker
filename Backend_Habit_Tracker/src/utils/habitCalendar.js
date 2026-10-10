// Calendar dates are independent of the machine's local timezone.
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function today(timeZone = TIME_ZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((name) => parts.find((part) => part.type === name).value)
    .join("-");
}

export function addDays(date, amount) {
  const calendarDate = new Date(`${date}T12:00:00Z`);
  calendarDate.setUTCDate(calendarDate.getUTCDate() + amount);
  return calendarDate.toISOString().slice(0, 10);
}

export function weekday(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
}

export function monday(date) {
  return addDays(date, 1 - weekday(date));
}

export function dates(from, to) {
  const result = [];
  for (let date = from; date <= to; date = addDays(date, 1)) result.push(date);
  return result;
}

export function versionAt(habit, date) {
  return habit.versiones.filter((version) => version.desde <= date).at(-1);
}

export function scheduled(version, date) {
  if (!version || version.archivado || date < version.inicio) return false;
  const interval = Number(version.intervalo_dias ?? 1);
  if (interval > 1)
    return (
      Math.round(
        (new Date(`${date}T12:00:00Z`) -
          new Date(`${version.inicio}T12:00:00Z`)) /
          86400000,
      ) %
        interval ===
      0
    );
  return (
    version.frecuencia !== "dias" ||
    version.dias.split(",").map(Number).includes(weekday(date))
  );
}

export function daily(habit, date) {
  const version = versionAt(habit, date);
  const record = habit.recordsByDate
    ? habit.recordsByDate.get(date)
    : habit.registros.find((record) => record.fecha === date);
  const quantity = Number(record?.cantidad ?? 0);
  const target = Number(version?.objetivo ?? 0);
  const tasks = subtasksAt(habit, date);
  const done = tasks.filter((task) => task.completado).length;
  return {
    fecha: date,
    programado: scheduled(version, date),
    cantidad: quantity,
    objetivo: target,
    completado:
      !!version &&
      quantity >= target &&
      (!tasks.length || done === tasks.length),
    subtareas: tasks,
    subtareasCompletadas: done,
    progreso: tasks.length
      ? Math.round((done / tasks.length) * 100)
      : target
        ? Math.min(100, Math.round((quantity / target) * 100))
        : 0,
    unidad: version?.unidad ?? "",
    frecuencia: version?.frecuencia,
  };
}

export function subtasksAt(habit, date) {
  return (habit.subtareas ?? [])
    .filter((task) => task.desde <= date && (!task.hasta || date < task.hasta))
    .map((task) => ({
      id: task.id,
      nombre: task.nombre,
      completado: !!(habit.subtareaRegistros ?? []).find(
        (row) => row.subtarea_id === task.id && row.fecha === date,
      )?.completado,
    }));
}

export function weeklyPeriod(
  habit,
  date,
  cutoff,
  version = versionAt(habit, date),
) {
  const start = monday(date);
  const end = addDays(start, 6);
  const eligibleDays = dates(start, end).filter((day) =>
    scheduled(versionAt(habit, day), day),
  );
  // Future records never count, even when calculating metrics for a historical cutoff.
  const completed = eligibleDays.filter(
    (day) => day <= cutoff && daily(habit, day).completado,
  ).length;
  const target = Math.min(Number(version.dias_semana), eligibleDays.length);
  return {
    fecha: start,
    frecuencia: "semanal",
    fin: end,
    completado: completed >= target,
    actual: end >= cutoff,
    realizado: completed,
    objetivo: target,
  };
}

export function periods(habit, cutoff) {
  habit = {
    ...habit,
    recordsByDate: new Map(
      habit.registros.map((record) => [record.fecha, record]),
    ),
  };
  const firstDate = habit.versiones[0]?.desde;
  if (!firstDate || firstDate > cutoff) return [];
  const result = [];
  const includedWeeks = new Set();
  for (const date of dates(firstDate, cutoff)) {
    const version = versionAt(habit, date);
    if (!scheduled(version, date)) continue;
    if (version.frecuencia === "semanal") {
      const week = monday(date);
      if (includedWeeks.has(week)) continue;
      includedWeeks.add(week);
      result.push(weeklyPeriod(habit, date, cutoff, version));
    } else {
      const completed = daily(habit, date).completado;
      result.push({
        frecuencia: version.frecuencia,
        fecha: date,
        fin: date,
        completado: completed,
        actual: date === cutoff,
        realizado: completed ? 1 : 0,
        objetivo: 1,
      });
    }
  }
  return result;
}

export function metrics(habit, cutoff) {
  const habitPeriods = periods(habit, cutoff);
  let currentStreak = 0;
  let bestStreak = 0;
  for (const period of habitPeriods) {
    if (period.completado) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else if (!period.actual) currentStreak = 0;
  }
  const evaluated = habitPeriods.filter(
    (period) => !period.actual || period.completado,
  );
  const completedCount = evaluated.filter((period) => period.completado).length;
  return {
    rachaActual: currentStreak,
    mejorRacha: bestStreak,
    periodosCompletados: habitPeriods.filter((period) => period.completado)
      .length,
    porcentaje: evaluated.length
      ? Math.round((completedCount / evaluated.length) * 100)
      : null,
    periodos: habitPeriods.slice(-60),
  };
}
