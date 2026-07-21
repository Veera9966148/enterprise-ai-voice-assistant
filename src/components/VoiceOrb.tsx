import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Volume2, Loader2 } from "lucide-react";

interface VoiceOrbProps {
  state: "idle" | "listening" | "thinking" | "speaking";
  waveColor: string;
  accentColor: string;
  onMicError?: (errorMsg: string) => void;
}

export default function VoiceOrb({
  state,
  waveColor,
  accentColor,
  onMicError,
}: VoiceOrbProps) {
  const [micLevel, setMicLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Simulated speaking wave offset
  const [speakPhase, setSpeakPhase] = useState<number>(0);

  // Set up microphone capture when state is 'listening'
  useEffect(() => {
    if (state !== "listening") {
      cleanupAudio();
      setMicLevel(0);
      return;
    }

    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Create Web Audio API graph
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function updateVolume() {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average amplitude
          let total = 0;
          for (let i = 0; i < bufferLength; i++) {
            total += dataArray[i];
          }
          const average = total / bufferLength;
          // Scale it to a 0-1 range
          const level = Math.min(average / 128, 1);
          setMicLevel(level);

          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }

        updateVolume();
      } catch (err: any) {
        console.error("Microphone access error:", err);
        const userFriendlyMsg =
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Microphone access was denied. Please allow mic permissions in your browser or type instead."
            : "Could not access microphone. Please check your system settings or input devices.";
        if (onMicError) {
          onMicError(userFriendlyMsg);
        }
        // Fallback to simulated volume pulse if microphone fails
        simulatePulse();
      }
    }

    function simulatePulse() {
      let phase = 0;
      function step() {
        if (state !== "listening") return;
        // Generate a natural, slightly random pulsing wave
        const simLevel = 0.15 + Math.sin(phase) * 0.1 + Math.sin(phase * 2.3) * 0.05 + Math.random() * 0.05;
        setMicLevel(Math.max(0, simLevel));
        phase += 0.15;
        animationFrameRef.current = requestAnimationFrame(step);
      }
      animationFrameRef.current = requestAnimationFrame(step);
    }

    initAudio();

    return () => {
      cleanupAudio();
    };
  }, [state, onMicError]);

  // Handle simulated speaking wave phase
  useEffect(() => {
    if (state !== "speaking") return;

    let id = setInterval(() => {
      setSpeakPhase((p) => (p + 0.12) % (Math.PI * 2));
    }, 16);

    return () => clearInterval(id);
  }, [state]);

  function cleanupAudio() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  }

  // Calculate dynamic scale factors based on state & mic input
  let scale = 1;
  let pulseBorder = "border-zinc-300 dark:border-zinc-700";
  let orbBg = "bg-zinc-100 dark:bg-zinc-800";

  if (state === "idle") {
    scale = 1;
  } else if (state === "listening") {
    // scale ranges from 1.05 to 1.4 based on voice volume
    scale = 1.05 + micLevel * 0.35;
    pulseBorder = `border-${accentColor}-400 dark:border-${accentColor}-600`;
  } else if (state === "thinking") {
    scale = 1.08;
    orbBg = "bg-zinc-200 dark:bg-zinc-700";
  } else if (state === "speaking") {
    // Dynamic simulated pulsing for speaking
    const voiceIntensity = 0.1 + Math.sin(speakPhase * 4) * 0.08 + Math.cos(speakPhase * 1.7) * 0.04;
    scale = 1.1 + voiceIntensity;
    pulseBorder = `border-${accentColor}-500/50 dark:border-${accentColor}-400/50`;
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-72 md:h-80 w-full select-none" id="voice-orb-container">
      {/* Decorative Outer Aura / Wave Layer */}
      <div className="absolute inset-0 flex items-center justify-center overflow-visible pointer-events-none">
        <AnimatePresence>
          {state === "listening" && (
            <>
              {/* Voice Soundwaves / Ripples */}
              <motion.div
                key="listening-ripple-1"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{
                  opacity: 0,
                  scale: 1.8 + micLevel * 1.2,
                }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                style={{ backgroundColor: waveColor }}
                className="absolute w-44 h-44 rounded-full filter blur-md"
              />
              <motion.div
                key="listening-ripple-2"
                initial={{ opacity: 0.4, scale: 0.9 }}
                animate={{
                  opacity: 0,
                  scale: 2.2 + micLevel * 1.5,
                }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 0.4 }}
                style={{ backgroundColor: waveColor }}
                className="absolute w-44 h-44 rounded-full filter blur-lg"
              />
            </>
          )}

          {state === "speaking" && (
            <>
              {/* Dynamic radiating soundwaves */}
              {[1, 2, 3].map((i) => {
                const stepScale = 1.1 + i * 0.3 + Math.sin(speakPhase + i) * 0.12;
                return (
                  <motion.div
                    key={`speaking-ripple-${i}`}
                    initial={{ opacity: 0.5 / i }}
                    animate={{
                      scale: stepScale,
                      opacity: Math.max(0.05, (0.4 / i) - (Math.sin(speakPhase) * 0.05)),
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{
                      borderColor: waveColor,
                      borderWidth: "2px",
                    }}
                    className="absolute w-40 h-40 rounded-full border-dashed"
                  />
                );
              })}
            </>
          )}

          {state === "thinking" && (
            <motion.div
              key="thinking-glow"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.2, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              style={{ backgroundColor: waveColor }}
              className="absolute w-48 h-48 rounded-full filter blur-2xl opacity-30"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Main interactive central Sphere */}
      <motion.div
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 180, damping: 15 }}
        className={`relative z-10 flex items-center justify-center w-36 h-36 md:w-40 md:h-40 rounded-full border border-opacity-40 shadow-xl transition-colors duration-500 ${orbBg} ${pulseBorder}`}
        id="main-orb"
      >
        {/* Core Glowing Gradient Orb */}
        <div
          className={`absolute inset-1.5 rounded-full transition-all duration-700 bg-gradient-to-tr filter brightness-105 opacity-90
            ${
              state === "idle"
                ? "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-700"
                : state === "listening"
                ? `from-${accentColor}-500 to-${accentColor}-300 dark:from-${accentColor}-600 dark:to-${accentColor}-400`
                : state === "thinking"
                ? "from-indigo-400 via-purple-400 to-pink-400 animate-pulse"
                : `from-${accentColor}-400 to-${accentColor}-200 dark:from-${accentColor}-500 dark:to-${accentColor}-300`
            }
          `}
        />

        {/* Floating Ring / Particle effect during thinking state */}
        <AnimatePresence>
          {state === "thinking" && (
            <motion.div
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 360, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className={`absolute -inset-2.5 rounded-full border-2 border-t-indigo-500 border-r-pink-500 border-b-purple-500 border-l-transparent`}
            />
          )}
        </AnimatePresence>

        {/* Center icon / indicator */}
        <div className="relative z-20 flex flex-col items-center justify-center text-zinc-800 dark:text-zinc-100">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.6 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <Mic className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
                <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Idle</span>
              </motion.div>
            )}

            {state === "listening" && (
              <motion.div
                key="listening-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <Mic className="w-9 h-9 text-white animate-bounce" />
                <span className="text-[10px] font-extrabold tracking-widest text-white uppercase">Listening</span>
              </motion.div>
            )}

            {state === "thinking" && (
              <motion.div
                key="thinking-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <Loader2 className="w-9 h-9 text-white animate-spin" />
                <span className="text-[10px] font-extrabold tracking-widest text-white uppercase">Thinking</span>
              </motion.div>
            )}

            {state === "speaking" && (
              <motion.div
                key="speaking-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                <Volume2 className="w-9 h-9 text-white" />
                <span className="text-[10px] font-extrabold tracking-widest text-white uppercase">Speaking</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* State text tag below the orb */}
      <div className="mt-6 text-center select-none">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {state === "idle" && "Tap to start speaking"}
          {state === "listening" && "Go ahead, I'm listening to your voice..."}
          {state === "thinking" && "Processing your request..."}
          {state === "speaking" && "Responding..."}
        </p>
      </div>
    </div>
  );
}
