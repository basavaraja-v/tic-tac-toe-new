"use client";

import { useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";

// ===== Audio configuration =====
const BGM_URL = "/audio/music/Mr_Smith-Sonorus.mp3";
const CLICK_SFX = "/audio/music/k1.mp3";
const WIN_SFX = "/audio/sfx/yay1.mp3";
const LOSE_SFX = "/audio/sfx/haw1.mp3";

const GRID_OPTIONS = [3, 4, 5];
const MEMORY_KEY = "ttt-ai-memory";

export default function TicTacToe() {
  const [size, setSize] = useState(3);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [popup, setPopup] = useState<{ text: string; tone: "success" | "error" | "neutral" } | null>(null);
  const [score, setScore] = useState({ player: 0, robo: 0, draw: 0 });
  const [level, setLevel] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  // 🎉 Confetti control
  const [showConfetti, setShowConfetti] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const winRef = useRef<HTMLAudioElement | null>(null);
  const loseRef = useRef<HTMLAudioElement | null>(null);

  const winner = calculateWinner(board, size);
  const isDraw = board.every(Boolean) && !winner;

  // ===== Window size for confetti =====
  useEffect(() => {
    function updateSize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  interface AudioOptions {
    loop?: boolean;
    volume?: number;
  }

  function createAudio(src: string, { loop = false, volume = 1 }: AudioOptions = {}): HTMLAudioElement | null {
    try {
      const audio = document.createElement("audio");
      audio.src = src;
      audio.preload = "auto";
      audio.loop = loop;
      audio.volume = volume;
      return audio;
    } catch {
      return null;
    }
  }

  function initAudio() {
    if (audioReady) return;
    bgmRef.current = createAudio(BGM_URL, { loop: true, volume: 0.1 });
    clickRef.current = createAudio(CLICK_SFX);
    winRef.current = createAudio(WIN_SFX);
    loseRef.current = createAudio(LOSE_SFX);
    setAudioReady(true);
  }

  function safePlay(audio: HTMLAudioElement | null) {
    if (!audio || !soundOn) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => { });
    } catch { }
  }

  function pauseAllAudio() {
    bgmRef.current?.pause();
    clickRef.current?.pause();
    winRef.current?.pause();
    loseRef.current?.pause();
  }


  // ===== AUTO MUTE ON TAB HIDE / MINIMIZE =====
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        pauseAllAudio();
      } else if (soundOn && bgmRef.current) {
        bgmRef.current.play().catch(() => { });
      }
    }

    function handleBlur() {
      pauseAllAudio();
    }

    function handleFocus() {
      if (soundOn && bgmRef.current) {
        bgmRef.current.play().catch(() => { });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [soundOn]);

  useEffect(() => {
    if (!audioReady || !bgmRef.current) return;
    soundOn ? bgmRef.current.play() : bgmRef.current.pause();
  }, [soundOn, audioReady]);

  useEffect(() => {
    setBoard(Array(size * size).fill(null));
    setXIsNext(true);
    setPopup(null);
    setScore({ player: 0, robo: 0, draw: 0 });
    setLevel(1);
  }, [size]);

  useEffect(() => {
    if (winner) {
      learnFromGame(board, size, winner);

      if (winner === "X") {
        setScore((s) => ({ ...s, player: s.player + 1 }));
        setLevel((l) => Math.min(l + 1, 5));
        setPopup({ text: "🎉 You won", tone: "success" });
        safePlay(winRef.current);

        // 🎉 CONFETTI TRIGGER
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        setScore((s) => ({ ...s, robo: s.robo + 1 }));
        setPopup({ text: "🤖 Robo won", tone: "error" });
        safePlay(loseRef.current);
      }
      autoReset();
    } else if (isDraw) {
      setScore((s) => ({ ...s, draw: s.draw + 1 }));
      setPopup({ text: "🤝 Draw", tone: "neutral" });
      autoReset();
    }
  }, [winner, isDraw]);

  useEffect(() => {
    if (!xIsNext && !winner) {
      const move = aiMove(board, size, level);
      if (move === null) return;
      setTimeout(() => {
        const next = [...board];
        next[move] = "O";
        setBoard(next);
        setXIsNext(true);
      }, 350);
    }
  }, [xIsNext, board, winner, level, size]);

  function handleClick(i: number) {
    initAudio();
    if (board[i] || winner || !xIsNext) return;
    safePlay(clickRef.current);
    const next = [...board];
    next[i] = "X";
    setBoard(next);
    setXIsNext(false);
  }

  function autoReset() {
    setTimeout(() => {
      setXIsNext(true);
      setBoard(Array(size * size).fill(null));
      setPopup(null);
    }, 1200);
  }

  function resetAll() {
    setBoard(Array(size * size).fill(null));
    setXIsNext(true);
    setScore({ player: 0, robo: 0, draw: 0 });
    setLevel(1);
    setPopup(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#343541] text-[#ECECF1] font-sans">

      {/* 🎉 CONFETTI */}
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={300}
          gravity={0.4}
          recycle={false}
        />
      )}

      <div className="w-[380px] rounded-2xl bg-[#202123] border border-[#2A2B32] shadow-xl p-6">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-lg font-semibold">Tic Tac Toe</h1>
            <p className="text-xs text-[#A1A1AA]">🤖 Robo Challenge</p>
          </div>
          <button
            onClick={() => {
              initAudio();
              setSoundOn((s) => !s);
            }}
            className="text-xs px-2 py-1 rounded-md bg-[#2A2B32] border border-[#343541]"
          >
            {soundOn ? "🔊 Sound" : "🔇 Muted"}
          </button>
        </div>

        <div className="mb-4 flex justify-center gap-2">
          {GRID_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setSize(g)}
              className={`px-3 py-1 rounded-md text-xs border transition ${size === g
                ? "bg-[#10A37F] text-black border-[#10A37F]"
                : "bg-[#2A2B32] border-[#343541] hover:bg-[#3A3B42]"
                }`}
            >
              {g}×{g}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-[11px] mb-3 text-[#A1A1AA]">
          <span>😎 You <strong className="text-[#ECECF1]">{score.player}</strong></span>
          <span>🤖 Robo <strong className="text-[#ECECF1]">{score.robo}</strong></span>
          <span>🤝 Draw <strong className="text-[#ECECF1]">{score.draw}</strong></span>
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {board.map((value, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className="h-16 rounded-lg border transition flex items-center justify-center bg-[#2A2B32] border-[#343541] hover:bg-[#3A3B42]"
            >
              <span
                className={
                  value === "X"
                    ? "text-[#19C37D] text-2xl font-semibold"
                    : value === "O"
                      ? "text-[#F97316] text-2xl font-semibold"
                      : "text-transparent"
                }
              >
                {value || "X"}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 text-xs text-center text-[#A1A1AA]">
          {winner
            ? winner === "X"
              ? "🎉 You won"
              : "🤖 Robo won"
            : isDraw
              ? "🤝 Draw"
              : xIsNext
                ? "👉 Your turn"
                : "🤖 Robo is thinking…"}
        </div>

        <div className="mt-4 text-[10px] text-center text-[#71717A]">
          🎵 Music by <span className="font-medium text-[#A1A1AA]">Mr Smith</span>
        </div>

        <button
          onClick={resetAll}
          className="mt-6 w-full rounded-lg bg-[#10A37F] py-2 text-sm font-medium text-black hover:opacity-90 transition"
        >
          🔄 Reset game
        </button>
      </div>

      {popup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div
            className={`px-6 py-4 rounded-xl text-base font-medium bg-[#202123] border border-[#2A2B32] shadow-lg ${popup.tone === "success"
              ? "text-[#19C37D]"
              : popup.tone === "error"
                ? "text-[#F97316]"
                : "text-[#ECECF1]"
              }`}
          >
            {popup.text}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== AI + LOGIC (UNCHANGED) =====
// (Everything below is exactly your original logic)

function aiMove(board: (string | null)[], size: number, level: number) {
  const maxDepth = size === 3 ? 2 + Math.floor(level / 2) : 2;
  const mistakeChance = Math.max(0.05, 0.35 - level * 0.05);

  const empty = board.map((v, i) => (v === null ? i : null)).filter((v) => v !== null) as number[];
  if (!empty.length) return null;

  if (Math.random() < mistakeChance) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (let i of empty) {
    const next = [...board];
    next[i] = "O";
    const score = alphaBeta(next, size, maxDepth, -Infinity, Infinity, false);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [i];
    } else if (score === bestScore) {
      bestMoves.push(i);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function alphaBeta(board: (string | null)[], size: number, depth: number, alpha: number, beta: number, maximizing: boolean) {
  const w = calculateWinner(board, size);
  if (w === "O") return 1000;
  if (w === "X") return -1000;
  if (depth === 0 || board.every(Boolean)) return evaluateBoard(board, size);

  const empty = board.map((v, i) => (v === null ? i : null)).filter((v) => v !== null) as number[];

  if (maximizing) {
    let value = -Infinity;
    for (let i of empty) {
      const next = [...board];
      next[i] = "O";
      value = Math.max(value, alphaBeta(next, size, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (let i of empty) {
      const next = [...board];
      next[i] = "X";
      value = Math.min(value, alphaBeta(next, size, depth - 1, alpha, beta, true));
      beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return value;
  }
}

function evaluateBoard(board: (string | null)[], size: number) {
  const lines = getAllLines(size);
  const memory = loadMemory();
  let score = 0;

  for (let line of lines) {
    const cells = line.map((i) => board[i]);
    const key = cells.map((c) => c || "_").join("");
    score += basePatternScore(cells) + (memory[key] || 0);
  }
  return score;
}

function basePatternScore(cells: (string | null)[]) {
  const o = cells.filter((c) => c === "O").length;
  const x = cells.filter((c) => c === "X").length;
  if (o && x) return 0;
  if (o === cells.length) return 100;
  if (x === cells.length) return -100;
  if (o) return Math.pow(3, o);
  if (x) return -Math.pow(3, x);
  return 0;
}

function learnFromGame(board: (string | null)[], size: number, winner: string) {
  const memory = loadMemory();
  const lines = getAllLines(size);

  for (let line of lines) {
    const key = line.map((i) => board[i] || "_").join("");
    if (winner === "O") memory[key] = (memory[key] || 0) + 1;
    if (winner === "X") memory[key] = (memory[key] || 0) - 1;
  }
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

function loadMemory() {
  return JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
}

function getAllLines(size: number) {
  const lines: number[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push([...Array(size)].map((_, j) => i * size + j));
    lines.push([...Array(size)].map((_, j) => j * size + i));
  }
  lines.push([...Array(size)].map((_, i) => i * size + i));
  lines.push([...Array(size)].map((_, i) => i * size + (size - 1 - i)));
  return lines;
}

function calculateWinner(board: (string | null)[], size: number) {
  const lines = getAllLines(size);
  for (let line of lines) {
    const first = board[line[0]];
    if (first && line.every((idx) => board[idx] === first)) return first;
  }
  return null;
}
