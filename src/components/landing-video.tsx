"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, RotateCcw } from "lucide-react";

// Vídeo de presentación: se reproduce al pulsar y, al terminar,
// invita a probar la demo.
export function LandingVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState<"idle" | "playing" | "ended">("idle");
  function play() {
    const v = video.current;
    if (!v) return;
    v.currentTime = stage === "ended" ? 0 : v.currentTime;
    v.play();
    setStage("playing");
  }
  return (
    <div className={`lp-video lp-video-${stage}`}>
      <video
        ref={video}
        src="/ana-video.mp4"
        poster="/ana-video-poster.jpg"
        playsInline
        preload="metadata"
        controls={stage === "playing"}
        onEnded={() => setStage("ended")}
        onPlay={() => setStage("playing")}
        aria-label="Vídeo: cómo funciona ANA en 80 segundos"
      />
      {stage === "idle" && (
        <button className="lp-play" onClick={play}>
          <span className="lp-play-icon">
            <Play size={26} fill="currentColor" aria-hidden />
          </span>
          <span className="lp-play-text">
            Ver cómo funciona
            <small>1 min 20 s</small>
          </span>
        </button>
      )}
      {stage === "ended" && (
        <div className="lp-ended" role="dialog" aria-label="¿Quieres probarlo?">
          <p className="lp-kicker">Ya lo has visto</p>
          <h2>¿Quieres probarlo tú?</h2>
          <p>
            Entra en la demo y reserva como un cliente o gestiona la agenda como
            el negocio.
          </p>
          <div className="lp-ended-actions">
            <Link className="lp-btn lp-btn-primary" href="/demo">
              Probar la demo <ArrowRight size={18} aria-hidden />
            </Link>
            <button className="lp-btn lp-btn-ghost" onClick={play}>
              <RotateCcw size={16} aria-hidden /> Volver a ver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
