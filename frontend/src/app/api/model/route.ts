import { NextResponse } from "next/server";
import { DETECTOR_BASE_URL, DETECTOR_TOKEN, DETECTOR_TOKEN_HEADER } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers: Record<string, string> = {};
  if (DETECTOR_TOKEN) headers[DETECTOR_TOKEN_HEADER] = DETECTOR_TOKEN;

  try {
    const res = await fetch(`${DETECTOR_BASE_URL}/model-info`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("upstream");
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ card: null, calibration: null }, { status: 200 });
  }
}
