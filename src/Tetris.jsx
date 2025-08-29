import React, { useState, useEffect, useRef, useCallback } from "react";

const COLS = 10;
const ROWS = 20;

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
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [piece, setPiece] = useState(randomPiece());
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const dropInterval = useRef(null);
  const holdRefs = useRef({});
  const SOFT_DROP_INTERVAL = 50;
  const [blockSize, setBlockSize] = useState(30);

  // Dynamically calculate block size to fit mobile
  useEffect(() => {
    const calculateSize = () => {
      const maxHeight = window.innerHeight * 0.8;
      setBlockSize(Math.floor(Math.min(30, maxHeight / ROWS)));
    };
    calculateSize();
    window.addEventListener("resize", calculateSize);
    return () => window.removeEventListener("resize", calculateSize);
  }, []);

  const rotate = (p) => {
    const rotated = p.shape[0].map((_, i) =>
      p.shape.map((row) => row[i]).reverse()
    );
    return { ...p, shape: rotated };
  };

  const collides = (p, brd) =>
    p.shape.some((row, dy) =>
      row.some(
        (cell, dx) =>
          cell &&
          (brd[p.y + dy]?.[p.x + dx] !== null ||
            p.y + dy >= ROWS ||
            p.x + dx < 0 ||
            p.x + dx >= COLS)
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

  const spawnNextPiece = useCallback(() => {
    setPiece(nextPiece);
    setNextPiece(randomPiece());
  }, [nextPiece]);

  const drop = useCallback(() => {
    setPiece((prevPiece) => {
      setBoard((prevBoard) => {
        const newPiece = { ...prevPiece, y: prevPiece.y + 1 };
        if (collides(newPiece, prevBoard)) {
          const merged = merge(prevPiece, prevBoard);
          const cleared = clearLines(merged);
          if (prevPiece.y === 0) setGameOver(true);
          spawnNextPiece();
          return cleared;
        }
        return prevBoard;
      });
      return { ...prevPiece, y: prevPiece.y + 1 };
    });
  }, [spawnNextPiece]);

  const move = (dx) => {
    setPiece((prev) => {
      const newPiece = { ...prev, x: prev.x + dx };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const rotatePiece = () => {
    setPiece((prev) => {
      const newPiece = rotate(prev);
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const hardDrop = () => {
    setPiece((prev) => {
      let newPiece = { ...prev };
      while (!collides({ ...newPiece, y: newPiece.y + 1 }, board)) {
        newPiece.y++;
      }
      setBoard((prevBoard) => clearLines(merge(newPiece, prevBoard)));
      spawnNextPiece();
      return newPiece;
    });
  };

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
  }, [gameOver, drop, board]);

  useEffect(() => {
    dropInterval.current = setInterval(drop, 600);
    return () => clearInterval(dropInterval.current);
  }, [drop]);

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

  const endHold = (action) => clearInterval(holdRefs.current[action]);

  const rotateControl = (e) => {
    e.preventDefault();
    if (!gameOver) rotatePiece();
  };

  const displayBoard = board.map((row) => [...row]);
  piece.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && piece.y + dy >= 0) displayBoard[piece.y + dy][piece.x + dx] = piece.type;
    })
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gray-900">
      <h1 className="text-3xl font-bold mb-4">Tetris</h1>

      {/* Next piece */}
      <div className="mb-4">
        <p className="text-lg mb-1">Next:</p>
        <div
          className="inline-grid border border-white"
          style={{
            gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, ${blockSize}px)`,
            gridTemplateRows: `repeat(${nextPiece.shape.length}, ${blockSize}px)`,
          }}
        >
          {nextPiece.shape.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`next-${y}-${x}`}
                style={{
                  width: blockSize,
                  height: blockSize,
                  border: "1px solid #333",
                  backgroundColor: cell ? COLORS[nextPiece.type] : "#111",
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Board */}
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

      <p className="mt-4 text-xl">Score: {score}</p>
      {gameOver && (
        <p className="mt-2 text-red-400 text-lg">Game Over! Refresh to restart.</p>
      )}

      {/* Mobile buttons */}
      <div className="flex gap-4 mt-4">
        <button
          onTouchStart={() => startHold("left")}
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
          onTouchStart={() => startHold("right")}
          onTouchEnd={() => endHold("right")}
          className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
        >
          ▶️
        </button>
        <button
          onTouchStart={() => startHold("drop")}
          onTouchEnd={() => endHold("drop")}
          className="px-4 py-2 bg-gray-700 rounded-lg text-white text-xl"
        >
          ⬇️
        </button>
      </div>
    </div>
  );
}
