import React, { useState, useEffect, useRef, useCallback } from "react";

const COLS = 10;
const ROWS = 20;
const NEXT_GRID_SIZE = 4;

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
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [piece, setPiece] = useState(randomPiece());
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [blockSize, setBlockSize] = useState(24);

  const autoDropRef = useRef(null);
  const holdRefs = useRef({});
  const [softDropping, setSoftDropping] = useState(false);
  const landingRef = useRef(false);
  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const noHighlightStyle = {
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    WebkitTouchCallout: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
    caretColor: "transparent",
  };

  const resetGame = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setPiece(randomPiece());
    setNextPiece(randomPiece());
    setScore(0);
    setGameOver(false);
    setPaused(false);
  };

  const recalcBlockSize = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sizeByWidth = Math.floor(vw / (COLS + NEXT_GRID_SIZE + 2));
    const sizeByHeight = Math.floor(vh / (ROWS + 4));
    const size = Math.max(14, Math.min(30, sizeByWidth, sizeByHeight));
    setBlockSize(size);
  }, []);
  useEffect(() => {
    recalcBlockSize();
    window.addEventListener("resize", recalcBlockSize);
    return () => window.removeEventListener("resize", recalcBlockSize);
  }, [recalcBlockSize]);

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
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      setScore((s) => s + points[cleared]);
    }
    return newBoard;
  };

  const drop = useCallback(() => {
    if (gameOver || paused) return;
    setPiece((prev) => {
      const nextPos = { ...prev, y: prev.y + 1 };
      if (collides(nextPos, board)) {
        landingRef.current = true;
        setBoard((prevBoard) => clearLines(merge(prev, prevBoard)));
        if (prev.y === 0) {
          clearInterval(autoDropRef.current);
          setGameOver(true);
          setTimeout(() => (landingRef.current = false), 0);
          return prev;
        }
        setTimeout(() => {
          if (gameOver) return;
          if (collides(nextPiece, boardRef.current)) {
            setGameOver(true);
            return;
          }
          setPiece(nextPiece);
          setNextPiece(randomPiece());
          landingRef.current = false;
        }, 0);
        return prev;
      }
      return nextPos;
    });
  }, [board, nextPiece, gameOver, paused]);

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
    if (!softDropping || gameOver || paused) return;
    let t;
    const loop = () => {
      drop();
      t = setTimeout(loop, 50);
    };
    loop();
    return () => clearTimeout(t);
  }, [softDropping, drop, gameOver, paused]);

  const move = (dx) => {
    if (gameOver || landingRef.current || paused) return;
    setPiece((prev) => {
      const newPiece = { ...prev, x: prev.x + dx };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const rotatePiece = () => {
    if (gameOver || landingRef.current || paused) return;
    setPiece((prev) => {
      const rotated = prev.shape[0].map((_, i) =>
        prev.shape.map((row) => row[i]).reverse()
      );
      const newPiece = { ...prev, shape: rotated };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const hardDrop = () => {
    if (gameOver || landingRef.current || paused) return;
    setPiece((prev) => {
      let newPiece = { ...prev };
      while (!collides({ ...newPiece, y: newPiece.y + 1 }, board)) newPiece.y++;
      setBoard((prevBoard) => clearLines(merge(newPiece, prevBoard)));
      setTimeout(() => {
        if (collides(nextPiece, boardRef.current)) {
          setGameOver(true);
          return;
        }
        setPiece(nextPiece);
        setNextPiece(randomPiece());
      }, 0);
      return newPiece;
    });
  };

  const startHold = (dir) => {
    if (holdRefs.current[dir]) return;
    move(dir);
    holdRefs.current[dir] = setInterval(() => move(dir), 130);
  };
  const stopHold = (dir) => {
    if (holdRefs.current[dir]) {
      clearInterval(holdRefs.current[dir]);
      holdRefs.current[dir] = null;
    }
  };

  const ghostPiece = (() => {
    let ghost = { ...piece };
    while (!collides({ ...ghost, y: ghost.y + 1 }, board)) {
      ghost.y++;
    }
    return ghost;
  })();

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

  const displayBoard = board.map((row) => [...row]);
  ghostPiece.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && ghostPiece.y + dy >= 0) {
        const y = ghostPiece.y + dy;
        const x = ghostPiece.x + dx;
        if (displayBoard[y] && displayBoard[y][x] === null) {
          displayBoard[y][x] = `ghost-${piece.type}`;
        }
      }
    })
  );
  piece.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && piece.y + dy >= 0) {
        const y = piece.y + dy;
        const x = piece.x + dx;
        if (displayBoard[y] && displayBoard[y][x] !== undefined) {
          displayBoard[y][x] = piece.type;
        }
      }
    })
  );

  const getNextGrid = () => {
    const grid = Array.from({ length: NEXT_GRID_SIZE }, () =>
      Array(NEXT_GRID_SIZE).fill(null)
    );
    const offsetY = Math.floor(
      (NEXT_GRID_SIZE - nextPiece.shape.length) / 2
    );
    const offsetX = Math.floor(
      (NEXT_GRID_SIZE - nextPiece.shape[0].length) / 2
    );
    nextPiece.shape.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c) grid[offsetY + y][offsetX + x] = nextPiece.type;
      })
    );
    return grid;
  };

  const IconButton = ({ onDown, onUp, onLeave, label, children, style }) => (
    <button
      aria-label={label}
      role="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onDown && onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp && onUp();
      }}
      onPointerLeave={(e) => {
        e.preventDefault();
        onLeave && onLeave();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="px-4 py-3 bg-gray-700 rounded-lg text-white text-xl flex items-center justify-center"
      style={{ ...noHighlightStyle, touchAction: "none", ...style }}
    >
      {children}
    </button>
  );

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
                gridTemplateColumns: "repeat(2, auto)", // 2 columns
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Row 1: Move left and Move right */}
              <IconButton onDown={() => startHold(-1)} onUp={() => stopHold(-1)}>
                ←
              </IconButton>
              <IconButton onDown={() => startHold(1)} onUp={() => stopHold(1)}>
                →
              </IconButton>
            
              {/* Row 2: Rotate button spanning 2 columns */}
              <IconButton
                onDown={rotatePiece}
                style={{
                  gridColumn: "1 / span 2", // spans both columns
                  width: "100%",
                  height: 60,
                  fontSize: "1.3rem",
                }}
              >
                ⟳
              </IconButton>
            
              {/* Row 3: Soft drop and Hard drop */}
              <IconButton
                onDown={() => setSoftDropping(true)}
                onUp={() => setSoftDropping(false)}
                onLeave={() => setSoftDropping(false)}
              >
                ↓
              </IconButton>
              <IconButton onDown={hardDrop}>
                ⤓
              </IconButton>
            </div>
            {/* Overlay for paused state */}
            {paused && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0,0,0,0.9)", // dim effect
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 50,
                  pointerEvents: "none", // makes overlay click-through
                }}
              >
                {/* Resume button stays clickable */}
                <button
                  onClick={() => setPaused(false)}
                  style={{
                    pointerEvents: "auto", // only button is clickable
                    padding: "12px 24px",
                    fontSize: "1.2rem",
                    backgroundColor: "#facc15",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Resume
                </button>
              </div>
            )}
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
