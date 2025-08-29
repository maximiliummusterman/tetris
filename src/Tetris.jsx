import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

const COLS = 10;
const ROWS = 20;
const NEXT_GRID_SIZE = 4;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1],[1, 1]],
  T: [[0, 1, 0],[1, 1, 1]],
  S: [[0, 1, 1],[1, 1, 0]],
  Z: [[1, 1, 0],[0, 1, 1]],
  J: [[1, 0, 0],[1, 1, 1]],
  L: [[0, 0, 1],[1, 1, 1]],
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
const GHOST_COLORS = {
  I: "rgba(6, 182, 212, 0.3)",
  O: "rgba(250, 204, 21, 0.3)",
  T: "rgba(168, 85, 247, 0.3)",
  S: "rgba(34, 197, 94, 0.3)",
  Z: "rgba(239, 68, 68, 0.3)",
  J: "rgba(59, 130, 246, 0.3)",
  L: "rgba(249, 115, 22, 0.3)",
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
  const [paused, setPaused] = useState(false);
  const [blockSize, setBlockSize] = useState(24);
  const [softDropping, setSoftDropping] = useState(false);

  const autoDropRef = useRef(null);
  const landingRef = useRef(false);
  const boardRef = useRef(board);
  useEffect(() => { boardRef.current = board; }, [board]);

  const noHighlightStyle = {
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    WebkitTouchCallout: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
    caretColor: "transparent",
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
    const copy = brd.map(r => [...r]);
    p.shape.forEach((row, dy) =>
      row.forEach((cell, dx) => { if(cell) copy[p.y + dy][p.x + dx] = p.type; })
    );
    return copy;
  };

  const clearLines = (brd) => {
    let cleared = 0;
    const newBoard = brd.filter(row => {
      if (row.every(cell => cell !== null)) { cleared++; return false; }
      return true;
    });
    while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(null));
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      setScore(s => s + points[cleared]);
    }
    return newBoard;
  };

  const drop = useCallback(() => {
    if (gameOver || paused) return;

    setPiece(prev => {
      const nextPos = { ...prev, y: prev.y + 1 };
      if (collides(nextPos, boardRef.current)) {
        landingRef.current = true;
        setBoard(prevBoard => clearLines(merge(prev, prevBoard)));

        if (prev.y === 0) {
          clearInterval(autoDropRef.current);
          setGameOver(true);
          setTimeout(() => (landingRef.current = false), 0);
          return prev;
        }

        setTimeout(() => {
          const np = nextPiece;
          if (collides(np, boardRef.current)) {
            setGameOver(true);
          } else {
            setPiece(np);
            setNextPiece(randomPiece());
            landingRef.current = false;
          }
        }, 0);

        return prev;
      }

      return nextPos;
    });
  }, [gameOver, paused, nextPiece]);

  const getDropInterval = () => {
    let interval = 600;
    if (score >= 5000) interval = 550;
    if (score >= 10000) interval = 500;
    if (score >= 15000) interval = 450;
    if (score >= 20000) interval = 400;
    if (score >= 25000) interval = 350;
    return Math.max(interval, 300);
  };

  useEffect(() => {
    if (paused || softDropping) return;
    clearInterval(autoDropRef.current);
    autoDropRef.current = setInterval(drop, getDropInterval());
    return () => clearInterval(autoDropRef.current);
  }, [softDropping, drop, paused, score]);

  useEffect(() => {
    if (!softDropping || paused || gameOver) return;
    const interval = setInterval(drop, 50);
    return () => clearInterval(interval);
  }, [softDropping, drop, paused, gameOver]);

  const move = (dx) => {
    if (gameOver || landingRef.current || paused) return;
    setPiece(prev => {
      const newPiece = { ...prev, x: prev.x + dx };
      return collides(newPiece, boardRef.current) ? prev : newPiece;
    });
  };

  const rotatePiece = () => {
    if (gameOver || landingRef.current || paused) return;

    setPiece(prev => {
      const rotated = prev.shape[0].map((_, i) => prev.shape.map(r => r[i]).reverse());
      let newPiece = { ...prev, shape: rotated };

      if (!collides(newPiece, boardRef.current)) return newPiece;

      for (let dx of [-1, 1, -2, 2]) {
        const shifted = { ...newPiece, x: newPiece.x + dx };
        if (!collides(shifted, boardRef.current)) return shifted;
      }

      return prev;
    });
  };

  const hardDrop = () => {
    if (gameOver || landingRef.current || paused) return;
    setPiece(prev => {
      let newPiece = { ...prev };
      while (!collides({ ...newPiece, y: newPiece.y + 1 }, boardRef.current)) newPiece.y++;
      setBoard(prevBoard => clearLines(merge(newPiece, prevBoard)));
      setPiece(nextPiece);
      setNextPiece(randomPiece());
      return newPiece;
    });
  };

  const ghostPiece = useMemo(() => {
    let ghost = { ...piece };
    while (!collides({ ...ghost, y: ghost.y + 1 }, boardRef.current)) ghost.y++;
    return ghost;
  }, [piece]);

  useEffect(() => {
    const handleKey = (e) => {
      if (gameOver || paused) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowDown") drop();
      if (e.key === "ArrowUp") rotatePiece();
      if (e.key === " ") hardDrop();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [drop, gameOver, paused]);

  return (
    <div
      className="bg-gray-900 text-white"
      style={{
        ...noHighlightStyle,
        height: "100svh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-center mb-2 mt-0">Tetris</h1>

        <div className="flex flex-row gap-4 items-center justify-center">
          {/* Main board */}
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
                    backgroundColor: cell
                      ? cell.startsWith("ghost-")
                        ? GHOST_COLORS[cell.split("-")[1]]
                        : COLORS[cell]
                      : "#111",
                  }}
                />
              ))
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col items-center">
            <p className="text-lg mb-1">Next:</p>
            <div
              className="inline-grid border border-white"
              style={{
                gridTemplateColumns: `repeat(${NEXT_GRID_SIZE}, ${blockSize}px)`,
                gridTemplateRows: `repeat(${NEXT_GRID_SIZE}, ${blockSize}px)`,
              }}
            >
              {getNextGrid().map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`next-${y}-${x}`}
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

            <p className="mt-2 text-lg">Score: {score}</p>

            {/* Pause/Resume */}
            <button
              onClick={() => setPaused(!paused)}
              className="mt-2 px-4 py-2 bg-yellow-600 rounded-lg text-white"
            >
              {paused ? "Resume" : "Pause"}
            </button>

            {/* Controls */}
            <div
              className="grid gap-2 mt-4"
              style={{
                gridTemplateColumns: "repeat(3, auto)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <IconButton onDown={() => startHold(-1)} onUp={() => stopHold(-1)}>←</IconButton>
              <IconButton onDown={() => startHold(1)} onUp={() => stopHold(1)}>→</IconButton>

              {/* Rotate button spanning all columns */}
              <IconButton
                onDown={rotatePiece}
                style={{ gridColumn: "span 3", padding: "16px 20px", fontSize: "1.75rem" }}
              >
                ⟳
              </IconButton>

              <IconButton
                onDown={() => setSoftDropping(true)}
                onUp={() => setSoftDropping(false)}
                onLeave={() => setSoftDropping(false)}
              >
                ↓
              </IconButton>

              <IconButton onDown={hardDrop}>⤓</IconButton>
            </div>
          </div>
        </div>

        {gameOver && (
          <div className="mt-3 flex flex-col items-center">
            <p className="text-red-400 text-lg">Game Over!</p>
            <button
              onClick={resetGame}
              className="mt-2 px-4 py-2 bg-green-600 rounded-lg text-white"
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
