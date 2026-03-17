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

  // Regras simples de parser para demonstração (Pode ser substituído por um LLM real)
  let date: string | null = null;
  let time: string | null = null;
  let priority: "low" | "normal" | "high" = "normal";
  let recurrence: string | null = null;
  let location_type: "arrival" | "departure" | null = null;
  let location_place: string | null = null;

  const today = new Date();

  // Data
  if (text.includes("amanhã") || text.includes("amanha")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    date = tomorrow.toISOString().split("T")[0];
  } else if (text.includes("hoje") || text.includes("hj")) {
    date = today.toISOString().split("T")[0];
  } else {
    // Verifica se tem um dia específico (ex: "dia 17")
    const dayMatch = text.match(/dia\s(\d{1,2})/);
    if (dayMatch) {
      const targetDay = parseInt(dayMatch[1]);
      const targetDate = new Date(today);
      targetDate.setDate(targetDay);

      // Se o dia já passou neste mês, assume que é para o próximo mês
      if (targetDay < today.getDate()) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      date = targetDate.toISOString().split("T")[0];
    } else {
      // Se não tem nenhuma indicação de data, assume que é hoje
      date = today.toISOString().split("T")[0];
    }
  }

  // Horário (ex: 15h, 16h20, 16:20, 3 da tarde, em 15 min)
  const timeMatch =
    text.match(/(\d{1,2})h(\d{2})?/) ||
    text.match(/(\d{1,2}):(\d{2})/) ||
    text.match(/(\d{1,2})\s?da tarde/);

  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    if (text.includes("da tarde") && hour < 12) hour += 12;
    time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  } else {
    // Verificar formato "em XX min"
    const relativeMatch = text.match(/em\s(\d+)\s?min/);
    if (relativeMatch) {
      const minutesToAdd = parseInt(relativeMatch[1]);
      const futureDate = new Date(today.getTime() + minutesToAdd * 60000);
      date = futureDate.toISOString().split("T")[0];
      time = `${String(futureDate.getHours()).padStart(2, "0")}:${String(futureDate.getMinutes()).padStart(2, "0")}`;
    }
  }

  // Prioridade
  if (text.includes("urgente") || text.includes("importante")) {
    priority = "high";
  }

  // Recorrência
  if (text.includes("todo dia") || text.includes("diário")) {
    recurrence = "daily";
  } else if (text.includes("toda semana")) {
    recurrence = "weekly";
  }

  // Localização
  if (text.includes("quando chegar em")) {
    location_type = "arrival";
    location_place = extractPlace(text, "quando chegar em");
  } else if (text.includes("quando sair de")) {
    location_type = "departure";
    location_place = extractPlace(text, "quando sair de");
  }

  // Limpeza do título (remove palavras de comando)
  let title = msg
    .replace(
      /amanhã|amanha|hoje|hj|urgente|importante|todo dia|diário|toda semana/gi,
      "",
    )
    .replace(/dia\s\d{1,2}/gi, "")
    .replace(/em\s\d+\s?min/gi, "")
    .replace(/quando chegar em\s?\w+|quando sair de\s?\w+/gi, "")
    .replace(/\d{1,2}h(\d{2})?|\d{1,2}:\d{2}|\d{1,2}\s?da tarde/gi, "")
    .trim();

  // Decisão: Retornar tarefa ou pergunta
  if (!title) {
    return {
      type: "question",
      question: "O que exatamente você precisa fazer?",
    };
  }

  // Se a tarefa parece depender de tempo mas não tem horário (ex: tirar o lixo)
  const timeDependentWords = ["tirar", "levar", "reunião", "encontro", "ligar"];
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
      location_trigger: {
        type: location_type,
        place: location_place,
      },
      duration_minutes: null,
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
