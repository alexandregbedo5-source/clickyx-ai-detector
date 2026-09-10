import { NextResponse } from "next/server";
import {
  DETECTOR_BASE_URL,
  DETECTOR_TOKEN,
  DETECTOR_TOKEN_HEADER,
  MAX_IMAGE_BYTES,
} from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Reçoit l'image en binaire brut, la convertit en base64 côté serveur, puis
 * interroge le moteur Python. Envoyer du binaire plutôt que du base64 depuis le
 * navigateur évite l'inflation de 33 % et laisse passer des images plus grandes.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";

  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Corps de requête illisible." } },
      { status: 400 },
    );
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json(
      { error: { code: "missing_image", message: "Aucune image fournie." } },
      { status: 400 },
    );
  }

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "image_too_large",
          message: `Image trop volumineuse (${(bytes.byteLength / 1e6).toFixed(1)} Mo). Maximum ${(MAX_IMAGE_BYTES / 1e6).toFixed(0)} Mo.`,
        },
      },
      { status: 413 },
    );
  }

  const mime = contentType.split(";")[0].trim() || "image/png";
  const base64 = Buffer.from(bytes).toString("base64");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DETECTOR_TOKEN) headers[DETECTOR_TOKEN_HEADER] = DETECTOR_TOKEN;

  try {
    const res = await fetch(`${DETECTOR_BASE_URL}/detect-ai-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        image_base64: `data:${mime};base64,${base64}`,
        include_details: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "detector_unreachable",
          message:
            "Le moteur de détection est injoignable. En local, lancez-le avec : python -m ai_detector serve",
        },
      },
      { status: 503 },
    );
  }
}
