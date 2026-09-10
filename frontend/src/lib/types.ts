export interface DetectResponse {
  is_ai_generated: boolean;
  confidence: number;
  fft_score: number;
  noise_score: number;
  cnn_score: number;
  contract_version?: string;
  model_version?: string | null;
  warnings?: string[];
}

export interface HealthResponse {
  status: "ok" | "degraded" | "unreachable";
  service?: string;
  version?: string;
  contract_version?: string;
  model?: {
    loaded: boolean;
    trained: boolean;
    path?: string | null;
    arch?: string | null;
    version?: string | null;
    input_size?: number | null;
    providers?: string[];
    error?: string | null;
  };
  calibration_version?: string;
  fusion_mode?: "full" | "handcrafted";
}

export interface ApiError {
  error: { code: string; message: string };
}
