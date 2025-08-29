import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS = {
  I: "bg-cyan-400",
  O: "bg-yellow-400",
  T: "bg-purple-500",
  S: "bg-green-400",
  Z: "bg-red-500",
  J: "bg-blue-500",
  L: "bg-orange-400",
};

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return { shape: SHAPES[type], type, x: 3, y: 0 };
}

export default function Tetris() {
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [piece, setPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const dropInterval = useRef(null);
  const holdRefs = useRef({});

  const rotate = (p) => {
    const rotated = p.shape[0].map((_, i) =>
      p.shape.map((row) => row[i]).reverse()
    );
    return { ...p, shape: rotated };
  };

  const collides = (p, brd = board) => {
    return p.shape.some((row, dy) =>
      row.some(
        (cell, dx) =>
          cell &&
          (brd[p.y + dy]?.[p.x + dx] !== null ||
            p.y + dy >= ROWS ||
            p.x + dx < 0 ||
            p.x + dx >= COLS)
      )
    );
  };

  const merge = (p, brd) => {
    const copy = brd.map((row) => [...row]);
    p.shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell) copy[p.y + dy][p.x + dx] = p.type;
      })
    );
    return copy;
  };

  const clearLines = (brd) => {
    let cleared = 0;
    const newBoard = brd.filter((row) => {
      if (row.every((cell) => cell !== null)) {
        cleared++;
        return false;
      }
      return true;
    });
    while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(null));
    if (cleared > 0) setScore((s) => s + cleared * 100);
    return newBoard;
  };

  const drop = () => {
    const newPiece = { ...piece, y: piece.y + 1 };
    if (collides(newPiece)) {
      const merged = merge(piece, board);
      const cleared = clearLines(merged);
      if (piece.y === 0) {
        setGameOver(true);
        clearInterval(dropInterval.current);
      }
      setBoard(cleared);
      setPiece(randomPiece());
    } else {
      setPiece(newPiece);
    }
  };

  const move = (dx) => {
    const newPiece = { ...piece, x: piece.x + dx };
    if (!collides(newPiece)) setPiece(newPiece);
  };

  const rotatePiece = () => {
    const newPiece = rotate(piece);
    if (!collides(newPiece)) setPiece(newPiece);
  };

  const hardDrop = () => {
    let newPiece = { ...piece };
    while (!collides({ ...newPiece, y: newPiece.y + 1 })) {
      newPiece.y++;
    }
    setBoard(clearLines(merge(newPiece, board)));
    setPiece(randomPiece());
  };

  // ---- Keyboard controls ----
  useEffect(() => {
    const handleKey = (e) => {
      if (gameOver) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowDown") drop();
      if (e.key === "ArrowUp") rotatePiece();
      if (e.key === " ") hardDrop();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [piece, board, gameOver]);

  // ---- Automatic drop ----
  useEffect(() => {
    if (!gameOver) {
      clearInterval(dropInterval.current);
      dropInterval.current = setInterval(drop, 800);
      return () => clearInterval(dropInterval.current);
    }
  }, [gameOver]);

  // ---- Mobile on-screen buttons & hold support ----
  const SOFT_DROP_INTERVAL = 50;

  const startHold = (action) => {
    if (gameOver) return;

    if (action === "left") {
      move(-1);
      holdRefs.current.left = setInterval(() => move(-1), 150);
    }
    if (action === "right") {
      move(1);
      holdRefs.current.right = setInterval(() => move(1), 150);
    }
    if (action === "drop") {
      drop();
      holdRefs.current.drop = setInterval(() => drop(), SOFT_DROP_INTERVAL);
    }
  };

  const endHold = (action) => {
    clearInterval(holdRefs.current[action]);
  };

  const rotateControl = (e) => {
    e.preventDefault();
    if (!gameOver) rotatePiece();
  };

  // ---- Render board ----
  const displayBoard = board.map((row) => [...row]);
  piece.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && piece.y + dy >= 0) {
        displayBoard[piece.y + dy][piece.x + dx] = piece.type;
      }
    })
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gray-900">
      <h1 className="text-3xl font-bold mb-4">Tetris</h1>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`,
          border: "2px solid white",
        }}
      >
        {displayBoard.map((row, y) =>
          row.map((cell, x) => (
            <motion.div
              key={`${y}-${x}`}
              className={`w-[${BLOCK_SIZE}px] h-[${BLOCK_SIZE}px] border border-gray-800 ${
                cell ? COLORS[cell] : "bg-gray-900"
              }`}
            />
          ))
        )}
      </div>
      <p className="mt-4 text-xl">Score: {score}</p>
      {gameOver && (
        <p className="mt-2 text-red-400 text-lg">
          Game Over! Refresh to restart.
        </p>
      )}

      {/* Mobile buttons */}
      <div className="flex gap-4 mt-4">
        <button
          onTouchStart={startHold.bind(null, "left")}
          onTouchEnd={() => endHold("left")}
          className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
        >
          ◀️
        </button>
        <button
          onTouchStart={rotateControl}
          className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
        >
          🔄
        </button>
        <button
          onTouchStart={startHold.bind(null, "right")}
          onTouchEnd={() => endHold("right")}
          className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
        >
          ▶️
        </button>
        <button
          onTouchStart={startHold.bind(null, "drop")}
          onTouchEnd={() => endHold("drop")}
          className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
        >
          ⬇️
        </button>
      </div>
    </div>
  );
}
