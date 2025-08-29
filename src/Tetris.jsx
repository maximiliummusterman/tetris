import React, { useState, useEffect, useRef } from "react";

const COLS = 10;
const ROWS = 20;
const NEXT_SIZE = 4;
const DROP_INTERVAL = 600;

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
  I: "#06b6d4",
  O: "#facc15",
  T: "#a855f7",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316",
};

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return { shape: SHAPES[type], type, x: 3, y: 0 };
}

export default function Tetris() {
  const [board, setBoard] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [blockSize, setBlockSize] = useState(30);

  const pieceRef = useRef(randomPiece());
  const nextRef = useRef(randomPiece());
  const moveRef = useRef(0); // -1 left, 1 right
  const softDropRef = useRef(false);
  const lastDropRef = useRef(Date.now());

  // Prevent scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, []);

  // Compute block size
  useEffect(() => {
    const headerHeight = 100;
    const buttonsHeight = 120;
    const availableHeight = window.innerHeight - headerHeight - buttonsHeight;
    const availableWidth = window.innerWidth - NEXT_SIZE * 30 - 20;
    setBlockSize(Math.floor(Math.min(availableHeight / ROWS, availableWidth / COLS, 30)));
  }, []);

  const collides = (p, brd) =>
    p.shape.some((row, dy) =>
      row.some(
        (cell, dx) =>
          cell &&
          (brd[p.y + dy]?.[p.x + dx] !== null || p.y + dy >= ROWS || p.x + dx < 0 || p.x + dx >= COLS)
      )
    );

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

  const spawnNext = () => {
    pieceRef.current = nextRef.current;
    nextRef.current = randomPiece();
    if (collides(pieceRef.current, board)) setGameOver(true);
  };

  const dropPiece = () => {
    const p = pieceRef.current;
    const newP = { ...p, y: p.y + 1 };
    if (collides(newP, board)) {
      setBoard((b) => clearLines(merge(p, b)));
      spawnNext();
    } else {
      pieceRef.current = newP;
    }
  };

  const movePiece = (dx) => {
    const p = pieceRef.current;
    const newP = { ...p, x: p.x + dx };
    if (!collides(newP, board)) pieceRef.current = newP;
  };

  const rotatePiece = () => {
    const p = pieceRef.current;
    const rotated = p.shape[0].map((_, i) => p.shape.map((row) => row[i]).reverse());
    const newP = { ...p, shape: rotated };
    if (!collides(newP, board)) pieceRef.current = newP;
  };

  const hardDrop = () => {
    let p = pieceRef.current;
    while (!collides({ ...p, y: p.y + 1 }, board)) p.y++;
    setBoard((b) => clearLines(merge(p, b)));
    spawnNext();
  };

  // Main loop
  useEffect(() => {
    let animation = requestAnimationFrame(function loop() {
      if (!gameOver) {
        const now = Date.now();
        if (now - lastDropRef.current > DROP_INTERVAL || softDropRef.current) {
          dropPiece();
          lastDropRef.current = now;
        }
        if (moveRef.current !== 0) movePiece(moveRef.current);
      }
      animation = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(animation);
  }, [gameOver]);

  // Render board
  const displayBoard = board.map((row) => [...row]);
  pieceRef.current.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && pieceRef.current.y + dy >= 0) displayBoard[pieceRef.current.y + dy][pieceRef.current.x + dx] = pieceRef.current.type;
    })
  );

  const buttonStyle = {
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden" }} className="flex flex-col items-center justify-center bg-gray-900 text-white px-2">
      <h1 className="text-3xl font-bold mb-4 text-center">Tetris</h1>
      <div className="flex flex-row gap-4">
        {/* Main grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${blockSize}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${blockSize}px)`,
            border: "2px solid white",
          }}
        >
          {displayBoard.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${y}-${x}`}
                style={{
                  width: blockSize,
                  height: blockSize,
                  border: "1px solid #333",
                  backgroundColor: cell ? COLORS[cell] : "#111",
                }}
              />
            ))
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg mb-1">Next:</p>
          <div
            className="inline-grid border border-white"
            style={{
              gridTemplateColumns: `repeat(${NEXT_SIZE}, ${blockSize}px)`,
              gridTemplateRows: `repeat(${NEXT_SIZE}, ${blockSize}px)`,
              justifyContent: "center",
              alignContent: "center",
            }}
          >
            {Array.from({ length: NEXT_SIZE }).map((_, y) =>
              Array.from({ length: NEXT_SIZE }).map((_, x) => {
                const cell = nextRef.current.shape[y] && nextRef.current.shape[y][x] ? nextRef.current.shape[y][x] : 0;
                return (
                  <div
                    key={`next-${y}-${x}`}
                    style={{
                      width: blockSize,
                      height: blockSize,
                      border: "1px solid #333",
                      backgroundColor: cell ? COLORS[nextRef.current.type] : "#111",
                    }}
                  />
                );
              })
            )}
          </div>

          <p className="mt-2 text-lg">Score: {score}</p>

          {/* 2x2 button grid */}
          <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: "repeat(2, auto)" }}>
            <button
              style={buttonStyle}
              onMouseDown={() => (moveRef.current = -1)}
              onMouseUp={() => (moveRef.current = 0)}
              onMouseLeave={() => (moveRef.current = 0)}
              onTouchStart={(e) => {
                e.preventDefault();
                moveRef.current = -1;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                moveRef.current = 0;
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              ←
            </button>
            <button
              style={buttonStyle}
              onMouseDown={() => (moveRef.current = 1)}
              onMouseUp={() => (moveRef.current = 0)}
              onMouseLeave={() => (moveRef.current = 0)}
              onTouchStart={(e) => {
                e.preventDefault();
                moveRef.current = 1;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                moveRef.current = 0;
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              →
            </button>
            <button
              style={buttonStyle}
              onMouseDown={rotatePiece}
              onTouchStart={(e) => {
                e.preventDefault();
                rotatePiece();
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              ↺
            </button>
            <button
              style={buttonStyle}
              onMouseDown={() => (softDropRef.current = true)}
              onMouseUp={() => (softDropRef.current = false)}
              onMouseLeave={() => (softDropRef.current = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                softDropRef.current = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                softDropRef.current = false;
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              ↓
            </button>
          </div>
        </div>
      </div>
      {gameOver && <p className="mt-2 text-red-400 text-center text-lg">Game Over! Refresh to restart.</p>}
    </div>
  );
}
