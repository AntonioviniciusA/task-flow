import { db } from "./db";
import { nanoid } from "nanoid";

export const POINTS_PER_PRIORITY = {
  low: 10,
  medium: 25,
  high: 50,
};

/**
 * Adiciona pontos ao usuário e registra no log.
 * Também verifica se o usuário subiu de nível.
 */
export async function addPoints(
  userId: string,
  points: number,
  reason: string,
  taskId?: string
) {
  try {
    // 1. Obter pontos atuais do usuário
    const userResult = await db.execute({
      sql: "SELECT points, level FROM users WHERE id = ?",
      args: [userId],
    });

    if (userResult.rows.length === 0) return null;

    const currentPoints = Number(userResult.rows[0].points || 0);
    const currentLevel = Number(userResult.rows[0].level || 1);
    
    const newPoints = currentPoints + points;
    
    // 2. Calcular novo nível (ex: cada 1000 pontos sobe um nível)
    const newLevel = Math.floor(newPoints / 1000) + 1;

    // 3. Executar atualizações no banco em lote
    await db.batch([
      {
        sql: "UPDATE users SET points = ?, level = ?, updated_at = ? WHERE id = ?",
        args: [newPoints, newLevel, new Date().toISOString(), userId],
      },
      {
        sql: "INSERT INTO points_log (id, user_id, task_id, points, reason) VALUES (?, ?, ?, ?, ?)",
        args: [nanoid(), userId, taskId || null, points, reason],
      },
    ]);

    return {
      pointsAdded: points,
      totalPoints: newPoints,
      levelUp: newLevel > currentLevel,
      newLevel,
    };
  } catch (error) {
    console.error("Error adding points:", error);
    throw error;
  }
}

/**
 * Calcula o progresso atual do nível (0-100)
 */
export function calculateLevelProgress(points: number): number {
  return (points % 1000) / 10;
}
