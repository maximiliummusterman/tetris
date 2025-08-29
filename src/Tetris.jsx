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
  const [piece, setPiece] = useState(randomPiece());
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [blockSize, setBlockSize] = useState(30);

  const moveDirRef = useRef(0); // -1 left, 1 right
  const softDropRef = useRef(false);
  const autoDropRef = useRef(null);
  const holdIntervalRef = useRef(null);

  // Prevent scroll
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

  const spawnNextPiece = () => {
    setPiece(nextPiece);
    setNextPiece(randomPiece());
  };

  const dropPiece = () => {
    setPiece((prev) => {
      const newPiece = { ...prev, y: prev.y + 1 };
      if (collides(newPiece, board)) {
        setBoard((b) => {
          const merged = merge(prev, b);
          const cleared = clearLines(merged);
          if (prev.y === 0) setGameOver(true);
          return cleared;
        });
        spawnNextPiece();
        return prev;
      }
      return newPiece;
    });
  };

  const movePiece = (dx) => {
    setPiece((prev) => {
      const moved = { ...prev, x: prev.x + dx };
      return collides(moved, board) ? prev : moved;
    });
  };

  const rotatePiece = () => {
    setPiece((prev) => {
      const rotated = prev.shape[0].map((_, i) => prev.shape.map((row) => row[i]).reverse());
      const newPiece = { ...prev, shape: rotated };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const hardDrop = () => {
    setPiece((prev) => {
      let newPiece = { ...prev };
      while (!collides({ ...newPiece, y: newPiece.y + 1 }, board)) newPiece.y++;
      setBoard((b) => clearLines(merge(newPiece, b)));
      spawnNextPiece();
      return newPiece;
    });
  };

  // Auto-drop
  useEffect(() => {
    if (gameOver) return;
    autoDropRef.current = setInterval(dropPiece, DROP_INTERVAL);
    return () => clearInterval(autoDropRef.current);
  }, [gameOver]);

  // Continuous move / soft drop
  useEffect(() => {
    if (gameOver) return;
    if (moveDirRef.current !== 0 || softDropRef.current) {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = setInterval(() => {
        if (moveDirRef.current !== 0) movePiece(moveDirRef.current);
        if (softDropRef.current) dropPiece();
      }, 100);
    } else {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    }
    return () => holdIntervalRef.current && clearInterval(holdIntervalRef.current);
  });

  const startMove = (dir) => (moveDirRef.current = dir);
  const stopMove = () => (moveDirRef.current = 0);
  const startSoftDrop = () => (softDropRef.current = true);
  const stopSoftDrop = () => (softDropRef.current = false);

  const displayBoard = board.map((row) => [...row]);
  piece.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && piece.y + dy >= 0) displayBoard[piece.y + dy][piece.x + dx] = piece.type;
    })
  );

  const buttonStyle = {
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
  };

  return (
    <div
      style={{ height: "100vh", overflow: "hidden" }}
      className="flex flex-col items-center justify-center bg-gray-900 text-white px-2"
    >
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
                const cell =
                  nextPiece.shape[y] && nextPiece.shape[y][x] ? nextPiece.shape[y][x] : 0;
                return (
                  <div
                    key={`next-${y}-${x}`}
                    style={{
                      width: blockSize,
                      height: blockSize,
                      border: "1px solid #333",
                      backgroundColor: cell ? COLORS[nextPiece.type] : "#111",
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
              onMouseDown={() => startMove(-1)}
              onMouseUp={stopMove}
              onMouseLeave={stopMove}
              onTouchStart={(e) => {
                e.preventDefault();
                startMove(-1);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopMove();
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              ←
            </button>
            <button
              style={buttonStyle}
              onMouseDown={() => startMove(1)}
              onMouseUp={stopMove}
              onMouseLeave={stopMove}
              onTouchStart={(e) => {
                e.preventDefault();
                startMove(1);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopMove();
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
              onMouseDown={startSoftDrop}
              onMouseUp={stopSoftDrop}
              onMouseLeave={stopSoftDrop}
              onTouchStart={(e) => {
                e.preventDefault();
                startSoftDrop();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopSoftDrop();
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {gameOver && (
        <p className="mt-2 text-red-400 text-center text-lg">Game Over! Refresh to restart.</p>
      )}
    </div>
  );
}
