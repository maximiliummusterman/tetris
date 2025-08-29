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
  const [blockSize, setBlockSize] = useState(24); // auto-sized below

  const autoDropRef = useRef(null);
  const holdRefs = useRef({}); // {-1: intervalId, 1: intervalId}
  const [softDropping, setSoftDropping] = useState(false);
  const landingRef = useRef(false); // block inputs during landing/ spawn
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

  // Prevent scrolling & center with small viewport height on iOS
  useEffect(() => {
    const elHtml = document.documentElement;
    const elBody = document.body;
    elHtml.style.overflow = "hidden";
    elBody.style.overflow = "hidden";
    elHtml.style.height = "100%";
    elBody.style.height = "100%";
    elHtml.style.overscrollBehavior = "none";
    elBody.style.overscrollBehavior = "none";

    return () => {
      elHtml.style.overflow = "";
      elBody.style.overflow = "";
      elHtml.style.height = "";
      elBody.style.height = "";
      elHtml.style.overscrollBehavior = "";
      elBody.style.overscrollBehavior = "";
    };
  }, []);

  // Auto-calc block size so the whole layout fits and stays centered
  const recalcBlockSize = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Horizontal fit: board (COLS) + gap columns (~2) + next grid (4)
    const sizeByWidth = Math.floor(vw / (COLS + NEXT_GRID_SIZE + 2));
    // Vertical fit: rows
    const sizeByHeight = Math.floor(vh / (ROWS + 4)); // + a little headroom for title/buttons
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
    if (cleared > 0) setScore((s) => s + cleared * 100);
    return newBoard;
  };

  // Drop with landing guard; spawn next piece after board update; never black screen
  const drop = useCallback(() => {
    if (gameOver) return;

    setPiece((prev) => {
      const nextPos = { ...prev, y: prev.y + 1 };

      if (collides(nextPos, board)) {
        landingRef.current = true;

        // Merge current piece into the board first
        setBoard((prevBoard) => {
          const merged = merge(prev, prevBoard);
          return clearLines(merged);
        });

        // If stuck at top, game over
        if (prev.y === 0) {
          clearInterval(autoDropRef.current);
          setGameOver(true);
          // let the merged piece remain visible
          setTimeout(() => {
            landingRef.current = false;
          }, 0);
          return prev;
        }

        // Spawn next piece in a separate tick; also guard against immediate game over
        setTimeout(() => {
          if (gameOver) return;
          // If next piece immediately collides with current board, it's game over
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
  }, [board, nextPiece, gameOver]);

  // Auto drop interval
  useEffect(() => {
    autoDropRef.current = setInterval(drop, 600);
    return () => clearInterval(autoDropRef.current);
  }, [drop]);

  const move = (dx) => {
    if (gameOver || landingRef.current) return;
    setPiece((prev) => {
      const newPiece = { ...prev, x: prev.x + dx };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const rotatePiece = () => {
    if (gameOver || landingRef.current) return;
    setPiece((prev) => {
      const rotated = prev.shape[0].map((_, i) =>
        prev.shape.map((row) => row[i]).reverse()
      );
      const newPiece = { ...prev, shape: rotated };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const hardDrop = () => {
    if (gameOver || landingRef.current) return;
    setPiece((prev) => {
      let newPiece = { ...prev };
      while (!collides({ ...newPiece, y: newPiece.y + 1 }, board)) newPiece.y++;
      setBoard((prevBoard) => clearLines(merge(newPiece, prevBoard)));
      // Spawn next; if it immediately collides, game over
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

  // Soft drop loop
  useEffect(() => {
    if (!softDropping || gameOver) return;
    let t;
    const loop = () => {
      drop();
      t = setTimeout(loop, 50);
    };
    loop();
    return () => clearTimeout(t);
  }, [softDropping, drop, gameOver]);

  // Hold left/right buttons
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

  // Keyboard controls (PC)
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
  }, [drop, gameOver]);

  // Render board with active piece
  const displayBoard = board.map((row) => [...row]);
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

  // Reusable SVG icon button (prevents iOS text selection issues)
  const IconButton = ({ onDown, onUp, onLeave, label, children }) => (
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
      style={{ ...noHighlightStyle, touchAction: "none" }}
    >
      {children}
    </button>
  );

  return (
    <div
      className="bg-gray-900 text-white"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ...noHighlightStyle,
        height: "100svh", // better on iOS Safari than 100vh
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Centered column (title + game area) */}
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
                    backgroundColor: cell ? COLORS[cell] : "#111",
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
                justifyContent: "center",
                alignContent: "center",
              }}
            >
              {Array.from({ length: NEXT_GRID_SIZE }).map((_, y) =>
                Array.from({ length: NEXT_GRID_SIZE }).map((_, x) => {
                  const cell =
                    nextPiece.shape[y] && nextPiece.shape[y][x]
                      ? nextPiece.shape[y][x]
                      : 0;
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

            {/* 2x2 Buttons under Next */}
            <div
              className="grid gap-2 mt-4"
              style={{
                gridTemplateColumns: "repeat(2, auto)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Left */}
              <IconButton
                label="Move Left"
                onDown={() => startHold(-1)}
                onUp={() => stopHold(-1)}
                onLeave={() => stopHold(-1)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M14 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>

              {/* Right */}
              <IconButton
                label="Move Right"
                onDown={() => startHold(1)}
                onUp={() => stopHold(1)}
                onLeave={() => stopHold(1)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M10 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>

              {/* Rotate */}
              <IconButton label="Rotate" onDown={rotatePiece}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M4 12a8 8 0 1 1 8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4v4H8"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>

              {/* Soft Drop (hold) */}
              <IconButton
                label="Soft Drop"
                onDown={() => setSoftDropping(true)}
                onUp={() => setSoftDropping(false)}
                onLeave={() => setSoftDropping(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M12 5v14M6 13l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            </div>
          </div>
        </div>

        {gameOver && (
          <p className="mt-3 text-red-400 text-center text-lg">
            Game Over! Refresh to restart.
          </p>
        )}
      </div>
    </div>
  );
}
