import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, KeyRound, RotateCcw, Sparkles } from "lucide-react";

const DIFFICULTIES = {
  easy: { label: "Easy", swaps: 5, speed: 520, reveal: 1500 },
  normal: { label: "Normal", swaps: 8, speed: 390, reveal: 1250 },
  limbo: { label: "Limbo", swaps: 13, speed: 270, reveal: 950 },
  memory: { label: "Memory Hell", swaps: 18, speed: 190, reveal: 780 }
};

const KEY_COUNT = 8;

function createKeys() {
  return Array.from({ length: KEY_COUNT }, (_, index) => ({
    id: `key-${index + 1}`,
    label: index + 1
  }));
}

function shufflePair(order) {
  const next = order.slice();
  let first = Math.floor(Math.random() * KEY_COUNT);
  let second = Math.floor(Math.random() * KEY_COUNT);

  while (second === first) {
    second = Math.floor(Math.random() * KEY_COUNT);
  }

  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

export function LimboGame({ onBack }) {
  const keys = useMemo(createKeys, []);
  const [difficulty, setDifficulty] = useState("normal");
  const [order, setOrder] = useState(keys.map(key => key.id));
  const [targetId, setTargetId] = useState("");
  const [phase, setPhase] = useState("idle");
  const [message, setMessage] = useState("Pick a mode and start the shuffle.");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    try {
      return Number(localStorage.getItem("limbo_best_streak") || 0);
    } catch {
      return 0;
    }
  });
  const [round, setRound] = useState(0);
  const [swapsLeft, setSwapsLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  function clearTimer() {
    window.clearTimeout(timerRef.current);
  }

  function startRound() {
    clearTimer();
    const config = DIFFICULTIES[difficulty];
    const nextTarget = keys[Math.floor(Math.random() * keys.length)].id;

    setOrder(keys.map(key => key.id));
    setTargetId(nextTarget);
    setPhase("memorize");
    setRound(value => value + 1);
    setSwapsLeft(config.swaps);
    setMessage("Remember the glowing key.");

    timerRef.current = window.setTimeout(() => runShuffle(config.swaps), config.reveal);
  }

  function runShuffle(remaining) {
    const config = DIFFICULTIES[difficulty];

    if (remaining <= 0) {
      setPhase("pick");
      setSwapsLeft(0);
      setMessage("Which key was it?");
      return;
    }

    setPhase("shuffle");
    setSwapsLeft(remaining);
    setOrder(current => shufflePair(current));

    timerRef.current = window.setTimeout(() => runShuffle(remaining - 1), config.speed);
  }

  function chooseKey(keyId) {
    if (phase !== "pick") return;

    if (keyId === targetId) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak(current => {
        const nextBest = Math.max(current, nextStreak);
        try {
          localStorage.setItem("limbo_best_streak", String(nextBest));
        } catch {
          // Best streak is just cosmetic, so ignore storage failures.
        }
        return nextBest;
      });
      setPhase("result-correct");
      setMessage("Correct. The key obeyed.");
      return;
    }

    setStreak(0);
    setPhase("result-wrong");
    setMessage("Wrong key. Limbo wins this one.");
  }

  function resetGame() {
    clearTimer();
    setOrder(keys.map(key => key.id));
    setTargetId("");
    setPhase("idle");
    setMessage("Pick a mode and start the shuffle.");
    setSwapsLeft(0);
  }

  const isLocked = phase === "memorize" || phase === "shuffle";

  return (
    <main className="limbo-page">
      <div className="limbo-topbar">
        <button className="modal-back-link" onClick={onBack} type="button">
          <ChevronLeft size={18} />
          Back to Demon List
        </button>
      </div>

      <section className="limbo-shell">
        <div className="limbo-header">
          <p className="eyebrow">Hidden minigame</p>
          <h1>Limbo Key Memory</h1>
          <p>Watch the marked key, survive the shuffle, and pick it at the end.</p>
        </div>

        <div className="limbo-status-grid">
          <div>
            <span>Round</span>
            <strong>{round}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>{streak}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestStreak}</strong>
          </div>
          <div>
            <span>Swaps left</span>
            <strong>{swapsLeft}</strong>
          </div>
        </div>

        <div className="limbo-stage">
          <div className={`limbo-message ${phase}`}>
            <Sparkles size={18} />
            {message}
          </div>

          <div className={`limbo-key-grid ${phase}`}>
            {order.map((keyId, index) => {
              const key = keys.find(item => item.id === keyId);
              const isTarget = keyId === targetId;
              const revealTarget = phase === "memorize" || phase === "result-correct" || phase === "result-wrong";

              return (
                <button
                  className={[
                    "limbo-key",
                    revealTarget && isTarget ? "target" : "",
                    phase === "result-wrong" && isTarget ? "missed" : ""
                  ].filter(Boolean).join(" ")}
                  key={keyId}
                  onClick={() => chooseKey(keyId)}
                  disabled={phase !== "pick"}
                  type="button"
                  style={{ "--key-index": index }}
                >
                  <KeyRound size={44} />
                  <span>{key.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="limbo-controls">
          <div className="limbo-difficulty-tabs">
            {Object.entries(DIFFICULTIES).map(([value, config]) => (
              <button
                className={difficulty === value ? "active" : ""}
                disabled={isLocked}
                key={value}
                onClick={() => setDifficulty(value)}
                type="button"
              >
                {config.label}
              </button>
            ))}
          </div>

          <div className="limbo-action-row">
            <button className="login-button" onClick={startRound} disabled={isLocked} type="button">
              {phase === "idle" ? "Start" : "Play again"}
            </button>
            <button className="admin-button" onClick={resetGame} type="button">
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
