import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Lógica de interpretação baseada nas regras fornecidas
    const response = interpretTaskMessage(message);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AI API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

function interpretTaskMessage(msg: string) {
  const text = msg.toLowerCase();

  let date: string | null = null;
  let time: string | null = null;
  let priority: "low" | "normal" | "high" = "normal";
  let recurrence: "once" | "daily" | "weekly" | "monthly" = "once";
  let duration_minutes: number | null = null;

  const today = new Date();

  // 1. Prioridade (Urgente/Importante)
  if (text.includes("urgente") || text.includes("prioridade alta")) {
    priority = "high";
  } else if (text.includes("importante")) {
    priority = "high";
  }

  // 2. Recorrência
  if (
    text.includes("todo dia") ||
    text.includes("todos os dias") ||
    text.includes("diário")
  ) {
    recurrence = "daily";
  } else if (
    text.includes("toda semana") ||
    text.includes("toda segunda") ||
    text.includes("toda terça") ||
    text.includes("toda quarta") ||
    text.includes("toda quinta") ||
    text.includes("toda sexta") ||
    text.includes("todo sábado") ||
    text.includes("todo domingo")
  ) {
    recurrence = "weekly";
  } else if (text.includes("todo mês") || text.includes("todos os meses")) {
    recurrence = "monthly";
  }

  // 3. Tempo Relativo (em 30 min, daqui a 2 horas)
  const relativeMinMatch = text.match(
    /(?:em|daqui a)\s(\d+)\s?(?:minutos|min|m)/,
  );
  const relativeHourMatch = text.match(
    /(?:em|daqui a)\s(\d+)\s?(?:horas|hora|h)/,
  );

  if (relativeMinMatch) {
    const minutesToAdd = parseInt(relativeMinMatch[1]);
    const futureDate = new Date(today.getTime() + minutesToAdd * 60000);
    date = futureDate.toISOString().split("T")[0];
    time = `${String(futureDate.getHours()).padStart(2, "0")}:${String(futureDate.getMinutes()).padStart(2, "0")}`;
  } else if (relativeHourMatch) {
    const hoursToAdd = parseInt(relativeHourMatch[1]);
    const futureDate = new Date(today.getTime() + hoursToAdd * 3600000);
    date = futureDate.toISOString().split("T")[0];
    time = `${String(futureDate.getHours()).padStart(2, "0")}:${String(futureDate.getMinutes()).padStart(2, "0")}`;
  }

  // 4. Datas Humanas (amanhã, sexta, dia 20)
  if (!date) {
    if (text.includes("amanhã") || text.includes("amanha")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      date = tomorrow.toISOString().split("T")[0];
    } else if (text.includes("hoje") || text.includes("hj")) {
      date = today.toISOString().split("T")[0];
    } else {
      // Dias da semana
      const daysOfWeek: Record<string, number> = {
        domingo: 0,
        segunda: 1,
        terça: 2,
        quarta: 3,
        quinta: 4,
        sexta: 5,
        sábado: 6,
      };
      for (const day in daysOfWeek) {
        if (text.includes(day)) {
          const targetDay = daysOfWeek[day];
          const currentDay = today.getDay();
          let daysUntil = (targetDay - currentDay + 7) % 7;
          if (daysUntil === 0) daysUntil = 7; // Próxima semana
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + daysUntil);
          date = nextDate.toISOString().split("T")[0];
          break;
        }
      }

      // Dia específico (ex: dia 20)
      const dayMatch = text.match(/dia\s(\d{1,2})/);
      if (!date && dayMatch) {
        const targetDay = parseInt(dayMatch[1]);
        const targetDate = new Date(today);
        targetDate.setDate(targetDay);
        if (targetDay < today.getDate()) {
          targetDate.setMonth(targetDate.getMonth() + 1);
        }
        date = targetDate.toISOString().split("T")[0];
      }
    }
  }

  // Se nada foi definido, assume hoje
  if (!date) date = today.toISOString().split("T")[0];

  // 5. Horário Natural (às 3 da tarde, 7 da manhã, 14:30, 20h)
  if (!time) {
    const timeMatch =
      text.match(/(\d{1,2})h(\d{2})?/) ||
      text.match(/(\d{1,2}):(\d{2})/) ||
      text.match(/(\d{1,2})\s?(?:da manhã|da tarde|da noite)/);

    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

      if (text.includes("da tarde") && hour < 12) hour += 12;
      if (text.includes("da noite") && hour < 12) hour += 12;
      if (text.includes("da manhã") && hour === 12) hour = 0;

      time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  // 6. Duração (por 2 horas)
  const durationMatch = text.match(
    /por\s(\d+)\s?(?:horas|hora|h|minutos|min|m)/,
  );
  if (durationMatch) {
    const val = parseInt(durationMatch[1]);
    if (text.includes("hora") || text.includes(" h")) {
      duration_minutes = val * 60;
    } else {
      duration_minutes = val;
    }
  }

  // 7. Limpeza do Título
  let title = msg
    .replace(
      /(?:preciso|não esquecer de|lembrar de|tenho que|ir no|ir na|mandar|resolver isso)\s/gi,
      "",
    )
    .replace(
      /(?:amanhã|amanha|hoje|hj|urgente|importante|todo dia|diário|toda semana|todos os dias|toda segunda|toda terça|toda quarta|toda quinta|toda sexta|todo sábado|todo domingo|todo mês|todos os meses|prioridade alta)/gi,
      "",
    )
    .replace(/dia\s\d{1,2}/gi, "")
    .replace(/(?:em|daqui a)\s\d+\s?(?:minutos|min|m|horas|hora|h)/gi, "")
    .replace(/por\s\d+\s?(?:horas|hora|h|minutos|min|m)/gi, "")
    .replace(
      /\d{1,2}h(\d{2})?|\d{1,2}:\d{2}|\d{1,2}\s?(?:da manhã|da tarde|da noite|da tarde)/gi,
      "",
    )
    .replace(/às\s|as\s/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Primeira letra maiúscula
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  // Decisão: Retornar tarefa ou pergunta
  if (!title || title.length < 2) {
    return {
      type: "question",
      question: "O que exatamente você precisa fazer?",
    };
  }

  // Perguntar horário se for tarefa dependente de tempo mas sem hora
  const timeDependentWords = [
    "tirar",
    "levar",
    "reunião",
    "encontro",
    "ligar",
    "aula",
    "consulta",
    "dentista",
    "academia",
    "estudar",
  ];
  const isTimeDependent = timeDependentWords.some((w) =>
    title.toLowerCase().includes(w),
  );

  if (isTimeDependent && !time && !text.includes("sem hora")) {
    return {
      type: "question",
      question: "Que horário você quer fazer isso?",
    };
  }

  return {
    type: "task",
    data: {
      title,
      date,
      time,
      priority,
      recurrence,
      location_trigger: { type: null, place: null },
      duration_minutes,
    },
  };
}

function extractPlace(text: string, phrase: string) {
  const parts = text.split(phrase);
  if (parts.length > 1) {
    return parts[1].trim().split(" ")[0];
  }
  return null;
}
