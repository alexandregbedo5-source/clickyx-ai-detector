export interface ModelCard {
  name: string;
  version: string;
  trained: boolean;
  arch: string;
  parameters: number;
  size_bytes: number;
  sha256: string;
  opset: number;
  created_at: string;
  input?: { shape?: (string | number)[]; normalization?: { mean: number[]; std: number[] } };
  output?: { semantics?: string };
  training?: {
    data?: string;
    epoch?: number;
    val_metrics?: Record<string, number | Record<string, number>>;
    config?: Record<string, unknown>;
  };
}

export interface CalibrationReport {
  n: number;
  n_real: number;
  n_ai: number;
  generators: Record<string, number>;
  module_auc_oof: { fft_score: number; noise_score: number };
  cnn_auc: number;
  fusion_full_oof: Record<string, number | Record<string, number>>;
  fusion_handcrafted_oof: Record<string, number | Record<string, number>>;
}

export interface ModelData {
  card: ModelCard | null;
  calibration: CalibrationReport | null;
}
