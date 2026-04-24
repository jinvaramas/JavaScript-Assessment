const prompt = require('prompt-sync')();
const readline = require('readline');

const HAT    = '^';
const HOLE   = 'O';
const PATH   = '░';
const PLAYER = '*';

const DISPLAY = {
  [PLAYER]: ' @ ',
  [HAT]:    ' ^ ',
  [HOLE]:   ' X ',
  [PATH]:   ' . ',
};

class Field {
  constructor(field) {
    this._field = field.map(row => [...row]);
    this._gameOver = false;

    for (let r = 0; r < this._field.length; r++) {
      for (let c = 0; c < this._field[r].length; c++) {
        if (this._field[r][c] === PLAYER) {
          this._y = r;
          this._x = c;
        }
      }
    }
  }

  static generateField(height, width, holePct = 0.2) {
    const field = Array.from({ length: height }, () => Array(width).fill(PATH));

    const positions = [];
    for (let r = 0; r < height; r++)
      for (let c = 0; c < width; c++)
        positions.push([r, c]);

    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    field[positions[0][0]][positions[0][1]] = PLAYER;
    field[positions[1][0]][positions[1][1]] = HAT;

    const holeCount = Math.floor(width * height * holePct);
    for (let i = 2; i < 2 + holeCount && i < positions.length; i++) {
      field[positions[i][0]][positions[i][1]] = HOLE;
    }

    return new Field(field);
  }

  print() {
    console.clear();
    console.log('🎮  Find Your Hat\n');
    this._field.forEach(row => {
      console.log(row.map(cell => DISPLAY[cell]).join(''));
    });
    console.log('\n  w = ขึ้น  s = ลง  a = ซ้าย  d = ขวา  q = ออก');
  }

  move(dy, dx) {
    if (this._gameOver) return;

    const newY = this._y + dy;
    const newX = this._x + dx;

    if (newY < 0 || newY >= this._field.length || newX < 0 || newX >= this._field[0].length) {
      this._gameOver = true;
      this.print();
      console.log('\n🚫 You went out of bounds! Game over.');
      return;
    }

    const cell = this._field[newY][newX];

    this._field[this._y][this._x] = PATH;
    this._y = newY;
    this._x = newX;
    this._field[newY][newX] = PLAYER;

    if (cell === HOLE) {
      this._gameOver = true;
      this.print();
      console.log('\n💀 You fell into a hole! Game over.');
    } else if (cell === HAT) {
      this._gameOver = true;
      this.print();
      console.log('\n🎉 เจอหมวกแล้ว! You win!');
    }
  }

  moveUp()    { this.move(-1,  0); }
  moveDown()  { this.move( 1,  0); }
  moveLeft()  { this.move( 0, -1); }
  moveRight() { this.move( 0,  1); }

  get gameOver() { return this._gameOver; }
}

// ── Game loop ──────────────────────────────────────────
function handleGameOver(cleanup) {
  cleanup();
  setTimeout(() => {
    const again = prompt('\nเล่นอีกรอบมั้ย? (y/n): ');
    if (again && again.trim().toLowerCase() === 'y') {
      startGame();
    } else {
      console.log('Bye! 👋');
      process.exit();
    }
  }, 100);
}

function startGame() {
  const game = Field.generateField(5, 5, 0.2);
  game.print();

  if (process.stdin.isTTY) {
    // raw mode → keypress ทันทีไม่ต้องกด Enter
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', function handler(str, key) {
      if (game.gameOver) return;

      if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('keypress', handler);
        process.stdin.pause();
        console.log('\nBye! 👋');
        process.exit();
      }

      if      (key.name === 'w' || key.name === 'up')    game.moveUp();
      else if (key.name === 's' || key.name === 'down')  game.moveDown();
      else if (key.name === 'a' || key.name === 'left')  game.moveLeft();
      else if (key.name === 'd' || key.name === 'right') game.moveRight();
      else return;

      if (!game.gameOver) game.print();

      if (game.gameOver) {
        handleGameOver(() => {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('keypress', handler);
          process.stdin.pause();
        });
      }
    });

    process.stdin.resume();
  } else {
    // fallback: line mode → กด w/a/s/d แล้ว Enter
    console.log('  (กดตัวอักษร แล้วกด Enter)');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.on('line', function handler(line) {
      if (game.gameOver) return;

      const key = line.trim().toLowerCase();

      if (key === 'q') {
        rl.close();
        console.log('\nBye! 👋');
        process.exit();
      }

      if      (key === 'w') game.moveUp();
      else if (key === 's') game.moveDown();
      else if (key === 'a') game.moveLeft();
      else if (key === 'd') game.moveRight();
      else return;

      if (!game.gameOver) game.print();

      if (game.gameOver) {
        handleGameOver(() => rl.close());
      }
    });
  }
}

startGame();