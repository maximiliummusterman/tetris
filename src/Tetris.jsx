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
  const [blockSize, setBlockSize] = useState(28); // responsive size

  const autoDropRef = useRef(null);
  const holdRefs = useRef({});
  const [softDropping, setSoftDropping] = useState(false);
  const landingRef = useRef(false); // blocks inputs while landing/ spawning

  // Make everything non-selectable/non-highlightable, prevent scroll/overscroll
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    root.style.height = "100%";
    body.style.height = "100%";
    root.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = "";
      body.style.overflow = "";
      root.style.height = "";
      body.style.height = "";
      root.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
    };
  }, []);

  // Responsive block size based on viewport and reserved right panel
  useEffect(() => {
    const computeSize = () => {
      const svh = Math.max(window.innerHeight, 0); // use 100svh fallback
      const vw = Math.max(window.innerWidth, 0);
      const rightPanelMinWidth = 160; // next grid + buttons min width
      const padding = 24;

      const hSize = Math.floor((svh - padding) / ROWS);
      const wSize = Math.floor((vw - rightPanelMinWidth - padding) / COLS);
      const size = Math.max(16, Math.min(hSize, wSize, 32));
      setBlockSize(size);
    };
    computeSize();
    window.addEventListener("resize", computeSize);
    window.addEventListener("orientationchange", computeSize);
    return () => {
      window.removeEventListener("resize", computeSize);
      window.removeEventListener("orientationchange", computeSize);
    };
  }, []);

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

  // DROP (stable: merge first, spawn next after, block inputs during landing)
  const drop = useCallback(() => {
    if (gameOver) return;

    setPiece((prev) => {
      const nextPos = { ...prev, y: prev.y + 1 };

      if (collides(nextPos, board)) {
        // Landing: block input
        landingRef.current = true;

        // Merge first so board is always visible; then maybe game over or spawn next
        setBoard((prevBoard) => clearLines(merge(prev, prevBoard)));

        if (prev.y === 0) {
          // Game over at top collision
          clearInterval(autoDropRef.current);
          setGameOver(true);
          landingRef.current = false; // unblock to allow UI buttons, though game over
        } else {
          // Spawn next piece on a separate tick
          setTimeout(() => {
            setPiece(nextPiece);
            setNextPiece(randomPiece());
            landingRef.current = false; // allow inputs again
          }, 0);
        }

        return prev;
      }

      return nextPos;
    });
  }, [board, nextPiece, gameOver]);

  // Auto drop interval
  useEffect(() => {
    autoDropRef.current = setInterval(drop, 600); // 600ms as requested
    return () => clearInterval(autoDropRef.current);
  }, [drop]);

  const move = (dx) => {
    if (landingRef.current) return;
    setPiece((prev) => {
      const newPiece = { ...prev, x: prev.x + dx };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const rotatePiece = () => {
    if (landingRef.current) return;
    setPiece((prev) => {
      const rotated = prev.shape[0].map((_, i) =>
        prev.shape.map((row) => row[i]).reverse()
      );
      const newPiece = { ...prev, shape: rotated };
      return collides(newPiece, board) ? prev : newPiece;
    });
  };

  const hardDrop = () => {
    setPiece((prev) => {
      let np = { ...prev };
      while (!collides({ ...np, y: np.y + 1 }, board)) np.y++;
      setBoard((prevBoard) => clearLines(merge(np, prevBoard)));
      if (!gameOver) {
        setPiece(nextPiece);
        setNextPiece(randomPiece());
      }
      return np;
    });
  };

  // Soft drop loop while holding the ↓ button
  useEffect(() => {
    if (!softDropping) return;
    let t;
    const loop = () => {
      drop();
      t = setTimeout(loop, 50);
    };
    loop();
    return () => clearTimeout(t);
  }, [softDropping, drop]);

  // Hold left/right (repeat)
  const startHold = (dir) => {
    if (holdRefs.current[dir]) return;
    move(dir);
    holdRefs.current[dir] = setInterval(() => move(dir), 130);
  };
  const stopHold = (dir) => {
    clearInterval(holdRefs.current[dir]);
    holdRefs.current[dir] = null;
  };

  // Keyboard (PC)
  useEffect(() => {
    const onKey = (e) => {
      if (gameOver) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowDown") drop();
      if (e.key === "ArrowUp") rotatePiece();
      if (e.key === " ") hardDrop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drop, gameOver]);

  // Render board with active piece
  const displayBoard = board.map((row) => [...row]);
  piece.shape.forEach((r, dy) =>
    r.forEach((c, dx) => {
      if (c && piece.y + dy >= 0) {
        displayBoard[piece.y + dy][piece.x + dx] = piece.type;
      }
    })
  );

  // Non-highlight styles for iOS
  const noHighlightStyle = {
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    WebkitTouchCallout: "none",
    touchAction: "none",
  };

  // Layout: true vertical center by using a full-viewport grid wrapper
  return (
    <div
      style={{
        ...noHighlightStyle,
        height: "100svh",        // fixes iOS browser chrome issues
        minHeight: "100vh",
        width: "100vw",
        display: "grid",
        placeItems: "center",    // perfect center vertically and horizontally
        backgroundColor: "#111827",
        color: "#fff",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        overflow: "hidden",
      }}
    >
      {/* Game area (board + right panel) */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Main Board */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${blockSize}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${blockSize}px)`,
            border: "2px solid #fff",
            background: "#000",
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

        {/* Right Panel: fixed width so it never shifts */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: Math.max(NEXT_GRID_SIZE * blockSize, 160), // fixed width to avoid reflow
          }}
        >
          <p style={{ margin: "0 0 6px 0", fontSize: 16 }}>Next:</p>

          {/* Next Grid (fixed size, no layout shift) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${NEXT_GRID_SIZE}, ${blockSize}px)`,
              gridTemplateRows: `repeat(${NEXT_GRID_SIZE}, ${blockSize}px)`,
              border: "1px solid #fff",
              width: NEXT_GRID_SIZE * blockSize,
              height: NEXT_GRID_SIZE * blockSize,
              background: "#000",
            }}
          >
            {Array.from({ length: NEXT_GRID_SIZE }).map((_, y) =>
              Array.from({ length: NEXT_GRID_SIZE }).map((_, x) => {
                const filled =
                  nextPiece.shape[y] && nextPiece.shape[y][x] ? 1 : 0;
                return (
                  <div
                    key={`next-${y}-${x}`}
                    style={{
                      width: blockSize,
                      height: blockSize,
                      border: "1px solid #333",
                      backgroundColor: filled ? COLORS[nextPiece.type] : "#111",
                    }}
                  />
                );
              })
            )}
          </div>

          <p style={{ marginTop: 8, fontSize: 16 }}>Score: {score}</p>

          {/* 2x2 Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, auto)",
              gap: 8,
              marginTop: 12,
            }}
          >
            <button
              style={{
                ...noHighlightStyle,
                padding: "10px 14px",
                background: "#374151",
                borderRadius: 12,
                fontSize: 20,
                color: "#fff",
                border: "none",
              }}
              onPointerDown={() => startHold(-1)}
              onPointerUp={() => stopHold(-1)}
              onPointerLeave={() => stopHold(-1)}
              aria-label="Move Left"
            >
              ←
            </button>
            <button
              style={{
                ...noHighlightStyle,
                padding: "10px 14px",
                background: "#374151",
                borderRadius: 12,
                fontSize: 20,
                color: "#fff",
                border: "none",
              }}
              onPointerDown={() => startHold(1)}
              onPointerUp={() => stopHold(1)}
              onPointerLeave={() => stopHold(1)}
              aria-label="Move Right"
            >
              →
            </button>
            <button
              style={{
                ...noHighlightStyle,
                padding: "10px 14px",
                background: "#374151",
                borderRadius: 12,
                fontSize: 20,
                color: "#fff",
                border: "none",
              }}
              onPointerDown={rotatePiece}
              aria-label="Rotate"
            >
              ↺
            </button>
            <button
              style={{
                ...noHighlightStyle,
                padding: "10px 14px",
                background: "#374151",
                borderRadius: 12,
                fontSize: 20,
                color: "#fff",
                border: "none",
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                setSoftDropping(true);
              }}
              onPointerUp={() => setSoftDropping(false)}
              onPointerLeave={() => setSoftDropping(false)}
              aria-label="Soft Drop"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {gameOver && (
        <p style={{ marginTop: 8, color: "#f87171", fontSize: 18 }}>
          Game Over! Refresh to restart.
        </p>
      )}
    </div>
  );
}
