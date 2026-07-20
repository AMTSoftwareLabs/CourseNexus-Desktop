export interface HardwareStats {
  detectedGpu: string;
  detectedRam: number;
  isWebGpuSupported: boolean;
  gpuTier: 'low' | 'mid' | 'high';
  optimalContextSize: number;
  recommendedModel: string;
  targetVramEstimateGb: number;
  explanation: string;
}

export interface VramCalculation {
  modelWeightsGb: number;
  kvCachePer1024TokensGb: number;
  totalVramRequiredGb: number;
  isSafeFor6GbVram: boolean;
  maxRecommendedContext: number;
}

/**
 * Robustly detects host system specs (WebGPU, GPU info, and RAM estimates).
 */
export async function detectSystemHardware(): Promise<{
  detectedGpu: string;
  detectedRam: number;
  isWebGpuSupported: boolean;
}> {
  let detectedGpu = '';
  let isWebGpuSupported = false;
  let detectedRam = 8; // Default fallback

  // 1. Detect WebGPU and GPU description
  try {
    const navAny = navigator as any;
    if (navAny.gpu) {
      isWebGpuSupported = true;
      const adapter = await navAny.gpu.requestAdapter();
      if (adapter) {
        let info: any = null;
        if ('info' in adapter) {
          info = (adapter as any).info;
        } else if (typeof (adapter as any).requestAdapterInfo === 'function') {
          info = await (adapter as any).requestAdapterInfo();
        }
        if (info) {
          const parts = [
            info.description || '',
            info.device || '',
            info.vendor || ''
          ].filter(Boolean);
          detectedGpu = parts.join(' - ');
        }
      }
    }
  } catch (e) {
    console.error("Error retrieving WebGPU info:", e);
  }

  // 2. Detect System RAM (navigator.deviceMemory is capped at 8 on many browsers for anti-fingerprinting)
  try {
    if ((navigator as any).deviceMemory) {
      detectedRam = (navigator as any).deviceMemory;
    }
  } catch (e) {
    console.error("Error retrieving device memory:", e);
  }

  return {
    detectedGpu,
    detectedRam,
    isWebGpuSupported
  };
}

/**
 * Robustly computes VRAM profiles for Web-LLM models based on their parameter sizing and KV Cache scaling.
 */
export function estimateVramUsage(modelId: string, contextSize: number): VramCalculation {
  const model = modelId.toLowerCase();
  let modelWeightsGb = 0.8;
  let kvCachePer1024TokensGb = 0.08;

  if (model.includes('llama-3.2-1b')) {
    modelWeightsGb = model.includes('q4f32_1') ? 0.95 : 0.82;
    kvCachePer1024TokensGb = 0.08; // 1B parameters has extremely lightweight KV cache
  } else if (model.includes('gemma-2-2b') || model.includes('gemma-2b')) {
    modelWeightsGb = 1.65;
    kvCachePer1024TokensGb = 0.18; // Gemma attention heads require larger key-value dimension size
  } else if (model.includes('gemma-2-9b')) {
    modelWeightsGb = 5.35;
    kvCachePer1024TokensGb = 0.52; // 9B model size with GQA overhead in context limits
  } else if (model.includes('phi-3-mini')) {
    modelWeightsGb = 2.25;
    kvCachePer1024TokensGb = 0.28; // Phi-3 Mini GQA has larger model width 
  } else if (model.includes('llama-3-8b')) {
    modelWeightsGb = 4.85;
    kvCachePer1024TokensGb = 0.45; // 8B model size context overhead
  }

  const totalVramRequiredGb = modelWeightsGb + (kvCachePer1024TokensGb * (contextSize / 1024));
  
  // High-precision threshold check for standard 6.0 GB gaming cards like GTX 1060
  // Windows desktop environments reserve ~0.8 GB to 1.2 GB of VRAM for rendering, leaving ~4.8 GB usable.
  const isSafeFor6GbVram = totalVramRequiredGb < 4.8; 

  // Compute absolute maximum context window that can fit on a 6GB card (taking into account a 1.2GB OS overhead)
  const availableUsableVramGb = 4.8;
  const vramLeftForKv = availableUsableVramGb - modelWeightsGb;
  const maxTokens = Math.floor((vramLeftForKv / kvCachePer1024TokensGb) * 1024);
  const maxRecommendedContext = Math.max(1024, Math.floor(maxTokens / 512) * 512); // Round to neat block

  return {
    modelWeightsGb,
    kvCachePer1024TokensGb,
    totalVramRequiredGb,
    isSafeFor6GbVram,
    maxRecommendedContext
  };
}

/**
 * Calculates local AI optimization strategy based on WebGPU capabilities,
 * system RAM, and manual hardware overrides.
 */
export function calculateOptimization(
  gpuName: string,
  ramGb: number,
  gpuTierOverride: 'auto' | 'high' | 'mid' | 'low'
): HardwareStats {
  const cleanGpu = (gpuName || '').toLowerCase();
  
  // 1. Determine GPU Tier
  let gpuTier: 'low' | 'mid' | 'high' = 'mid';
  
  if (gpuTierOverride && gpuTierOverride !== 'auto') {
    gpuTier = gpuTierOverride;
  } else {
    // Auto-detect based on GPU name keywords
    if (!gpuName) {
      gpuTier = 'low'; // Safest default if WebGPU info is not available or blocked
    } else if (
      cleanGpu.includes('rtx') || 
      cleanGpu.includes('rx 67') || 
      cleanGpu.includes('rx 68') || 
      cleanGpu.includes('rx 69') || 
      cleanGpu.includes('rx 7') || 
      cleanGpu.includes('pro max') || 
      cleanGpu.includes('pro ultra') ||
      cleanGpu.includes('tesla') ||
      cleanGpu.includes('a100') ||
      cleanGpu.includes('quadro') ||
      cleanGpu.includes('4090') ||
      cleanGpu.includes('4080') ||
      cleanGpu.includes('4070') ||
      cleanGpu.includes('3090') ||
      cleanGpu.includes('3080') ||
      cleanGpu.includes('3070')
    ) {
      gpuTier = 'high';
    } else if (
      cleanGpu.includes('1060') ||
      cleanGpu.includes('gtx') || 
      cleanGpu.includes('rx 5') || 
      cleanGpu.includes('rx 6') || 
      cleanGpu.includes('vega') || 
      cleanGpu.includes('intel arc') || 
      cleanGpu.includes('apple m') || 
      cleanGpu.includes('radeon') ||
      cleanGpu.includes('geforce')
    ) {
      gpuTier = 'mid';
    } else if (
      cleanGpu.includes('intel') || 
      cleanGpu.includes('uhd') || 
      cleanGpu.includes('hd graphics') || 
      cleanGpu.includes('iris') || 
      cleanGpu.includes('adreno') || 
      cleanGpu.includes('mali') || 
      cleanGpu.includes('g31') || 
      cleanGpu.includes('g52') || 
      cleanGpu.includes('mobile') ||
      cleanGpu.includes('software') ||
      cleanGpu.includes('basic render')
    ) {
      gpuTier = 'low';
    }
  }

  // 2. Adjust optimization options based on system RAM and GPU tier
  let recommendedModel = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
  let optimalContextSize = 1536;
  let targetVramEstimateGb = 1.0;
  let explanation = '';

  const isWebGpuSupported = !!gpuName;

  if (gpuTier === 'high' && ramGb >= 16) {
    recommendedModel = 'gemma-2-2b-it-q4f16_1-MLC';
    optimalContextSize = 4096;
    targetVramEstimateGb = 2.4;
    explanation = 'Excellent system hardware detected. Your system is configured to support higher tier LLMs like Gemma 2 2B with maximum context windows and full f16 speed acceleration.';
  } else if (gpuTier === 'mid' && ramGb >= 16) {
    // Perfect match for a GTX 1060 (6GB VRAM) and 32GB RAM!
    recommendedModel = 'gemma-2-2b-it-q4f16_1-MLC';
    optimalContextSize = 2048;
    targetVramEstimateGb = 2.0;
    explanation = `Outstanding setup! Your dedicated GPU (GTX 1060 class with 6.0 GB VRAM) combined with ${ramGb}GB RAM allows you to easily run Gemma 2 2B f16. We set a safe 2048 context window baseline (~2.0 GB VRAM peak memory footprint) leaving plenty of room for your OS and desktop display requirements.`;
  } else {
    // Low performance profile / Integrated GPU / Low RAM
    recommendedModel = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    optimalContextSize = 1024;
    targetVramEstimateGb = 0.8;
    explanation = 'Integrated GPU or low memory host detected. To guarantee rock-solid stability and zero WebGPU crashes, we capped the local model context window to 1024 and recommended the lightweight Llama 3.2 1B f16 model.';
  }

  return {
    detectedGpu: gpuName || 'Not Detected / WebGPU Inactive',
    detectedRam: ramGb,
    isWebGpuSupported,
    gpuTier,
    optimalContextSize,
    recommendedModel,
    targetVramEstimateGb,
    explanation,
  };
}
