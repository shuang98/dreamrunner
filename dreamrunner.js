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
  .load(setup);


let state, player;
let walls;
//This `setup` function will run when the image has loaded
function setup() {
  let map = new PIXI.Sprite(PIXI.loader.resources["images/map.png"].texture);
  app.stage.addChild(map);
  player = new PIXI.Sprite(PIXI.loader.resources["images/player1.png"].texture);
  app.stage.addChild(player);
  player.x = 64;
  player.y = 64;
  setupMovement("ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", player);
  scale = scaleToWindow(app.renderer.view);
  state = play;
  setupMapWalls("walls.json").then(() => {
    app.ticker.add(delta => gameLoop(delta));
  });

}

function gameLoop(delta){
  state(delta);
}

function play(delta) {
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
  left.press = () => {sprite.vx = -PLAYER_SPEED;};
  left.release = () => {sprite.vx = 0;};
  up.press = () => {sprite.vy = -PLAYER_SPEED;};
  up.release = () => {sprite.vy = 0;};
  right.press = () => {sprite.vx = PLAYER_SPEED;};
  right.release = () => {sprite.vx = 0;};
  down.press = () => {sprite.vy = PLAYER_SPEED;};
  down.release = () => {sprite.vy = 0;};
}
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