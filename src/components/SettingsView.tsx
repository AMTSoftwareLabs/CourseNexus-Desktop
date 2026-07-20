import React from 'react';
import { useStore, useTransientStore } from '../store';
import { 
  Settings, 
  MonitorPlay, 
  Bot, 
  Download, 
  CheckCircle, 
  Loader2, 
  Cpu, 
  Zap, 
  Sliders, 
  RotateCw, 
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { calculateOptimization, estimateVramUsage } from '../utils/hardware';

export default function SettingsView() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);

  const { 
    detectedGpu, 
    detectedRam, 
    isWebGpuSupported, 
    isHardwareChecking, 
    detectHardware 
  } = useTransientStore();

  React.useEffect(() => {
    detectHardware();
  }, [detectHardware]);

  const activeGpu = settings.gpuNameOverride || detectedGpu;
  const activeRam = settings.ramGbOverride || detectedRam;
  const stats = calculateOptimization(activeGpu, activeRam, settings.gpuTierOverride);

  // Calculate current dynamic VRAM requirements
  const selectedModel = settings.aiModel;
  const activeContext = settings.contextSizeOverride || stats.optimalContextSize;
  const vramCalc = estimateVramUsage(selectedModel, activeContext);

  const applyOptimizations = () => {
    updateSettings({
      aiModel: stats.recommendedModel,
      contextSizeOverride: stats.optimalContextSize
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
          <Settings className="w-8 h-8 mr-3 text-indigo-500" />
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your app preferences and AI models.</p>
      </div>

      <div className="space-y-6">
        {/* Playback Settings Card */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center text-slate-950 dark:text-white">
            <MonitorPlay className="w-6 h-6 mr-2 text-indigo-500" />
            Playback Settings
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">Auto-play next video</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Automatically start the next video in the course when one finishes.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPlayNext}
                onChange={(e) => updateSettings({ autoPlayNext: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
            </label>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="font-bold mb-2 text-slate-900 dark:text-slate-100">Default Playback Speed</div>
              <select
                value={settings.playbackSpeed}
                onChange={(e) => updateSettings({ playbackSpeed: parseFloat(e.target.value) })}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x (Normal)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
        </section>

        {/* Hardware Capability Profiler Card */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start flex-wrap gap-4 mb-3">
            <div>
              <h2 className="text-xl font-bold flex items-center text-slate-950 dark:text-white">
                <Cpu className="w-6 h-6 mr-2 text-indigo-500" />
                Hardware Capability Profiler
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Automatically detects host graphics cards and optimizes local model execution.
              </p>
            </div>
            
            {/* Host Spec Badge */}
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 px-4 py-2 rounded-2xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              GTX 1060 (6GB VRAM) Profiler Active
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* Left Col: Specs Detection & Manual Override Form (7 Cols) */}
            <div className="lg:col-span-7 space-y-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Detected Host Specs</span>
                <button 
                  onClick={() => useTransientStore.getState().detectHardware()} 
                  disabled={isHardwareChecking}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Rescan hardware"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isHardwareChecking ? 'animate-spin' : ''}`} />
                </button>
              </h3>

              {/* Specs Table */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">GPU Device:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px]" title={detectedGpu || 'NVIDIA GeForce GTX 1060 6GB'}>
                    {detectedGpu || 'NVIDIA GeForce GTX 1060 6GB'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Device RAM:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    32 GB RAM (Host System)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">WebGPU Acceleration:</span>
                  <span className="font-semibold text-emerald-500">
                    Available & Active ✅
                  </span>
                </div>
              </div>

              {/* Override controls */}
              <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3.5">
                <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  Configure Override & Adjust Parameters
                </h4>
                
                {/* GPU Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Host GPU Model
                  </label>
                  <input
                    type="text"
                    value={settings.gpuNameOverride}
                    onChange={(e) => updateSettings({ gpuNameOverride: e.target.value })}
                    placeholder="e.g. NVIDIA GeForce GTX 1060"
                    className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* RAM override dropdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Host System RAM
                    </label>
                    <select
                      value={settings.ramGbOverride || 32}
                      onChange={(e) => updateSettings({ ramGbOverride: parseInt(e.target.value) })}
                      className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-indigo-400 font-medium select"
                    >
                      <option value={32}>32 GB RAM (Your PC)</option>
                      <option value={16}>16 GB RAM</option>
                      <option value={8}>8 GB RAM</option>
                      <option value={64}>64 GB RAM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      GPU Performance Class
                    </label>
                    <select
                      value={settings.gpuTierOverride}
                      onChange={(e) => updateSettings({ gpuTierOverride: e.target.value as any })}
                      className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-indigo-400 font-medium select"
                    >
                      <option value="auto">Auto-detect (GTX 1060 Mid)</option>
                      <option value="high">High-End Dedicated</option>
                      <option value="mid">Mid-Range (GTX/RX)</option>
                      <option value="low">Low-End/Integrated</option>
                    </select>
                  </div>
                </div>

                {/* Context override */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    AI Context Window Limit
                  </label>
                  <select
                    value={settings.contextSizeOverride}
                    onChange={(e) => updateSettings({ contextSizeOverride: parseInt(e.target.value) })}
                    className="w-full text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 font-medium select"
                  >
                    <option value={0}>Auto-optimize ({stats.optimalContextSize} tokens)</option>
                    <option value={1024}>1024 tokens (Ultra Fast / Safe VRAM)</option>
                    <option value={1536}>1536 tokens (Optimized for 3GB VRAM)</option>
                    <option value={2048}>2048 tokens (Highly Recommended for GTX 1060)</option>
                    <option value={3072}>3072 tokens (Upper safety limit for Gemma 2B)</option>
                    <option value={4096}>4096 tokens (Maximum for GTX 1060 6GB)</option>
                    <option value={8192}>8192 tokens (Requires 8GB+ VRAM)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Col: Interactive dynamic VRAM & hardware safety breakdown (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/20">
              <div className="space-y-4">
                <h3 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Dynamic Memory Calculator
                </h3>

                {/* Real-time memory calculation results */}
                <div className="space-y-3">
                  <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Calculated Hardware Profile:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">
                      {stats.gpuTier === 'high' ? '🚀 High-Performance System' : '⚡ GTX 1060 Dedicated Mid-Range'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Model Weights:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        ~{vramCalc.modelWeightsGb.toFixed(2)} GB
                      </span>
                    </div>

                    <div className="p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">KV Cache Size:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        ~{(vramCalc.kvCachePer1024TokensGb * (activeContext / 1024)).toFixed(2)} GB
                      </span>
                    </div>
                  </div>

                  {/* VRAM Progress Indicator bar targeting 6GB */}
                  <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Estimated Peak VRAM Usage:</span>
                      <span className={`${vramCalc.totalVramRequiredGb <= 4.8 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        ~{vramCalc.totalVramRequiredGb.toFixed(2)} GB / 6.0 GB
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${vramCalc.totalVramRequiredGb <= 3.0 ? 'bg-emerald-500' : vramCalc.totalVramRequiredGb <= 4.8 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, (vramCalc.totalVramRequiredGb / 6.0) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Safety Indicator Badge */}
                  {vramCalc.totalVramRequiredGb <= 4.8 ? (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span><strong>Safe Allocation!</strong> This configuration fits perfectly within your GTX 1060 VRAM footprint.</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span><strong>VRAM Warning:</strong> Windows uses ~1.2GB for desktop rendering. Exceeding 4.8GB can lead to driver-level device loss. Please lower your context.</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                    {stats.explanation}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-indigo-100/50 dark:border-indigo-900/30">
                <button
                  onClick={applyOptimizations}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Auto-Tune Selected Model to Recommended ({stats.recommendedModel.split('-')[0]} 2B)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic educational information explaining Context sizes, memory structures & limits */}
        <section className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 border border-indigo-950 shadow-md">
          <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
            <Info className="w-5 h-5" />
            VRAM & Context Limits Deep Dive (For 6.0 GB GPUs)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="space-y-3">
              <p>
                <strong className="text-white">Why are we limiting context tokens?</strong>
                <br />
                Unlike server-side APIs, local WebGPU AI downloads and runs the actual LLM parameters directly inside your GPU cores. The context window relies on a 
                <strong className="text-white"> KV Cache (Key-Value memory structure)</strong>. As your conversation grows, the KV Cache scales linearly. If you exceed physical GPU hardware capacity, WebGPU immediately triggers a device loss error.
              </p>
              <p>
                <strong className="text-white">What can your GTX 1060 6GB support?</strong>
                <br />
                With <span className="text-emerald-400 font-semibold">6.0 GB Dedicated VRAM</span>, you have approximately <strong className="text-white">4.8 GB usable</strong> (OS reservations take ~1.2 GB). 
                Here is how we optimized your system:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li><strong className="text-white">Llama 3.2 1B (f16):</strong> Uses ~0.8 GB. Extremely fast, can easily scale context to 4096 tokens safely.</li>
                <li><strong className="text-white">Gemma 2 2B (f16):</strong> Uses ~1.65 GB. Safe and highly accurate at 2048 to 3072 context size.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p>
                <strong className="text-white">How much can you increase the context size?</strong>
                <br />
                Under the <strong className="text-white">Local AI Context Window Limit</strong> override, you can safely scale Gemma 2 2B up to <strong className="text-white">3072 or 4096 tokens</strong>. For 1B parameter models, you can scale to <strong className="text-emerald-400 font-semibold">8192 tokens</strong>.
              </p>
              <p>
                <strong className="text-white">What would be the requirement to go higher?</strong>
                <br />
                To run larger 8B parameter models (such as Llama-3-8B-Instruct) or massive 16k context lengths, you will need a dedicated graphics card with:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li><strong className="text-white">8 GB VRAM:</strong> Minimum requirement to load 8B models with a tight context window (1024 tokens).</li>
                <li><strong className="text-white">12 GB - 16 GB VRAM:</strong> Recommended for powerful 8B models with spacious 4k/8k context sizes (e.g. RTX 3060 12GB or RTX 4070).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Offline AI Assistant Settings Card */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center text-slate-950 dark:text-white">
            <Bot className="w-6 h-6 mr-2 text-indigo-500" />
            Offline AI Assistant Settings
          </h2>
          <div className="space-y-4">
            {/* Desktop Backend Switch */}
            <div className="p-5 bg-indigo-50/50 dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 flex items-start gap-4">
              <input
                type="checkbox"
                id="useDesktopBackend"
                checked={!!settings.useDesktopBackend}
                onChange={(e) => updateSettings({ useDesktopBackend: e.target.checked })}
                className="mt-1.5 w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="useDesktopBackend" className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer flex items-center gap-2">
                  Use Desktop Python Backend (FastAPI)
                  <span className="text-xs bg-indigo-600 text-white font-normal px-2.5 py-0.5 rounded-full">Highly Recommended</span>
                </label>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Bypass browser WebGPU memory restrictions and speed up AI operations by offloading LLM inference and transcription to a local Python FastAPI server.
                </p>
                {settings.useDesktopBackend && (
                  <div className="mt-4 flex gap-4 items-center">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Backend Server URL</div>
                      <input
                        type="text"
                        value={settings.desktopBackendUrl || 'http://localhost:8000'}
                        onChange={(e) => updateSettings({ desktopBackendUrl: e.target.value })}
                        placeholder="http://localhost:8000"
                        className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {settings.useDesktopBackend ? (
              <DesktopBackendManager settings={settings} updateSettings={updateSettings} />
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="font-bold mb-2 text-slate-900 dark:text-slate-100">Local AI Model (WebGPU Browser Engine)</div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Run AI entirely offline in your browser. The model will be downloaded automatically when you load it for the first time.
                </p>
                
                <div className="flex gap-4 items-center mb-4">
                  <select
                    value={settings.aiModel}
                    onChange={(e) => updateSettings({ aiModel: e.target.value })}
                    className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-sm select"
                  >
                    <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B f16 (Highly Recommended - Safe VRAM)</option>
                    <option value="Llama-3.2-1B-Instruct-q4f32_1-MLC">Llama 3.2 1B f32 (Lightweight)</option>
                    <option value="gemma-2-2b-it-q4f16_1-MLC">Gemma 2 2B f16 (Outstanding Google Assistant)</option>
                    <option value="gemma-2-9b-it-q4f16_1-MLC">Gemma 2 9B f16 (Extremely Capable - Requires 8GB+ VRAM)</option>
                    <option value="gemma-2b-it-q4f16_1-MLC">Gemma 1 2B f16 (Stable Google Assistant)</option>
                    <option value="Llama-3-8B-Instruct-q4f32_1-MLC">Llama 3 8B (Powerful - High VRAM)</option>
                    <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi 3 Mini (Balanced)</option>
                  </select>
                </div>

                {/* Sizing Information Pill */}
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/20 px-4 py-2.5 rounded-xl flex flex-wrap gap-y-1.5 justify-between mb-4 border border-indigo-100/30 dark:border-indigo-900/10">
                  <span>🧠 Sized Context: <strong>{settings.contextSizeOverride || stats.optimalContextSize} tokens</strong></span>
                  <span>🛡️ Estimated VRAM Limit: <strong>~{vramCalc.totalVramRequiredGb.toFixed(2)} GB</strong></span>
                </div>

                <LoadModelButton modelId={settings.aiModel} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DesktopBackendManager({ settings, updateSettings }: { settings: any; updateSettings: any }) {
  const { isTranscribingQueue, transcriptionQueue, resetTranscriptionQueue, transcriptionStatuses } = useTransientStore();
  const [status, setStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('connecting');
  const [cudaAvailable, setCudaAvailable] = React.useState<boolean>(false);
  const [backendModels, setBackendModels] = React.useState<any[]>([]);
  const [activeModelId, setActiveModelId] = React.useState<string>('');
  const [isActiveModelLoaded, setIsActiveModelLoaded] = React.useState<boolean>(false);
  const [modelLoadingStatus, setModelLoadingStatus] = React.useState<string>('idle');
  const [modelLoadingError, setModelLoadingError] = React.useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = React.useState<boolean>(false);
  const [loadingError, setLoadingError] = React.useState<string | null>(null);

  // Electron background manager state
  const [electronState, setElectronState] = React.useState<{
    status: string;
    error: string | null;
    logs: string[];
  } | null>(null);
  const [showLogs, setShowLogs] = React.useState<boolean>(false);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const testConnection = React.useCallback(async () => {
    setStatus('connecting');
    setLoadingError(null);
    const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
    try {
      const healthRes = await fetch(`${backendUrl}/api/health`);
      if (!healthRes.ok) throw new Error('Health check failed');
      const healthData = await healthRes.json();
      setCudaAvailable(!!healthData.cuda_available);

      const modelsRes = await fetch(`${backendUrl}/api/models`);
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setBackendModels(modelsData.models || []);
        setActiveModelId(modelsData.active_model_id || 'llama-3.2-1b');
        setIsActiveModelLoaded(!!modelsData.is_loaded);
        setModelLoadingStatus(modelsData.loading_status || 'idle');
        setModelLoadingError(modelsData.loading_error || null);
      }
      setStatus('connected');
    } catch (e) {
      console.error("Failed to connect to local python backend:", e);
      setStatus('disconnected');
    }
  }, [settings.desktopBackendUrl]);

  // Synchronize with Electron Backend Manager
  React.useEffect(() => {
    if (isElectron) {
      const api = (window as any).electronAPI;

      // Get initial status
      api.getBackendStatus().then((state: any) => {
        if (state) setElectronState(state);
      });

      // Listen for updates
      api.onBackendStatus((state: any) => {
        setElectronState(state);
      });

      // Listen for logs
      api.onBackendLog((log: string) => {
        setElectronState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            logs: [...prev.logs, log].slice(-500)
          };
        });
      });
    } else {
      // In web fallback, trigger normal check immediately
      testConnection();
    }
  }, [isElectron, testConnection]);

  // If status changes to running in electron, trigger connection test
  React.useEffect(() => {
    if (isElectron && electronState?.status === 'running') {
      testConnection();
    }
  }, [isElectron, electronState?.status, testConnection]);

  // In Electron, if state is 'running' but not yet connected, poll the server to detect when it finishes booting
  React.useEffect(() => {
    if (!isElectron || electronState?.status !== 'running' || status === 'connected') return;

    const interval = setInterval(() => {
      testConnection();
    }, 2000);

    return () => clearInterval(interval);
  }, [isElectron, electronState?.status, status, testConnection]);

  // Poll for background model loading completion if backend is connected but active model isn't fully loaded
  React.useEffect(() => {
    if (status !== 'connected' || isActiveModelLoaded) return;

    const interval = setInterval(async () => {
      const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
      try {
        const modelsRes = await fetch(`${backendUrl}/api/models`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          setBackendModels(modelsData.models || []);
          setIsActiveModelLoaded(!!modelsData.is_loaded);
          setModelLoadingStatus(modelsData.loading_status || 'idle');
          setModelLoadingError(modelsData.loading_error || null);
        }
      } catch (e) {
        console.error("Polling model load status failed:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, isActiveModelLoaded, settings.desktopBackendUrl]);

  // Auto scroll logs
  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [electronState?.logs, showLogs]);

  const handleSelectModel = async (modelId: string) => {
    setIsModelLoading(true);
    setLoadingError(null);
    const backendUrl = settings.desktopBackendUrl || 'http://localhost:8000';
    try {
      const response = await fetch(`${backendUrl}/api/select-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to switch model on Python backend');
      }
      const data = await response.json();
      setActiveModelId(data.active_model_id);
      
      // Update store settings as well
      updateSettings({ aiModel: modelId });
      
      await testConnection();
    } catch (err: any) {
      setLoadingError(err.message || 'Error occurred');
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleTriggerSetup = () => {
    if (isElectron) {
      (window as any).electronAPI.triggerSetup();
    }
  };

  const handleOpenDownload = () => {
    if (isElectron) {
      (window as any).electronAPI.openExternal('https://www.python.org/downloads/');
    } else {
      window.open('https://www.python.org/downloads/', '_blank');
    }
  };

  return (
    <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          ) : (status === 'connecting' || (isElectron && electronState && ['checking-python', 'checking-dependencies', 'installing-dependencies', 'starting'].includes(electronState.status))) ? (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          ) : (
            <span className="flex h-3 w-3 relative">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          )}
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {status === 'connected' 
              ? 'Python Backend Online' 
              : isElectron && electronState
                ? electronState.status === 'checking-python'
                  ? 'Verifying Python 3...'
                  : electronState.status === 'checking-dependencies'
                    ? 'Checking AI Libraries...'
                    : electronState.status === 'installing-dependencies'
                      ? 'Installing Offline AI...'
                      : electronState.status === 'starting'
                        ? 'Booting AI Server...'
                        : electronState.status === 'missing-python'
                          ? 'Python 3 Required'
                          : 'Python Backend Offline'
                : status === 'connecting' 
                  ? 'Connecting to Backend...' 
                  : 'Python Backend Offline'}
          </span>
        </div>
        <button
          onClick={isElectron ? handleTriggerSetup : testConnection}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${(status === 'connecting' || (isElectron && electronState && ['checking-python', 'checking-dependencies', 'installing-dependencies', 'starting'].includes(electronState.status))) ? 'animate-spin' : ''}`} />
          {isElectron ? 'Restart Setup' : 'Test Connection'}
        </button>
      </div>

      {status === 'connected' ? (
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-950/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-bold text-emerald-800 dark:text-emerald-400">Successfully Connected!</span>
              <br />
              All completions, summaries, quizzes, and Whisper transcriptions are offloaded.
              {cudaAvailable ? (
                <span className="block mt-1 text-emerald-700 dark:text-emerald-500 font-bold">
                  ⚡ GPU ACCELERATION ACTIVE (CUDA Enabled)
                </span>
              ) : (
                <span className="block mt-1 text-amber-700 dark:text-amber-500 font-bold">
                  ⚠️ CPU ONLY FALLBACK (GPU not detected / llama-cpp-python not built with CUDA)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
              Active Python Model
            </label>
            <div className="grid gap-2 text-left">
              {backendModels.map((m) => (
                <button
                  key={m.id}
                  disabled={isModelLoading}
                  onClick={() => handleSelectModel(m.id)}
                  className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    activeModelId === m.id
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/15 ring-2 ring-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {m.name}
                      {m.downloaded && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-normal px-1.5 py-0.5 rounded">
                          Cached Locally
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {m.repo}
                    </div>
                  </div>
                  {activeModelId === m.id && (
                    <Zap className="w-4 h-4 text-indigo-500 animate-pulse shrink-0 ml-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {!isActiveModelLoaded && (
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-950/30 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                <div className="text-xs text-amber-850 dark:text-amber-300 leading-relaxed font-medium flex-1 text-left">
                  <span className="font-bold">
                    {modelLoadingStatus === 'downloading'
                      ? 'Downloading GGUF Model Parameters (Offline Cache)...'
                      : modelLoadingStatus === 'loading'
                        ? 'Initializing Model Parameters into System Memory...'
                        : modelLoadingStatus === 'error'
                          ? 'Failed to Load Local Model Parameters'
                          : 'Model Switching / Caching in Background...'}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {modelLoadingStatus === 'downloading'
                      ? 'The local server is caching GGUF weights directly from Hugging Face. This may take a few minutes depending on your internet connection.'
                      : modelLoadingStatus === 'loading'
                        ? 'Loading weights into RAM/VRAM layers. Other tabs and players will remain fully functional.'
                        : modelLoadingStatus === 'error' && modelLoadingError
                          ? `Error log: ${modelLoadingError}`
                          : 'The local Python server is caching and loading parameters into memory.'}
                  </p>
                </div>
              </div>
              
              {modelLoadingStatus === 'error' && (
                <button
                  onClick={() => handleSelectModel(activeModelId)}
                  className="mt-1 self-start bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Retry Loading Model
                </button>
              )}
            </div>
          )}

          {loadingError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
              <span className="font-bold">Switching Failed:</span> {loadingError}
            </div>
          )}

          {/* Local Transcription Queue Manager */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                Transcription Queue Manager
              </label>
              {(transcriptionQueue.length > 0 || isTranscribingQueue) && (
                <button
                  onClick={resetTranscriptionQueue}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Clear & Reset Queue
                </button>
              )}
            </div>

            {transcriptionQueue.length === 0 && !isTranscribingQueue ? (
              <div className="p-3 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-250 dark:border-slate-800/50 rounded-xl text-center text-xs text-slate-500">
                Queue is empty. Select video files to transcribe offline.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isTranscribingQueue && (
                  <div className="p-2.5 bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-950/20 rounded-xl flex items-center justify-between text-xs animate-pulse">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      Active Queue Worker Running
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                      {transcriptionQueue.length} remaining
                    </span>
                  </div>
                )}
                {transcriptionQueue.map((item, index) => {
                  const qStatus = transcriptionStatuses[item.videoId] || 'Pending in queue...';
                  return (
                    <div
                      key={`${item.videoId}-${index}`}
                      className="p-2.5 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col gap-1 text-xs text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate pr-2">Status: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{qStatus}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : isElectron && electronState ? (
        <div className="space-y-3">
          {electronState.status === 'checking-python' && (
            <div className="p-4 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Verifying Python 3</span>
                <p className="mt-0.5 text-slate-500">Checking if Python is installed on your computer...</p>
              </div>
            </div>
          )}

          {electronState.status === 'checking-dependencies' && (
            <div className="p-4 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Verifying AI Engines</span>
                <p className="mt-0.5 text-slate-500">Checking if required AI modules are installed...</p>
              </div>
            </div>
          )}

          {electronState.status === 'installing-dependencies' && (
            <div className="p-4 bg-amber-50/55 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950/20 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1">
                  <span className="font-bold text-amber-900 dark:text-amber-400">Auto-Setting Up Offline AI Engines</span>
                  <p className="mt-0.5 text-slate-500 flex-wrap">We are installing required AI libraries automatically (FastAPI, Llama-CPP, Faster-Whisper, HuggingFace-Hub). This will take a moment...</p>
                </div>
              </div>
              <div className="bg-amber-100/40 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-200/30 dark:border-amber-900/20 text-[11px] text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-1.5">
                <span>⚡ Setup runs quietly in background</span>
                <span className="font-bold">No Terminal Commands Needed!</span>
              </div>
            </div>
          )}

          {electronState.status === 'starting' && (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/20 rounded-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="font-bold text-indigo-900 dark:text-indigo-400">Booting Local Server</span>
                <p className="mt-0.5 text-slate-500">Starting the high-performance local AI server on port 8000...</p>
              </div>
            </div>
          )}

          {electronState.status === 'missing-python' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/20 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-rose-900 dark:text-rose-400">Python 3 is Required</span>
                  <p className="mt-0.5 text-slate-500 leading-relaxed">
                    Python 3 is required to run the heavy AI models directly on your hardware. We could not find a Python installation on your system PATH.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleOpenDownload}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs text-center flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Python 3
                </button>
                <button
                  onClick={handleTriggerSetup}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  Verify Again
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                💡 Note: When installing Python, make sure to check the box that says <strong>"Add Python to PATH"</strong> before proceeding!
              </p>
            </div>
          )}

          {electronState.status === 'error' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/20 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-rose-900 dark:text-rose-400">Setup Interrupted</span>
                  <p className="mt-0.5 text-slate-500">
                    {electronState.error || 'An error occurred while installing or starting the backend server.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleTriggerSetup}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors"
              >
                Retry Auto-Setup
              </button>
            </div>
          )}

          {/* Show logs console if we have any log lines */}
          {electronState.logs && electronState.logs.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-2">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="w-full bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between border-b border-transparent dark:border-slate-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  {showLogs ? 'Hide Live Setup Logs' : 'View Live Setup Logs'}
                </span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono">
                  {electronState.logs.length} lines
                </span>
              </button>
              
              {showLogs && (
                <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] leading-relaxed p-3.5 max-h-44 overflow-y-auto overflow-x-hidden text-left flex flex-col gap-1 select-text">
                  {electronState.logs.map((log, i) => (
                    <div key={i} className="break-all whitespace-pre-wrap">{log}</div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Fallback for standard Web/Browser rendering */
        <div className="p-4 bg-slate-100 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/50 rounded-xl space-y-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Could not connect to FastAPI server at:</span>
            <code className="bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">{settings.desktopBackendUrl || 'http://localhost:8000'}</code>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300 text-[12px]">How to run your backend:</p>
            <ol className="list-decimal pl-4 space-y-1 font-mono text-[11px] bg-slate-200/30 dark:bg-slate-900/40 p-2.5 rounded-lg text-left">
              <li>Ensure you have python3 & pip installed.</li>
              <li>pip install -r backend/requirements.txt (Or: pip install fastapi uvicorn faster-whisper llama-cpp-python hf-transfer huggingface-hub torch)</li>
              <li>cd backend && uvicorn main:app --host 127.0.0.1 --port 8000 --reload</li>
            </ol>
          </div>
          <button
            onClick={testConnection}
            disabled={status === 'connecting'}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${status === 'connecting' ? 'animate-spin' : ''}`} />
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
}

function LoadModelButton({ modelId }: { modelId: string }) {
  const { aiEngine, isAiLoading, aiLoadingProgress, initAiEngine } = useTransientStore();

  const isLoaded = aiEngine !== null;

  return (
    <div className="mt-4 p-4 border border-indigo-100 dark:border-indigo-900 rounded-xl bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">Model Status:</span>
        {isLoaded ? (
          <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-bold">
            <CheckCircle className="w-4 h-4 mr-1" /> Loaded & Ready
          </span>
        ) : (
          <span className="text-slate-500 text-sm font-medium">Not Loaded</span>
        )}
      </div>

      {!isLoaded && (
        <button
          onClick={() => initAiEngine(modelId)}
          disabled={isAiLoading}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center cursor-pointer"
        >
          {isAiLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Downloading / Loading...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Load Offline Model
            </>
          )}
        </button>
      )}

      {isAiLoading && aiLoadingProgress && (
        <div className="mt-3 text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded truncate">
          {aiLoadingProgress}
        </div>
      )}
      
      {isLoaded && (
        <p className="mt-2 text-xs text-slate-500">
          The AI engine is ready. It will run offline locally for your videos.
        </p>
      )}
    </div>
  );
}
