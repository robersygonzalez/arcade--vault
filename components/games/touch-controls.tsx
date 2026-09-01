"use client";

import { useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import type { TouchControlConfig } from "@/components/games/registry";

export type { TouchControlConfig };

const REPEAT_MS = 150;

function dispatchKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

function TouchKey({
  code,
  label,
  className,
  repeat,
}: {
  code: string;
  label: string;
  className: string;
  repeat: boolean;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = (e: ReactTouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatchKey("keydown", code);
    if (repeat) {
      intervalRef.current = setInterval(() => dispatchKey("keydown", code), REPEAT_MS);
    }
  };

  const end = (e: ReactTouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatchKey("keyup", code);
  };

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      {label}
    </button>
  );
}

export function TouchControls({
  config,
  onPauseTap,
}: {
  config: TouchControlConfig;
  onPauseTap: () => void;
}) {
  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {config.up && (
          <TouchKey code={config.up} label="▲" className="touch-dpad-btn touch-dpad-up" repeat />
        )}
        {config.left && (
          <TouchKey
            code={config.left}
            label="◀"
            className="touch-dpad-btn touch-dpad-left"
            repeat
          />
        )}
        {config.right && (
          <TouchKey
            code={config.right}
            label="▶"
            className="touch-dpad-btn touch-dpad-right"
            repeat
          />
        )}
        {config.down && (
          <TouchKey
            code={config.down}
            label="▼"
            className="touch-dpad-btn touch-dpad-down"
            repeat
          />
        )}
      </div>

      <div className="touch-actions">
        {config.buttonA && (
          <TouchKey
            code={config.buttonA.code}
            label={config.buttonA.label}
            className="touch-action-btn touch-action-a"
            repeat={false}
          />
        )}
        {config.buttonB && (
          <TouchKey
            code={config.buttonB.code}
            label={config.buttonB.label}
            className="touch-action-btn touch-action-b"
            repeat={false}
          />
        )}
      </div>

      <button type="button" className="touch-pause-btn" onClick={onPauseTap}>
        PAUSA
      </button>
    </div>
  );
}
