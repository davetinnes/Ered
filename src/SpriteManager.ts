export type MonsterSprite = string[][];

export class SpriteManager {
  static MONSTER_SPRITES: Record<string, MonsterSprite> = {
    KOBOLD: [
      ['.', '.', 'B', 'B', 'B', 'B', 'B', '.', '.'],
      ['.', 'B', 'G', 'G', 'G', 'G', 'G', 'B', '.'],
      ['B', 'G', 'W', 'G', 'G', 'G', 'W', 'G', 'B'],
      ['B', 'G', 'G', 'D', 'D', 'D', 'G', 'G', 'B'],
      ['B', 'G', 'G', 'B', 'B', 'B', 'G', 'G', 'B'],
      ['B', 'G', 'G', 'B', 'B', 'B', 'G', 'G', 'B'],
      ['B', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'B'],
      ['.', 'B', 'G', 'G', 'G', 'G', 'G', 'B', '.'],
      ['.', '.', 'B', '.', 'B', '.', 'B', '.', '.']
    ],
    'CREEPING SLIME': [
      ['.', '.', 'G', 'G', 'G', 'G', 'G', '.', '.'],
      ['.', 'G', 'G', 'L', 'L', 'L', 'G', 'G', '.'],
      ['G', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'G'],
      ['G', 'L', 'L', 'C', 'L', 'C', 'L', 'L', 'G'],
      ['G', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'G'],
      ['.', 'G', 'L', 'L', 'L', 'L', 'L', 'G', '.'],
      ['.', '.', 'G', 'L', 'L', 'L', 'G', '.', '.']
    ],
    'ORC WARRIOR': [
      ['.', '.', 'G', 'G', 'G', 'G', '.', '.'],
      ['.', 'G', 'G', 'P', 'P', 'G', 'G', '.'],
      ['G', 'G', 'P', 'G', 'G', 'P', 'G', 'G'],
      ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'],
      ['.', 'G', 'G', 'D', 'D', 'G', 'G', '.'],
      ['.', 'B', 'B', 'D', 'D', 'B', 'B', '.'],
      ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B']
    ],
    ZOMBIE: [
      ['.', '.', 'G', 'G', 'G', 'G', '.', '.'],
      ['.', 'G', 'G', 'S', 'S', 'G', 'G', '.'],
      ['G', 'G', 'S', 'G', 'G', 'S', 'G', 'G'],
      ['G', 'G', 'G', 'S', 'S', 'G', 'G', 'G'],
      ['.', 'G', 'G', 'G', 'G', 'G', 'G', '.'],
      ['.', '.', 'G', 'G', 'G', 'G', '.', '.']
    ],
    WYVERN: [
      ['.', '.', 'R', '.', 'R', '.', 'R', '.', '.'],
      ['.', 'R', 'R', 'R', 'R', 'R', 'R', 'R', '.'],
      ['R', 'R', 'Y', 'R', 'R', 'R', 'Y', 'R', 'R'],
      ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'],
      ['.', 'R', 'R', 'R', 'R', 'R', 'R', 'R', '.'],
      ['.', '.', 'R', 'R', 'R', 'R', 'R', '.', '.']
    ],
    'ARCH MAGE': [
      ['.', '.', 'B', 'B', 'B', 'B', '.', '.'],
      ['.', 'B', 'C', 'C', 'C', 'C', 'B', '.'],
      ['B', 'C', 'B', 'C', 'C', 'B', 'C', 'B'],
      ['B', 'C', 'C', 'C', 'C', 'C', 'C', 'B'],
      ['.', 'B', 'C', 'C', 'C', 'C', 'B', '.'],
      ['.', '.', 'B', 'B', 'B', 'B', '.', '.']
    ]
  };

  static MONSTER_PALETTE: Record<string, string> = {
    B: '#222222',
    G: '#33ff33',
    D: '#774411',
    W: '#ffffff',
    L: '#44bb44',
    C: '#3399ff',
    P: '#888888',
    R: '#ff6666',
    Y: '#ffcc00',
    S: '#88aa88'
  };

  static getSprite(name: string): MonsterSprite {
    return this.MONSTER_SPRITES[name] || this.MONSTER_SPRITES['CREEPING SLIME'];
  }

  static drawSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, sprite: MonsterSprite) {
    const rows = sprite.length;
    const cols = sprite[0].length;
    const scaleX = size / cols;
    const scaleY = size / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = sprite[row][col];
        if (!code || code === '.') continue;
        ctx.fillStyle = this.MONSTER_PALETTE[code] || '#ffffff';
        ctx.fillRect(x + col * scaleX, y + row * scaleY, scaleX, scaleY);
      }
    }
  }
}
