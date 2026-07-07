import { useState, useEffect, useRef } from 'react';

type Direction = 'N' | 'E' | 'S' | 'W';
type GameState = 'DUNGEON' | 'COMBAT' | 'GAMEOVER' | 'VICTORY';
interface Player {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  gold: number;
  x: number;
  y: number;
  dir: Direction;
}

interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  gold: number;
}

interface ProjectionFrame {
  L: number;
  R: number;
  T: number;
  B: number;
}

const MAP_SIZE = 24;
const VIEW_W = 400;
const VIEW_H = 300;

const PROJECTION: ProjectionFrame[] = [
  { L: 0,   R: 400, T: 0,   B: 300 }, 
  { L: 65,  R: 335, T: 50,  B: 250 }, 
  { L: 115, R: 285, T: 85,  B: 215 }, 
  { L: 150, R: 250, T: 110, B: 190 }  
];

const ENEMY_POOL: Record<number, Enemy[]> = {
  1: [
    { name: "KOBOLD", hp: 12, maxHp: 12, atk: 5, gold: 15 },
    { name: "CREEPING SLIME", hp: 8, maxHp: 8, atk: 3, gold: 8 }
  ],
  2: [
    { name: "ORC WARRIOR", hp: 28, maxHp: 28, atk: 9, gold: 40 },
    { name: "ZOMBIE", hp: 35, maxHp: 35, atk: 7, gold: 30 }
  ],
  3: [
    { name: "WYVERN", hp: 55, maxHp: 55, atk: 14, gold: 100 },
    { name: "ARCH MAGE", hp: 45, maxHp: 45, atk: 18, gold: 150 }
  ]
};

function generateProceduralFloor(): number[][] {
  let map = Array(MAP_SIZE).fill(null).map(() => Array(MAP_SIZE).fill(1));

  const stack: [number, number][] = [[1, 1]];
  map[1][1] = 0;
  const visited = new Set<string>(["1,1"]);

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const dirs: [number, number][] = [];
    for (const [dx, dy] of [[2,0],[-2,0],[0,2],[0,-2]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 1 && nx < MAP_SIZE - 1 && ny >= 1 && ny < MAP_SIZE - 1 && !visited.has(`${nx},${ny}`)) {
        dirs.push([dx, dy]);
      }
    }
    if (dirs.length > 0) {
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = cx + dx, ny = cy + dy;
      map[cy + dy / 2][cx + dx / 2] = 0;
      map[ny][nx] = 0;
      visited.add(`${nx},${ny}`);
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  const deadEnds: [number, number][] = [];
  for (let y = 1; y < MAP_SIZE - 1; y += 2) {
    for (let x = 1; x < MAP_SIZE - 1; x += 2) {
      if (map[y][x] !== 0) continue;
      let count = 0;
      for (const [dx, dy] of [[2,0],[-2,0],[0,2],[0,-2]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 1 && nx < MAP_SIZE - 1 && ny >= 1 && ny < MAP_SIZE - 1 && map[ny][nx] !== 1) count++;
      }
      if (count === 1) deadEnds.push([x, y]);
    }
  }

  const startIdx = deadEnds.findIndex(([x, y]) => x === 1 && y === 1);
  if (startIdx >= 0) deadEnds.splice(startIdx, 1);

  for (let i = deadEnds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
  }

  if (deadEnds.length > 0) {
    const [sx, sy] = deadEnds[0];
    map[sy][sx] = 2;
    deadEnds.splice(0, 1);
  } else {
    for (let y = MAP_SIZE - 3; y >= 1; y -= 2) {
      let placed = false;
      for (let x = MAP_SIZE - 3; x >= 1; x -= 2) {
        if (map[y][x] === 0 && !(x === 1 && y === 1)) {
          map[y][x] = 2;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }

  const spawnCount = Math.min(3 + Math.floor(Math.random() * 3), deadEnds.length);
  for (let i = 0; i < spawnCount; i++) {
    const [sx, sy] = deadEnds[i];
    map[sy][sx] = 3;
  }

  return map;
}

function findStart(_m: number[][]): [number, number] {
  return [1, 1];
}

function findStartDir(m: number[][]): Direction {
  const dirs: [number, number, Direction][] = [[0,1,'S'],[0,-1,'N'],[1,0,'E'],[-1,0,'W']];
  for (const [dx, dy, d] of dirs) {
    const nx = 1 + dx, ny = 1 + dy;
    if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE && m[ny][nx] !== 1) return d;
  }
  return 'S';
}

const _initialMap = generateProceduralFloor();
const [_startX, _startY] = findStart(_initialMap);
const _startDir = findStartDir(_initialMap);

export default function App() {
  const [gameState, setGameState] = useState<GameState>('DUNGEON');
  const [floor, setFloor] = useState<number>(1);
  const [map, setMap] = useState<number[][]>(_initialMap);
  const [logs, setLogs] = useState<string[]>(["Welcome to the Proving Grounds."]);
  const [player, setPlayer] = useState<Player>({
    name: "HERO", hp: 30, maxHp: 30, mp: 8, maxMp: 8, atk: 8, gold: 0, x: _startX, y: _startY, dir: _startDir
  });
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [atStairs, setAtStairs] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleMoveRef = useRef<(type: 'L' | 'R' | 'F' | 'B') => void>(() => {});

  useEffect(() => {
    if (gameState === 'DUNGEON' && map.length === 0) {
      setMap(generateProceduralFloor());
    }
  }, [gameState, floor, map]);

  useEffect(() => {
    if (gameState === 'DUNGEON' || gameState === 'COMBAT') {
      renderViewport();
    }
  }, [player, map, gameState, enemy]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'DUNGEON' && !atStairs) {
        switch (e.key) {
          case 'ArrowUp': e.preventDefault(); handleMoveRef.current('F'); break;
          case 'ArrowDown': e.preventDefault(); handleMoveRef.current('B'); break;
          case 'ArrowLeft': e.preventDefault(); handleMoveRef.current('L'); break;
          case 'ArrowRight': e.preventDefault(); handleMoveRef.current('R'); break;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, atStairs]);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev.slice(0, 8)]);

  const renderViewport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.strokeStyle = "#33ff33";
    ctx.lineWidth = 2;

    const dirVectors = {
      'N': { fwd: {x:0, y:-1}, L: {x:-1, y:0},  R: {x:1, y:0} },
      'S': { fwd: {x:0, y:1},  L: {x:1, y:0},   R: {x:-1, y:0} },
      'E': { fwd: {x:1, y:0},  L: {x:0, y:-1},  R: {x:0, y:1} },
      'W': { fwd: {x:-1, y:0}, L: {x:0, y:1},   R: {x:0, y:-1} }
    };
    const vec = dirVectors[player.dir];

    for (let z = 2; z >= 0; z--) {
      const tx = player.x + (vec.fwd.x * z);
      const ty = player.y + (vec.fwd.y * z);
      if (ty < 0 || ty >= MAP_SIZE || tx < 0 || tx >= MAP_SIZE) continue;

      const near = PROJECTION[z];
      const far = PROJECTION[z+1];
      const checkWall = (x: number, y: number) => {
      // If the row doesn't exist, or we are out of horizontal bounds, treat it as a solid wall
      if (y < 0 || y >= MAP_SIZE || !map[y] || x < 0 || x >= MAP_SIZE) {
        return 1;
      }
      return map[y][x];
    };

      const leftWall  = checkWall(tx + vec.L.x, ty + vec.L.y) === 1;
      const rightWall = checkWall(tx + vec.R.x, ty + vec.R.y) === 1;
      const frontWall = checkWall(tx, ty) === 1;

      if (frontWall) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(near.L, near.T, near.R - near.L, near.B - near.T);
        ctx.strokeStyle = "#33ff33";
        ctx.beginPath();
        ctx.rect(near.L, near.T, near.R - near.L, near.B - near.T);
        ctx.stroke();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(near.L, near.T); ctx.lineTo(far.L, far.T);
      ctx.moveTo(near.R, near.T); ctx.lineTo(far.R, far.T);
      ctx.moveTo(near.L, near.B); ctx.lineTo(far.L, far.B);
      ctx.moveTo(near.R, near.B); ctx.lineTo(far.R, far.B);
      ctx.stroke();

      ctx.beginPath();
      if (leftWall) {
        ctx.moveTo(near.L, near.T); ctx.lineTo(near.L, near.B);
      } else {
        ctx.moveTo(near.L, far.T); ctx.lineTo(far.L, far.T);
        ctx.moveTo(near.L, far.B); ctx.lineTo(far.L, far.B);
      }
      if (rightWall) {
        ctx.moveTo(near.R, near.T); ctx.lineTo(near.R, near.B);
      } else {
        ctx.moveTo(near.R, far.T); ctx.lineTo(far.R, far.T);
        ctx.moveTo(near.R, far.B); ctx.lineTo(far.R, far.B);
      }
      ctx.stroke();

      if (map[ty]?.[tx] === 2) {
        const inset = 0.3;
        const fl = far.L + (near.L - far.L) * inset;
        const fr = far.R + (near.R - far.R) * inset;
        const ft = far.B + (near.B - far.B) * inset;
        const fb = near.B - (near.B - far.B) * inset;
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.moveTo(fl, ft); ctx.lineTo(fr, ft);
        ctx.lineTo(fr, fb); ctx.lineTo(fl, fb);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 1;
        ctx.stroke();
        for (let r = 1; r < 4; r++) {
          const ry = ft + (fb - ft) * (r / 4);
          ctx.beginPath();
          ctx.moveTo(fl + (fr - fl) * (r / 4), ry);
          ctx.lineTo(fr - (fr - fl) * (r / 4), ry);
          ctx.stroke();
        }
      }
    }

    {
      const cell = 6;
      const mmW = MAP_SIZE * cell;
      const mmH = MAP_SIZE * cell;
      const mmX = VIEW_W - mmW - 5;
      const mmY = 5;
      ctx.fillStyle = "#111111";
      ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
      ctx.strokeStyle = "#33ff33";
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
          const v = map[y][x];
          if (v === 1) continue;
          const px = mmX + x * cell;
          const py = mmY + y * cell;
          if (v === 2) {
            ctx.fillStyle = "#000";
            ctx.fillRect(px, py, cell, cell);
            ctx.fillStyle = "#ff0";
            ctx.fillRect(px + 1, py + 1, 4, 1);
            ctx.fillRect(px + 2, py + 2, 2, 1);
            ctx.fillRect(px + 1, py + 3, 4, 1);
            ctx.fillRect(px + 2, py + 4, 2, 1);
          } else if (x === player.x && y === player.y) {
            ctx.fillStyle = "#33ff33";
            ctx.fillRect(px, py, cell, cell);
          } else if (v === 3) {
            ctx.fillStyle = "#ff3333";
            ctx.fillRect(px, py, cell, cell);
          } else {
            ctx.fillStyle = "#004400";
            ctx.fillRect(px, py, cell, cell);
          }
        }
      }
    }

    if (gameState === 'COMBAT' && enemy) {
      ctx.strokeStyle = "#ff3333";
      ctx.beginPath();
      ctx.arc(200, 150, 40, 0, Math.PI * 2);
      ctx.moveTo(170, 130); ctx.lineTo(185, 130);
      ctx.moveTo(215, 130); ctx.lineTo(230, 130);
      ctx.moveTo(180, 170); ctx.lineTo(220, 170);
      ctx.stroke();
    }
  };

  const handleMove = (type: 'L' | 'R' | 'F' | 'B') => {
    let nx = player.x;
    let ny = player.y;
    const dirs: Direction[] = ['N', 'E', 'S', 'W'];
    let idx = dirs.indexOf(player.dir);

    if (type === 'L') {
      setPlayer(p => ({ ...p, dir: dirs[(idx + 3) % 4] }));
      return;
    }
    if (type === 'R') {
      setPlayer(p => ({ ...p, dir: dirs[(idx + 1) % 4] }));
      return;
    }

    const step = type === 'F' ? 1 : -1;
    if (player.dir === 'N') ny -= step;
    if (player.dir === 'S') ny += step;
    if (player.dir === 'E') nx += step;
    if (player.dir === 'W') nx -= step;

    if (ny < 0 || ny >= MAP_SIZE || nx < 0 || nx >= MAP_SIZE || map[ny][nx] === 1) {
      addLog("Ouch! You bumped into a solid stone wall.");
      return;
    }

    if (map[ny][nx] === 2) {
      setPlayer(p => ({ ...p, x: nx, y: ny }));
      setAtStairs(true);
      addLog("You found a staircase descending into darkness.");
      return;
    }

    if (map[ny][nx] === 3) {
      const pool = ENEMY_POOL[floor];
      const selected = { ...pool[Math.floor(Math.random() * pool.length)] };
      setEnemy(selected);
      const cleanMap = [...map];
      cleanMap[ny][nx] = 0;
      setMap(cleanMap);
      setPlayer(p => ({ ...p, x: nx, y: ny }));
      setGameState('COMBAT');
      addLog(`Ambushed by a wild ${selected.name}!`);
      return;
    }
    setPlayer(p => ({ ...p, x: nx, y: ny }));
  };
  handleMoveRef.current = handleMove;

  const executeCombatRound = (actionType: 'ATTACK' | 'SPELL') => {
    if (!enemy) return;
    let pDmg = Math.floor(Math.random() * player.atk) + 2;
    if (actionType === 'SPELL') {
      if (player.mp <= 0) {
        addLog("Out of Mana points!");
        return;
      }
      setPlayer(p => ({ ...p, mp: p.mp - 3 }));
      pDmg = Math.floor(Math.random() * 15) + 12;
    }

    const nextEnemyHp = enemy.hp - pDmg;
    addLog(`You hit ${enemy.name} for ${pDmg} points.`);

    if (nextEnemyHp <= 0) {
      addLog(`Victory! Defeated ${enemy.name}. Found ${enemy.gold} Gold.`);
      setPlayer(p => ({ ...p, gold: p.gold + enemy.gold }));
      setEnemy(null);
      setGameState('DUNGEON');
      return;
    }

    const eDmg = Math.floor(Math.random() * enemy.atk) + 1;
    const nextPlayerHp = player.hp - eDmg;
    addLog(`${enemy.name} retaliates for ${eDmg} damage.`);

    if (nextPlayerHp <= 0) {
      setGameState('GAMEOVER');
    } else {
      setEnemy(prev => prev ? { ...prev, hp: nextEnemyHp } : null);
      setPlayer(p => ({ ...p, hp: nextPlayerHp }));
    }
  };

  const handleDescend = () => {
    setAtStairs(false);
    if (floor === 3) {
      setGameState('VICTORY');
    } else {
      const nextFloor = floor + 1;
      const m = generateProceduralFloor();
      setMap(m);
      const [sx, sy] = findStart(m);
      const sd = findStartDir(m);
      setPlayer(p => ({ ...p, x: sx, y: sy, dir: sd }));
      setFloor(nextFloor);
      addLog(`Descended deeper onto Floor ${nextFloor}.`);
    }
  };

  return (
    <div style={{ width: '420px', padding: '15px', border: '2px solid #33ff33', background: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
        <div>FLOOR: {floor}/3</div>
        <div>HP: {player.hp}/{player.maxHp}</div>
        <div>MP: {player.mp}/{player.maxMp}</div>
        <div>GOLD: {player.gold}</div>
      </div>

      {gameState === 'GAMEOVER' ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #ff3333', color: '#ff3333' }}>
          <h2>HESTIA ACERBUS!</h2>
          <p>Your character perished in the maze.</p>
          <button onClick={() => window.location.reload()} style={{ background: '#000', color: '#ff3333', border: '1px solid #ff3333', padding: '5px 10px', fontFamily: 'monospace', cursor: 'pointer' }}>TRY AGAIN</button>
        </div>
      ) : gameState === 'VICTORY' ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #33ff33' }}>
          <h2>CONGRATULATIONS!</h2>
          <p>You escaped the maze with {player.gold} gold pieces.</p>
          <button onClick={() => window.location.reload()} style={{ background: '#000', color: '#33ff33', border: '1px solid #33ff33', padding: '5px 10px', fontFamily: 'monospace', cursor: 'pointer' }}>PLAY AGAIN</button>
        </div>
      ) : (
        <div style={{ position: 'relative', width: `${VIEW_W}px`, height: `${VIEW_H}px` }}>
          <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} style={{ border: '1px solid #33ff33' }} />
          <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '2px 5px', fontSize: '11px' }}>
            POS: {player.x},{player.y} FACING: {player.dir}
          </div>
          {atStairs && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 10 }}>
              <div style={{ color: '#33ff33', marginBottom: '15px', fontSize: '16px', textAlign: 'center', padding: '0 10px' }}>
                A stone staircase descends into darkness.
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={handleDescend} style={{ background: '#000', color: '#33ff33', border: '1px solid #33ff33', padding: '8px 16px', fontFamily: 'monospace', cursor: 'pointer', fontSize: '14px' }}>DESCEND</button>
                <button onClick={() => setAtStairs(false)} style={{ background: '#000', color: '#33ff33', border: '1px solid #33ff33', padding: '8px 16px', fontFamily: 'monospace', cursor: 'pointer', fontSize: '14px' }}>STAY</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ margin: '15px 0', minHeight: '60px' }}>
        {gameState === 'COMBAT' && enemy && (
          <div>
            <div style={{ color: '#ff3333', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
              TARGET: {enemy.name} (HP: {enemy.hp}/{enemy.maxHp})
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => executeCombatRound('ATTACK')} style={{ flex: 1, background: '#000', color: '#ff3333', border: '1px solid #ff3333', padding: '8px', fontFamily: 'monospace', cursor: 'pointer' }}>STRIKE WEAPON</button>
              <button onClick={() => executeCombatRound('SPELL')} style={{ flex: 1, background: '#000', color: '#33ffff', border: '1px solid #33ffff', padding: '8px', fontFamily: 'monospace', cursor: 'pointer' }}>CAST HALITO (-3MP)</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #33ff33', paddingTop: '10px', height: '110px', overflowY: 'hidden', fontSize: '12px', lineHeight: '1.4' }}>
        {logs.map((log, index) => (
          <div key={index} style={{ opacity: index === 0 ? 1 : 0.4, color: log.includes('hit') || log.includes('Ambushed') ? '#ff3333' : '#33ff33' }}>
            &gt; {log}
          </div>
        ))}
      </div>
    </div>
  );
}