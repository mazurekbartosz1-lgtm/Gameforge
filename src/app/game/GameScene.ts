import { Scene } from "phaser";

export class GameScene extends Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.spritesheet("fairy_tiles", "/assets/test/tiles.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create() {
    this.cameras.main.setBackgroundColor("#2d6a2d");

    const tile = this.add.image(400, 300, "fairy_tiles", 15);
    tile.setScale(8); // 16px * 8 = 128px

    console.log("Phaser scene loaded — frame 15");
  }
}
