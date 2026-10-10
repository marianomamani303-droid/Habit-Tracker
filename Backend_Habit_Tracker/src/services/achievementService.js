import { pool } from "../config/db.js";
import { loadHabits } from "../repositories/habitRepository.js";
import { today } from "../utils/habitCalendar.js";
import {
  achievementCatalog,
  achievementEvidence,
} from "../utils/achievementRules.js";

export async function achievements(userId, timeZone, habits) {
  const evidence = achievementEvidence(
    habits ?? (await loadHabits(userId)),
    today(timeZone),
  );
  for (const achievement of achievementCatalog) {
    if (evidence.progreso[achievement.codigo] >= achievement.objetivo)
      await pool.execute(
        "INSERT IGNORE INTO usuario_logros (usuario_id,codigo) VALUES (?,?)",
        [userId, achievement.codigo],
      );
  }
  const [rows] = await pool.execute(
    "SELECT codigo,desbloqueado_en,visto FROM usuario_logros WHERE usuario_id=?",
    [userId],
  );
  return {
    resumen: evidence,
    logros: achievementCatalog.map((achievement) => {
      const unlock = rows.find((row) => row.codigo === achievement.codigo);
      return {
        ...achievement,
        progreso: Math.min(
          achievement.objetivo,
          evidence.progreso[achievement.codigo],
        ),
        desbloqueado_en: unlock?.desbloqueado_en ?? null,
        nuevo: !!unlock && !unlock.visto,
      };
    }),
  };
}

export async function acknowledgeAchievements(userId) {
  await pool.execute(
    "UPDATE usuario_logros SET visto=TRUE WHERE usuario_id=?",
    [userId],
  );
}
