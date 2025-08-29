import React, { useState, useEffect, useRef } from "react";

const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL = 600;
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

  const moveDir = useRef(0); // -1 left, 1 right
  const softDrop = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, []);

  const collides = (p, brd = board) =>
    p.shape.some((row, dy) =>
      row.some(
        (cell, dx) =>
          cell && (brd[p.y + dy]?.[p.x + dx] !== null || p.y + dy >= ROWS || p.x + dx < 0 || p.x + dx >= COLS)
      )
    );

  const merge = (p, brd) => {
    const copy = brd.map((r) => [...r]);
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
      if (row.every((c) => c !== null)) {
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
    setPiece(nextPiece);
    setNextPiece(randomPiece());
  };

  const rotate = (p) => {
    const rotated = p.shape[0].map((_, i) => p.shape.map((row) => row[i]).reverse());
    return { ...p, shape: rotated };
  };

  const rotatePiece = () => {
    setPiece((prev) => {
      const r = rotate(prev);
      return collides(r) ? prev : r;
    });
  };

  const movePiece = (dx) => {
    setPiece((prev) => {
      const moved = { ...prev, x: prev.x + dx };
      return collides(moved) ? prev : moved;
    });
  };

  const dropPiece = () => {
    setPiece((prev) => {
      const down = { ...prev, y: prev.y + 1 };
      if (collides(down)) {
        setBoard((b) => {
          const merged = merge(prev, b);
          const cleared = clearLines(merged);
          if (prev.y === 0) setGameOver(true);
          return cleared;
        });
        spawnNext();
        return prev;
      }
      return down;
    });
  };

  const hardDrop = () => {
    setPiece((prev) => {
      let p = { ...prev };
      while (!collides({ ...p, y: p.y + 1 })) p.y++;
      setBoard((b) => clearLines(merge(p, b)));
      spawnNext();
      return p;
    });
  };

  // Game loop: single interval
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      if (moveDir.current !== 0) movePiece(moveDir.current);
      if (softDrop.current) dropPiece();
      dropPiece();
    }, DROP_INTERVAL);
    return () => clearInterval(interval);
  }, [gameOver]);

  // Display board
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
    <div style={{ height: "100vh", overflow: "hidden" }} className="flex flex-col items-center justify-center bg-gray-900 text-white px-2">
      <h1 className="text-3xl font-bold mb-4 text-center">Tetris</h1>
      <div className="flex flex-row gap-4">
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
              <div
                key={`${y}-${x}`}
                style={{
                  width: BLOCK_SIZE,
                  height: BLOCK_SIZE,
                  border: "1px solid #333",
                  backgroundColor: cell ? COLORS[cell] : "#111",
                }}
              />
            ))
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-lg mb-1">Next:</p>
          <div
            className="inline-grid border border-white"
            style={{
              gridTemplateColumns: `repeat(4, ${BLOCK_SIZE}px)`,
              gridTemplateRows: `repeat(4, ${BLOCK_SIZE}px)`,
            }}
          >
            {Array.from({ length: 4 }).map((_, y) =>
              Array.from({ length: 4 }).map((_, x) => {
                const cell = nextPiece.shape[y] && nextPiece.shape[y][x] ? nextPiece.shape[y][x] : 0;
                return (
                  <div
                    key={`next-${y}-${x}`}
                    style={{
                      width: BLOCK_SIZE,
                      height: BLOCK_SIZE,
                      border: "1px solid #333",
                      backgroundColor: cell ? COLORS[nextPiece.type] : "#111",
                    }}
                  />
                );
              })
            )}
          </div>

          <p className="mt-2 text-lg">Score: {score}</p>

          <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: "repeat(2, auto)" }}>
            <button
              style={buttonStyle}
              onMouseDown={() => (moveDir.current = -1)}
              onMouseUp={() => (moveDir.current = 0)}
              onMouseLeave={() => (moveDir.current = 0)}
              onTouchStart={(e) => {
                e.preventDefault();
                moveDir.current = -1;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                moveDir.current = 0;
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
            >
              ←
            </button>
            <button
              style={buttonStyle}
              onMouseDown={() => (moveDir.current = 1)}
              onMouseUp={() => (moveDir.current = 0)}
              onMouseLeave={() => (moveDir.current = 0)}
              onTouchStart={(e) => {
                e.preventDefault();
                moveDir.current = 1;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                moveDir.current = 0;
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
              onMouseDown={() => (softDrop.current = true)}
              onMouseUp={() => (softDrop.current = false)}
              onMouseLeave={() => (softDrop.current = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                softDrop.current = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                softDrop.current = false;
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
