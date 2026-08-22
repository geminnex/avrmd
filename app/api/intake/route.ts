import { NextResponse } from "next/server";
import { intakeLabels, validateIntake } from "@/lib/workflows";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const result = validateIntake(body);

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Please correct the highlighted request fields.",
        issues: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: crypto.randomUUID(),
    requestType: intakeLabels[result.data.type],
    status: "validated_preview",
    message:
      "The request passed AVRMD validation. It was not stored, sent, or published because persistent services are not connected yet.",
  });
}
