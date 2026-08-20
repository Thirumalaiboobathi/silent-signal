import { NextRequest, NextResponse } from "next/server";
import { ingestToolCall, listToolCalls } from "@/lib/tool-calls";

export async function GET() {
  try {
    const calls = await listToolCalls();
    return NextResponse.json({ calls });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list tool calls" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { toolName, rawPayload, sessionId } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof toolName !== "string" || toolName.trim() === "") {
    return NextResponse.json({ error: "toolName is required" }, { status: 400 });
  }
  if (typeof rawPayload !== "string" || rawPayload.trim() === "") {
    return NextResponse.json(
      { error: "rawPayload is required" },
      { status: 400 }
    );
  }
  if (typeof sessionId !== "string" || sessionId.trim() === "") {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await ingestToolCall({ toolName, rawPayload, sessionId });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to classify and store tool call",
      },
      { status: 500 }
    );
  }
}
