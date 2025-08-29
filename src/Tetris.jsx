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
  const [blockSize, setBlockSize] = useState(30);

  const autoDropRef = useRef(null);
  const holdRefs = useRef({});
  const swipeHoldRef = useRef(null);
  const [softDropping, setSoftDropping] = useState(false);

  const touchRef = useRef({ x: 0, y: 0, time: 0 });

  // Prevent scrolling & calculate block size
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";

    const headerHeight = 100;
    const buttonsHeight = 120;
    const availableHeight = window.innerHeight - headerHeight - buttonsHeight;
    const availableWidth = window.innerWidth - NEXT_GRID_SIZE * 30 - 20;
    const size = Math.floor(Math.min(availableHeight / ROWS, availableWidth / COLS, 30));
    setBlockSize(size);

    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
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

  const spawnNextPiece = useCallback(() => {
    setPiece(nextPiece);
    setNextPiece(randomPiece());
  }, [nextPiece]);

  const drop = useCallback(() => {
    setPiece((prevPiece) => {
      if (gameOver) return prevPiece;
      const newPiece = { ...prevPiece, y: prevPiece.y + 1 };
      if (collides(newPiece, board)) {
        setBoard((prevBoard) => {
          const merged = merge(prevPiece, prevBoard);
          const cleared = clearLines(merged);
          if (prevPiece.y === 0) setGameOver(true);
          return cleared;
        });
        spawnNextPiece();
        return prevPiece;
      }
      return newPiece;
    });
  }, [board, spawnNextPiece, gameOver]);

  // Auto drop interval
  useEffect(() => {
    autoDropRef.current = setInterval(drop, 600);
    return () => clearInterval(autoDropRef.current);
  }, [drop]);

  const move = (dx) => {
    setPiece((prev) => {
      const newPiece = { ...prev, x: prev.x + dx };
      return collides(newPiece, board) ? prev : newPiece;
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
      setBoard((prevBoard) => clearLines(merge(newPiece, prevBoard)));
      spawnNextPiece();
      return newPiece;
    });
  };

  // Soft drop loop
  useEffect(() => {
    if (!softDropping) return;
    let frame;
    const loop = () => {
      if (softDropping) drop();
      frame = setTimeout(loop, 50);
    };
    loop();
    return () => clearTimeout(frame);
  }, [softDropping, drop]);

  // Hold left/right
  const startHold = (dir) => {
    if (holdRefs.current[dir]) return;
    move(dir);
    holdRefs.current[dir] = setInterval(() => move(dir), 150);
  };
  const stopHold = (dir) => {
    clearInterval(holdRefs.current[dir]);
    holdRefs.current[dir] = null;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (gameOver) return;
      if (e.key === "ArrowLeft") startHold(-1);
      if (e.key === "ArrowRight") startHold(1);
      if (e.key === "ArrowDown") setSoftDropping(true);
      if (e.key === "ArrowUp") rotatePiece();
      if (e.key === " ") hardDrop();
    };
    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft") stopHold(-1);
      if (e.key === "ArrowRight") stopHold(1);
      if (e.key === "ArrowDown") setSoftDropping(false);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [drop, gameOver]);

  // Mobile swipe/tap handling
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchRef.current.x;
    const absDx = Math.abs(dx);
    const threshold = 20;

    if (absDx > threshold && !swipeHoldRef.current) {
      // Start continuous horizontal movement
      move(dx > 0 ? 1 : -1);
      swipeHoldRef.current = setInterval(() => move(dx > 0 ? 1 : -1), 150);
    }
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    const tapThreshold = 15;
    const tapTime = 200;

    // Detect tap → rotate
    if (Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold && dt < tapTime) {
      rotatePiece();
    }

    // Stop continuous horizontal movement
    if (swipeHoldRef.current) {
      clearInterval(swipeHoldRef.current);
      swipeHoldRef.current = null;
    }
  };

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
      className="flex flex-col items-center justify-center text-white bg-gray-900 px-2 relative"
      style={{
        height: "100vh",
        overflow: "hidden",
        touchAction: "none",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        if (swipeHoldRef.current) clearInterval(swipeHoldRef.current);
      }}
    >
      <h1 className="text-3xl font-bold mb-4 text-center">Tetris</h1>

      {/* ...rest of UI: main board, next piece, buttons (same as previous) */}
    </div>
  );
}
