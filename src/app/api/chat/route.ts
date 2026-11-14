import { NextResponse } from "next/server";
import { answer, type ChatMessage } from "@/lib/chat";

/* never show raw internals (bundler names, stack text) in the chat */
const friendly = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (/fetch failed|ECONNREFUSED|Careem MCP/i.test(message)) return "I can't reach Careem right now. Is the Careem MCP sandbox running on port 8787?";
  return "Something went wrong on my side. Please try again in a moment.";
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw: unknown[] = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
    const messages: ChatMessage[] = raw
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m === "object" &&
          ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
          typeof (m as ChatMessage).content === "string" &&
          (m as ChatMessage).content.trim().length > 0,
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    // the model APIs need the conversation to start with, and end on, a user turn
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== "user")
      return NextResponse.json({ error: "Ask me something about food." }, { status: 400 });
    return NextResponse.json(await answer(messages));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: friendly(error) }, { status: 500 });
  }
}
