"use client";
import { useState, useEffect } from "react";
import { Share } from "@/components/share";
import { url } from "@/lib/metadata";
import { Button } from "@/components/ui/button";

const TILE_TYPES = ["base", "eth", "gas", "openx", "pepe"];
const TILE_COLORS: Record<string, string> = {
  base: "#1E90FF",
  eth: "#3C3C3D",
  gas: "#FF9900",
  openx: "#00FF00",
  pepe: "#FF69B4",
};
const TILE_EMOJI: Record<string, string> = {
  base: "🟦",
  eth: "🟪",
  gas: "🟧",
  openx: "🟩",
  pepe: "🟥",
};

function randomTile() {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
}

export function BaseCrash() {
  const [grid, setGrid] = useState<(string | null)[][]>(
    Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, () => randomTile())
    )
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // Timer
  useEffect(() => {
    if (timeLeft === 0) {
      setGameOver(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Leaderboard update
  useEffect(() => {
    if (gameOver) {
      const top10 = JSON.parse(
        localStorage.getItem("basecrash_leaderboard") || "[]"
      );
      const newEntry = { score, date: new Date().toISOString() };
      const updated = [...top10, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      localStorage.setItem(
        "basecrash_leaderboard",
        JSON.stringify(updated)
      );
    }
  }, [gameOver, score]);

  const swap = (x1: number, y1: number, x2: number, y2: number) => {
    const newGrid = grid.map((row) => row.slice());
    [newGrid[y1][x1], newGrid[y2][x2]] = [
      newGrid[y2][x2],
      newGrid[y1][x1],
    ];
    setGrid(newGrid);
    // Check if swap creates any match
    const matches = findMatches(newGrid);
    if (matches.length === 0) {
      // revert
      const reverted = newGrid.map((row) => row.slice());
      [reverted[y1][x1], reverted[y2][x2]] = [
        reverted[y2][x2],
        reverted[y1][x1],
      ];
      setGrid(reverted);
    } else {
      processMatches(newGrid);
    }
  };

  const findMatches = (g: (string | null)[][]) => {
    const matches: {
      type: "row" | "col" | "3" | "4" | "5";
      positions: [number, number][];
    }[] = [];
    // horizontal
    for (let y = 0; y < 6; y++) {
      let run = 1;
      for (let x = 1; x <= 6; x++) {
        if (x < 6 && g[y][x] === g[y][x - 1]) {
          run++;
        } else {
          if (run >= 3) {
            const positions: [number, number][] = [];
            for (let k = 0; k < run; k++) positions.push([y, x - 1 - k]);
            matches.push({
              type: run === 3 ? "3" : run === 4 ? "4" : "5",
              positions,
            });
          }
          run = 1;
        }
      }
    }
    // vertical
    for (let x = 0; x < 6; x++) {
      let run = 1;
      for (let y = 1; y <= 6; y++) {
        if (y < 6 && g[y][x] === g[y - 1][x]) {
          run++;
        } else {
          if (run >= 3) {
            const positions: [number, number][] = [];
            for (let k = 0; k < run; k++) positions.push([y - 1 - k, x]);
            matches.push({
              type: run === 3 ? "3" : run === 4 ? "4" : "5",
              positions,
            });
          }
          run = 1;
        }
      }
    }
    return matches;
  };

  const processMatches = (g: string[][]) => {
    let newGrid = g.map((row) => row.slice());
    let totalPoints = 0;
    while (true) {
      const matches = findMatches(newGrid);
      if (matches.length === 0) break;
      matches.forEach((m) => {
        if (m.type === "4") {
          // clear entire row of the first position
          const row = m.positions[0][0];
          for (let x = 0; x < 6; x++) newGrid[row][x] = null;
          totalPoints += 30;
        } else if (m.type === "5") {
          // clear 3x3 area centered on first position
          const [cy, cx] = m.positions[0];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = cy + dy;
              const nx = cx + dx;
              if (ny >= 0 && ny < 6 && nx >= 0 && nx < 6)
                newGrid[ny][nx] = null;
            }
          }
          totalPoints += 50;
        } else {
          // 3
          m.positions.forEach(([y, x]) => {
            newGrid[y][x] = null;
          });
          totalPoints += 10;
        }
      });
      // drop tiles
      for (let x = 0; x < 6; x++) {
        let empty = 5;
        for (let y = 5; y >= 0; y--) {
          if (newGrid[y][x] !== null && newGrid[y][x] !== "") {
            if (empty !== y) {
              newGrid[empty][x] = newGrid[y][x];
              newGrid[y][x] = "";
            }
            empty--;
          }
        }
        for (let y = empty; y >= 0; y--) {
          newGrid[y][x] = randomTile();
        }
      }
    }
    setScore((s) => s + totalPoints);
    setGrid(newGrid);
  };

  const handleTileClick = (x: number, y: number) => {
    if (gameOver) return;
    if (selected === null) {
      setSelected({ x, y });
    } else {
      const { x: sx, y: sy } = selected;
      if (Math.abs(sx - x) + Math.abs(sy - y) === 1) {
        swap(sx, sy, x, y);
      }
      setSelected(null);
    }
  };

  const playAgain = () => {
    setGrid(
      Array.from({ length: 6 }, () =>
        Array.from({ length: 6 }, () => randomTile())
      )
    );
    setScore(0);
    setTimeLeft(60);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-xl font-bold">Base Crash</div>
      <div className="text-sm">
        Score: {score}  Time: {timeLeft}s
      </div>
      <div className="grid grid-cols-6 gap-1">
        {grid.map((row, y) =>
          row.map((tile, x) => (
            <div
              key={`${x}-${y}`}
              className="w-12 h-12 flex items-center justify-center rounded-md cursor-pointer bg-white shadow-sm"
              style={{ backgroundColor: TILE_COLORS[tile] ?? "#FFFFFF" }}
              onClick={() => handleTileClick(x, y)}
            >
              <span className="text-2xl">{tile ? TILE_EMOJI[tile] : ""}</span>
            </div>
          ))
        )}
      </div>
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl font-bold">Game Over</div>
          <div className="text-xl">Final Score: {score}</div>
          <Button onClick={playAgain}>Play Again</Button>
          <Share text={`I scored ${score} points in Base Crash! ${url}`} />
        </div>
      )}
    </div>
  );
}

