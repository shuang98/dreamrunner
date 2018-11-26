/* GAME */

var music = document.getElementById("music"); 
music.loop = true;

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
  .add("images/player2.png")
  .add("images/enemy.png")
  .add("images/rem.png")
  .load(setup);

let state, player, player2;
let walls;
let enemies;
let remMap, nremMap;
let gameScene = new PIXI.Container();
let gameOverScene = new PIXI.Container();
let startMenuScene = new PIXI.Container();
let finish = new PIXI.Graphics();
let dream_mode = "DREAM";
//This `setup` function will run when the image has loaded
function setup() {
  // remMap.visible = false;
  remMap = new PIXI.Sprite(PIXI.loader.resources["images/rem.png"].texture);
  nremMap = new PIXI.Sprite(PIXI.loader.resources["images/map.png"].texture);
  remMap.visible = false;
  gameScene.addChild(remMap);
  gameScene.addChild(nremMap);
  //game
  scale = scaleToWindow(app.renderer.view);
  state = startMenu;
  //startMenu
  setupStartMenu();

  setupMapWalls("walls.json").then(() => {
    app.stage.addChild(gameScene);
    app.ticker.add(delta => gameLoop(delta));
  });

}

function gameLoop(delta){
  state(delta);
}

// ###### Game States
let dream_state;
function play(delta) {
  movePlayer();
  if (dream_mode == "COLLECTIVE") {
    movePlayer2();
  }
  if (dream_state == "REM") {
    moveEnemies(dream_mode);
    if (dream_mode != "LUCID" && (isTouchingEnemies(player) || (dream_mode == "COLLECTIVE" && isTouchingEnemies(player2)))) {
      setupGameOverScene(false);
      deleteEntities();
      state = end;
      closePlayerMovement();
      if (dream_mode == "COLLECTIVE") {
        closePlayerMovement2();
      }
    }
    if (isTouching(player, finish) && (dream_mode != "COLLECTIVE" || isTouching(player2, finish))) {
      setupGameOverScene(true);
      deleteEntities();
      state = end;
      closePlayerMovement();
      if (dream_mode == "COLLECTIVE") {
        closePlayerMovement2();
      }
    }
  }
}

function end() {
  gameScene.visible = false;
  gameOverScene.visible = true;
}

function startMenu() {
  startMenuScene.visible = true;
  gameScene.visible = false;
  gameOverScene.visible = false;
}

function setupGameScene(mode) {
  remMap.visible = false;
  nremMap.visible = true;
  if (mode == "COLLECTIVE") {
    setupPlayer2();
  }
  setupPlayer();
  setupEnemies(8);
  dream_state = "NREM";
  let style = new PIXI.TextStyle({
    fontFamily: "Futura",
    fontSize: 32,
    fill: "white"
  });
  let title = new PIXI.Text("NREM: Press P to enter REM", style);
  title.x = 960 / 2 - (title.width / 2);
  title.y = 960 / 4;
  let remKey = keyboard("p");
  remKey.press = ()=>{
    dream_state = "REM";
    gameScene.removeChild(title);
    setupFinish();
    remMap.visible = true;
    nremMap.visible = false;
    remKey.unsubscribe();
  }
  gameScene.addChild(title);
}
function setupFinish() {
  finish.lineStyle(4, 0xFF3300, 1);
  finish.beginFill(0x66CCFF);
  finish.drawRect(0, 0, 32, 32);
  finish.endFill();
  while (isTouchingWalls(finish)) {
    finish.x = Math.floor(Math.random() * 928);
    finish.y = Math.floor(Math.random() * 928);
  }
  gameScene.addChild(finish);
}

// #### START MENU ####
function setupStartMenu() {
  let style = new PIXI.TextStyle({
    fontFamily: "Futura",
    fontSize: 64,
    fill: "white"
  });
  let title = new PIXI.Text("DREAM RUNNER", style);
  title.x = 960 / 2 - (title.width / 2);
  title.y = 960 / 4;
  startMenuScene.addChild(title);
  let menu_msg = "Press ENTER for DREAM\n" +
                 "Press N for NIGHTMARE\n" +
                 "Press L for LUCID\n" +
                 "Press C for COLLECTIVE\n"; 
  let msg = new PIXI.Text(menu_msg, {...style, fontSize: 20});
  startMenuScene.addChild(msg);
  let dreamKey = keyboard("Enter"),
      nightmareKey = keyboard("n"),
      lucidKey = keyboard("l"),
      collectiveKey = keyboard("c");
  function handler(mode) {
    return ()=>{
      startMenuScene.visible = false;
      gameScene.visible = true;
      dream_mode = mode;
      music.play();
      setupGameScene(mode);
      dreamKey.unsubscribe();
      nightmareKey.unsubscribe();
      lucidKey.unsubscribe();
      collectiveKey.unsubscribe();
      state = play;
    }
  }
  dreamKey.release = handler("DREAM");
  nightmareKey.release = handler("NIGHTMARE");
  lucidKey.release = handler("LUCID");
  collectiveKey.release = handler("COLLECTIVE")
  app.stage.addChild(startMenuScene);
}

function setupGameOverScene(win) {
  let style = new PIXI.TextStyle({
    fontFamily: "Futura",
    fontSize: 64,
    fill: "white"
  });
  let t = "FAILED! BAD SLEEP.";
  if (win) {
    t = "NICE! GOOD SLEEP.";
  }
  let message = new PIXI.Text(t, style);
  message.x = 960 / 2 - (message.width / 2);
  message.y = 960 / 2;
  gameOverScene.addChild(message);
  let returnMsg = new PIXI.Text("Press R to return to menu", {...style, fontSize: 32});
  gameOverScene.addChild(returnMsg);
  gameOverScene.visible = false;
  let returnKey = keyboard("r");
  returnKey.release = ()=>{
    gameOverScene.visible = false;
    startMenuScene.visible = false;
    gameOverScene.removeChild(message);
    setupStartMenu();
    returnKey.unsubscribe();
    state = startMenu;
  }
  app.stage.addChild(gameOverScene);
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

function deleteEntities() {
  gameScene.removeChild(finish);
  enemies.forEach(e => {
    gameScene.removeChild(e);
  });
  gameScene.removeChild(player);
  gameScene.removeChild(player2);
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
  return ()=>{
    left.unsubscribe();
    right.unsubscribe();
    up.unsubscribe();
    down.unsubscribe();
  }
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
function movePlayer2() {
  let oldx = player2.x;
  let oldy = player2.y;
  player2.x += player2.vx;
  player2.y += player2.vy;
  if (isTouchingWalls(player2)) {
    player2.x = oldx;
    if (isTouchingWalls(player2)) {
      player2.y = oldy;
      player2.x += player2.vx;
      if (isTouchingWalls(player2)) {
        player2.x = oldx;
        player2.y = oldy;
      }
    }
  }
}
let closePlayerMovement, closePlayerMovement2;

function setupPlayer() {
  player = new PIXI.Sprite(PIXI.loader.resources["images/player1.png"].texture);
  gameScene.addChild(player);
  while (isTouchingWalls(player)) {
    player.x = Math.floor(Math.random() * 928);
    player.y = Math.floor(Math.random() * 928);
  }
  player.id = 1;
  closePlayerMovement = setupMovement("ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", player);
}

function setupPlayer2() {
  player2 = new PIXI.Sprite(PIXI.loader.resources["images/player2.png"].texture);
  gameScene.addChild(player2);
  while (isTouchingWalls(player2)) {
    player2.x = Math.floor(Math.random() * 928);
    player2.y = Math.floor(Math.random() * 928);
  }
  player2.id = 2;
  closePlayerMovement2 = setupMovement("a", "w", "d", "s", player2);
}

// ######## ENEMY ###################
let ENEMY_SPEED = 4;

function setupEnemies(num_enemies) {
  enemies = []
  for (let i = 0; i < num_enemies; i++) {
    let e = new PIXI.Sprite(PIXI.loader.resources["images/enemy.png"].texture);
    while (isTouchingWalls(e) && Math.max(Math.abs(e.x - player.x), Math.abs(e.y - player.y)) > 40) {
      e.x = Math.floor(Math.random() * 928);
      e.y = Math.floor(Math.random() * 928);
    }
    e.dx_modifier = 1;
    e.dy_modifier = 1;
    e.direction = 1;
    e.random = Math.random();
    e.id = i + 100;
    enemies.push(e);
    gameScene.addChild(e);
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
    if (mode == "DREAM" || mode == "COLLECTIVE") {
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