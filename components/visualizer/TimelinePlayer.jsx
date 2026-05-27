"use client";

import { useEffect, useMemo, useState } from "react";

const speeds = [700, 1100, 1600];

export default function TimelinePlayer({ frames, currentPhase, onPhaseChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(speeds[1]);
  const orderedFrames = useMemo(() => [...frames].sort((a, b) => a.phase - b.phase), [frames]);
  const currentIndex = Math.max(0, orderedFrames.findIndex((frame) => frame.phase === currentPhase));

  useEffect(() => {
    setIsPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!isPlaying || orderedFrames.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      onPhaseChange((phase) => {
        const index = orderedFrames.findIndex((frame) => frame.phase === phase);
        const nextIndex = index >= orderedFrames.length - 1 ? 0 : index + 1;
        return orderedFrames[nextIndex].phase;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [isPlaying, onPhaseChange, orderedFrames, speed]);

  function stepBy(offset) {
    const nextIndex = Math.min(orderedFrames.length - 1, Math.max(0, currentIndex + offset));
    onPhaseChange(orderedFrames[nextIndex]?.phase || 1);
  }

  return (
    <div className="timeline-player" aria-label="Graph phase timeline">
      <div className="timeline-controls">
        <button className="icon-button timeline-icon" type="button" aria-label={isPlaying ? "Pause timeline" : "Play timeline"} title={isPlaying ? "Pause" : "Play"} onClick={() => setIsPlaying((value) => !value)}>
          <span aria-hidden="true">{isPlaying ? "||" : "Play"}</span>
        </button>
        <button className="icon-button timeline-step" type="button" aria-label="Previous phase" title="Previous phase" onClick={() => stepBy(-1)}>
          <span aria-hidden="true">&lt;</span>
        </button>
        <button className="icon-button timeline-step" type="button" aria-label="Next phase" title="Next phase" onClick={() => stepBy(1)}>
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>

      <div className="timeline-frames" role="tablist" aria-label="Graph phases">
        {orderedFrames.map((frame) => (
          <button className={`timeline-frame ${frame.phase === currentPhase ? "is-active" : ""} ${frame.phase < currentPhase ? "is-complete" : ""}`} type="button" role="tab" aria-selected={frame.phase === currentPhase} key={frame.id} onClick={() => onPhaseChange(frame.phase)}>
            <span>{String(frame.phase).padStart(2, "0")}</span>
            <strong>{frame.label}</strong>
          </button>
        ))}
      </div>

      <label className="timeline-speed">
        <span>Speed</span>
        <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
          <option value={speeds[0]}>Fast</option>
          <option value={speeds[1]}>Normal</option>
          <option value={speeds[2]}>Slow</option>
        </select>
      </label>
    </div>
  );
}
