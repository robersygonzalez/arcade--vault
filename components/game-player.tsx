"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/app/data/games";
import { useUser } from "@/components/user-context";
import { createClient } from "@/utils/supabase/client";
import {
  REAL_GAMES,
  TOUCH_CONTROLS,
  type RealGameHandle,
  type HudSlot,
} from "@/components/games/registry";
import { TouchControls } from "@/components/games/touch-controls";

export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useUser();
  const RealGame = REAL_GAMES[game.id];
  const gameRef = useRef<RealGameHandle>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [slots, setSlots] = useState<HudSlot[]>([]);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (RealGame || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [RealGame, over, paused]);

  useEffect(() => {
    if (RealGame) return;
    if (score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
  }, [RealGame, score]);

  useEffect(() => {
    if (RealGame) return;
    setSlots([
      { label: "Vidas", value: "♥ ♥ ♥" },
      { label: "Nivel", value: String(level).padStart(2, "0") },
    ]);
  }, [RealGame, level]);

  const togglePause = () => {
    if (RealGame) gameRef.current?.togglePause();
    setPaused((p) => !p);
  };
  const endGame = () => {
    if (RealGame) {
      gameRef.current?.forceGameOver();
      return;
    }
    setOver(true);
  };
  const restart = () => {
    if (RealGame) {
      gameRef.current?.restart();
      setPaused(false);
      setOver(false);
      setSaved(false);
      return;
    }
    setScore(0);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const saveScore = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("scores").insert({ game_id: game.id, name, score });
    if (!error) setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {slots.map((slot) => (
            <div className="hud-stat" key={slot.label}>
              <div className="l">{slot.label}</div>
              <div className="v">{slot.value}</div>
            </div>
          ))}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {RealGame ? (
            <RealGame
              ref={gameRef}
              onStatsChange={(stats) => {
                setScore(stats.score);
                setSlots(stats.slots);
              }}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {RealGame && TOUCH_CONTROLS[game.id] && (
        <TouchControls config={TOUCH_CONTROLS[game.id]} onPauseTap={togglePause} />
      )}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={saveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/games")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
