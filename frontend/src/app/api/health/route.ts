import { NextResponse } from "next/server";
import { DETECTOR_BASE_URL, DETECTOR_TOKEN, DETECTOR_TOKEN_HEADER } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const headers: Record<string, string> = {};
    if (DETECTOR_TOKEN) headers[DETECTOR_TOKEN_HEADER] = DETECTOR_TOKEN;

    const res = await fetch(`${DETECTOR_BASE_URL}/health`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: "unreachable" }, { status: 200 });
  }
}
