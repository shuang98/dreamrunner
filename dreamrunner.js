/* GAME */

let app = new PIXI.Application({ 
    width: 960, 
    height: 960,                       
    antialias: true, 
    transparent: false, 
    resolution: 1,
  }
);
let scale = 1;
window.addEventListener("resize", function(event){ 
  scale = scaleToWindow(app.renderer.view);
});


document.body.appendChild(app.view);

PIXI.loader
  .add("images/map.png")
  .add("images/player1.png")
  .add("images/enemy.png")
  .load(setup);


let state, player;
let walls;
let enemies;
//This `setup` function will run when the image has loaded
function setup() {
  //map
  let map = new PIXI.Sprite(PIXI.loader.resources["images/map.png"].texture);
  app.stage.addChild(map);
  //player
  player = new PIXI.Sprite(PIXI.loader.resources["images/player1.png"].texture);
  app.stage.addChild(player);
  player.x = 64;
  player.y = 64;
  player.id = 1;
  setupMovement("ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", player);

  
  //game
  scale = scaleToWindow(app.renderer.view);
  state = play;
  setupMapWalls("walls.json").then(() => {
    //enemies
    setupEnemies(4);
    app.ticker.add(delta => gameLoop(delta));
  });

}

function gameLoop(delta){
  state(delta);
}

function play(delta) {
  
  movePlayer();
  moveEnemies("DREAM");
  if (isTouchingEnemies(player)) {
    console.log("LOSE!");
  }
}
/* MAP */

/** Set up map walls for collision detection from json file 
 * @param jsonFile name of json file describing walls. (walls.json)
 * @returns a promise
*/
function setupMapWalls(jsonFile) {
  return fetch(jsonFile)
    .then(response => response.json())
    .then(json => {walls = json});
}

/** Checks if sprite is touching a wall. Assumes walls has already been initialized */
function isTouchingWalls(sprite) {
  let i = 0;
  while (i < walls.length && !isTouching(sprite, walls[i])) {
    i++;
  }
  return i < walls.length;
}

/* PLAYER */
const PLAYER_SPEED = 4;

/** 
Setup player movement eventlisteners
*/
function setupMovement(leftKey, upKey, rightKey, downKey, sprite) {
  sprite.vx = 0;
  sprite.vy = 0;
  let left = keyboard(leftKey),
      up = keyboard(upKey),
      right = keyboard(rightKey),
      down = keyboard(downKey);
  left.press = () => {sprite.vx -= PLAYER_SPEED;};
  left.release = () => {sprite.vx += PLAYER_SPEED;};
  up.press = () => {sprite.vy -= PLAYER_SPEED;};
  up.release = () => {sprite.vy += PLAYER_SPEED;};
  right.press = () => {sprite.vx += PLAYER_SPEED;};
  right.release = () => {sprite.vx -= PLAYER_SPEED;};
  down.press = () => {sprite.vy += PLAYER_SPEED;};
  down.release = () => {sprite.vy -= PLAYER_SPEED;};
}

function movePlayer() {
  let oldx = player.x;
  let oldy = player.y;
  player.x += player.vx;
  player.y += player.vy;
  if (isTouchingWalls(player)) {
    player.x = oldx;
    if (isTouchingWalls(player)) {
      player.y = oldy;
      player.x += player.vx;
      if (isTouchingWalls(player)) {
        player.x = oldx;
        player.y = oldy;
      }
    }
  }
}

// ######## ENEMY ###################
let ENEMY_SPEED = 4;

function setupEnemies(num_enemies) {
  enemies = []
  for (let i = 0; i < num_enemies; i++) {
    let e = new PIXI.Sprite(PIXI.loader.resources["images/enemy.png"].texture);
    while (isTouchingWalls(e)) {
      e.x = Math.floor(Math.random() * 928);
      e.y = Math.floor(Math.random() * 928);
    }
    e.dx_modifier = 1;
    e.dy_modifier = 1;
    e.direction = 1;
    e.random = Math.random();
    e.id = i + 100;
    enemies.push(e);
    app.stage.addChild(e);
  }
}

function isTouchingEnemies(sprite) {
  let i = 0;
  while (i < enemies.length && !isTouching(sprite, enemies[i])) {
    i++;
  }
  return i < enemies.length;
}

function moveEnemies(mode) {
  enemies.forEach(enemy => {
    if (mode == "DREAM") {
      if (enemy.random > 0.5) {
        enemy.vx = ENEMY_SPEED * enemy.direction;
        enemy.x += enemy.vx;
      } else {
        enemy.vy = ENEMY_SPEED * enemy.direction;
        enemy.y += enemy.vy;
      }
      if (isTouchingWalls(enemy)) {
        enemy.direction *= -1;
      }
    } else {
      let dx = (player.x - enemy.x) * enemy.dx_modifier;
      let dy = (player.y - enemy.y) * enemy.dy_modifier;
      let oldx = enemy.x;
      let oldy = enemy.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.vx = (dx / Math.abs(dx)) * ENEMY_SPEED;
        enemy.x += enemy.vx;
        enemy.vy = 0;
      } else {
        enemy.vy = (dy / Math.abs(dy)) * ENEMY_SPEED;
        enemy.y += enemy.vy;
        enemy.vx = 0;
      }
      enemy.dx_modifier = 1;
      enemy.dy_modifier = 1;
      if (isTouchingWalls(enemy)) {
        enemy.x = oldx;
        enemy.dx_modifier = 0;
        enemy.dy_modifier = 1;
        if (isTouchingWalls(enemy)) {
          enemy.y = oldy;
          enemy.x += enemy.vx;
          enemy.dy_modifier = 0;
          enemy.dx_modifier = 1;
        }
      }
    }
  });
}

// ######## HELPERS ###################

/** Checks if two rectangular sprites are touching. */
function isTouching(r1, r2) {
  let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;
  hit = false;
  r1.centerX = r1.x + r1.width / 2;
  r1.centerY = r1.y + r1.height / 2;
  r2.centerX = r2.x + r2.width / 2;
  r2.centerY = r2.y + r2.height / 2;
  r1.halfWidth = r1.width / 2;
  r1.halfHeight = r1.height / 2;
  r2.halfWidth = r2.width / 2;
  r2.halfHeight = r2.height / 2;
  vx = r1.centerX - r2.centerX;
  vy = r1.centerY - r2.centerY;
  combinedHalfWidths = r1.halfWidth + r2.halfWidth;
  combinedHalfHeights = r1.halfHeight + r2.halfHeight;
  if (Math.abs(vx) < combinedHalfWidths) {
    if (Math.abs(vy) < combinedHalfHeights) {
      hit = true;
    } else {
      hit = false;
    }
  } else {
    hit = false;
  }
  return hit;
};