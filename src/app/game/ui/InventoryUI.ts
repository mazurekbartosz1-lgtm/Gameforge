import { type Room } from "colyseus.js";
import { ITEM_DEFS, ITEM_MAP, type ItemDef } from "./itemConfig";

// Layout constants
const SLOT_SIZE   = 44;
const SLOT_GAP    = 4;
const HOTBAR_COLS = 8;
const GRID_COLS   = 4;
const GRID_ROWS   = 5;
const CANVAS_W    = 800;
const CANVAS_H    = 600;

const HOTBAR_Y = CANVAS_H - SLOT_SIZE - 8;
const HOTBAR_X = (CANVAS_W - (HOTBAR_COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP)) / 2;

const PANEL_W = GRID_COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP + 20;
const PANEL_H = GRID_ROWS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP + 44;
const PANEL_X = (CANVAS_W - PANEL_W) / 2;
const PANEL_Y = (CANVAS_H - PANEL_H) / 2;

// ── SlotGfx — one drawn slot ──────────────────────────────────────────────────

class SlotGfx {
  private gfx:     Phaser.GameObjects.Graphics;
  private label:   Phaser.GameObjects.Text;
  private count:   Phaser.GameObjects.Text;
  private numText: Phaser.GameObjects.Text | null = null;
  private hitZone: Phaser.GameObjects.Rectangle | null = null;
  public  itemId: string | null = null;

  private x:    number;
  private y:    number;
  private size: number;
  private isActive = false;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, depth = 21, slotNum?: number) {
    this.x    = x;
    this.y    = y;
    this.size = size;

    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(depth);

    this.label = scene.add.text(x + size / 2, y + size / 2 - 4, "", {
      fontSize: "12px", color: "#ffffff",
      fontStyle: "bold", stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

    this.count = scene.add.text(x + size - 3, y + size - 3, "", {
      fontSize: "10px", color: "#ffffff",
      stroke: "#000000", strokeThickness: 2,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(depth + 1);

    if (slotNum !== undefined) {
      this.numText = scene.add.text(x + 3, y + 2, `${slotNum}`, {
        fontSize: "9px", color: "#888899",
        stroke: "#000000", strokeThickness: 2,
      }).setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1);
    }
  }

  setInteractive(onClick: () => void) {
    const scene = this.gfx.scene;
    this.hitZone = scene.add
      .rectangle(this.x, this.y, this.size, this.size)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(this.gfx.depth + 2)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.01);
    this.hitZone.on("pointerdown", onClick);
  }

  setActive(active: boolean) {
    this.isActive = active;
    // Redraw border only (no data change)
    this.gfx.lineStyle(active ? 2 : 1, active ? 0xff8c00 : 0x333344, 1);
    this.gfx.strokeRect(this.x, this.y, this.size, this.size);
  }

  setVisible(v: boolean) {
    this.gfx.setVisible(v);
    this.label.setVisible(v);
    this.count.setVisible(v);
    if (this.numText) this.numText.setVisible(v);
    if (this.hitZone) this.hitZone.setVisible(v);
  }

  draw(def: ItemDef | null, qty: number, selected = false) {
    this.itemId = def && qty > 0 ? def.id : null;
    const s = this.size;
    this.gfx.clear();

    // Slot background
    this.gfx.fillStyle(0x1a1a2e, 0.9);
    this.gfx.fillRect(this.x, this.y, s, s);

    // Border — active=orange, selected=yellow, normal=dark
    const borderColor = this.isActive ? 0xff8c00 : (selected ? 0xffff00 : 0x333344);
    const borderWidth = (this.isActive || selected) ? 2 : 1;
    this.gfx.lineStyle(borderWidth, borderColor, 1);
    this.gfx.strokeRect(this.x, this.y, s, s);

    if (def && qty > 0) {
      const col = Phaser.Display.Color.HexStringToColor(def.color);
      this.gfx.fillStyle(col.color, 0.35);
      this.gfx.fillRect(this.x + 2, this.y + 2, s - 4, s - 4);

      this.label.setText(def.symbol).setVisible(true);
      this.count.setText(qty > 1 ? `${qty}` : "").setVisible(true);
    } else {
      this.label.setText("").setVisible(false);
      this.count.setText("").setVisible(false);
    }
  }
}

// ── InventoryUI ────────────────────────────────────────────────────────────────

export class InventoryUI {
  private scene:     Phaser.Scene;
  private inventory: Map<string, number>;
  private room:      Room | null;

  // Hotbar
  private hotbarSlots: SlotGfx[] = [];
  private activeSlot  = 0;

  // Inventory panel
  private panelOpen        = false;
  private panelBg!:          Phaser.GameObjects.Rectangle;
  private panelTopBorder!:   Phaser.GameObjects.Rectangle;
  private panelTitle!:       Phaser.GameObjects.Text;
  private gridSlots:         SlotGfx[] = [];
  private selectedGridSlot = -1;
  private selectedHint!:     Phaser.GameObjects.Text;

  // Keys
  private keyI!:   Phaser.Input.Keyboard.Key;
  private keyE!:   Phaser.Input.Keyboard.Key;
  private keys18!: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene, inventory: Map<string, number>, room: Room | null) {
    this.scene     = scene;
    this.inventory = inventory;
    this.room      = room;

    this.buildHotbar();
    this.buildPanel();
    this.bindKeys();
    this.refresh();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  refresh() {
    this.refreshHotbar();
    if (this.panelOpen) this.refreshGrid();
  }

  /** Eat highest-priority food. onEat callback receives the itemId. */
  eatFirst(onEat: (itemId: string) => void) {
    const ORDER = ["cooked_meat", "cooked_mushroom", "mushroom", "berries", "raw_meat"];
    for (const itemId of ORDER) {
      if ((this.inventory.get(itemId) ?? 0) > 0) {
        this.inventory.set(itemId, (this.inventory.get(itemId) ?? 0) - 1);
        this.refresh();
        if (this.room) this.room.send("eat", { itemId });
        onEat(itemId);
        return;
      }
    }
  }

  isPanelOpen() { return this.panelOpen; }

  /** Call once per frame. Returns true if E key was consumed by InventoryUI. */
  handleInput(): boolean {
    if (Phaser.Input.Keyboard.JustDown(this.keyI)) {
      this.togglePanel();
    }

    for (let i = 0; i < this.keys18.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.keys18[i])) {
        this.setActiveSlot(i);
      }
    }

    if (this.panelOpen && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (this.selectedGridSlot >= 0) {
        const slot = this.gridSlots[this.selectedGridSlot];
        if (slot.itemId) {
          this.eatFromSlot(slot.itemId);
          this.selectedGridSlot = -1;
          this.refreshGrid();
          return true;
        }
      }
    }

    return false;
  }

  // ── Hotbar ─────────────────────────────────────────────────────────────────

  private buildHotbar() {
    for (let i = 0; i < HOTBAR_COLS; i++) {
      const x = HOTBAR_X + i * (SLOT_SIZE + SLOT_GAP);
      this.hotbarSlots.push(new SlotGfx(this.scene, x, HOTBAR_Y, SLOT_SIZE, 21, i + 1));
    }
    this.hotbarSlots[0].setActive(true);
  }

  private setActiveSlot(i: number) {
    this.hotbarSlots[this.activeSlot]?.setActive(false);
    this.activeSlot = i;
    this.hotbarSlots[i]?.setActive(true);
    this.refreshHotbar();
  }

  private refreshHotbar() {
    for (let i = 0; i < HOTBAR_COLS; i++) {
      const def   = ITEM_DEFS[i] ?? null;
      const count = def ? (this.inventory.get(def.id) ?? 0) : 0;
      this.hotbarSlots[i].draw(def, count);
      // Re-apply active highlight after draw (draw clears it)
      if (i === this.activeSlot) this.hotbarSlots[i].setActive(true);
    }
  }

  // ── Panel ──────────────────────────────────────────────────────────────────

  private buildPanel() {
    const depth = 30;

    this.panelBg = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x111122, 0.93)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth);

    this.panelTopBorder = this.scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_W, 2, 0xff8c00, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1);

    this.panelTitle = this.scene.add
      .text(PANEL_X + PANEL_W / 2, PANEL_Y + 14, "INVENTORY  [I]", {
        fontSize: "12px", color: "#ff8c00", fontStyle: "bold",
        fontFamily: "'Space Grotesk', monospace",
      })
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(depth + 1);

    const startX = PANEL_X + 10;
    const startY = PANEL_Y + 34;

    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const col  = i % GRID_COLS;
      const row  = Math.floor(i / GRID_COLS);
      const x    = startX + col * (SLOT_SIZE + SLOT_GAP);
      const y    = startY + row * (SLOT_SIZE + SLOT_GAP);
      const slot = new SlotGfx(this.scene, x, y, SLOT_SIZE, depth + 1);
      slot.setInteractive(() => this.onGridClick(i));
      this.gridSlots.push(slot);
    }

    this.selectedHint = this.scene.add
      .text(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 10, "", {
        fontSize: "11px", color: "#aaaaaa",
      })
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(depth + 1);

    this.setPanelVisible(false);
  }

  private togglePanel() {
    this.panelOpen = !this.panelOpen;
    this.setPanelVisible(this.panelOpen);
    if (this.panelOpen) this.refreshGrid();
  }

  private setPanelVisible(v: boolean) {
    this.panelBg.setVisible(v);
    this.panelTopBorder.setVisible(v);
    this.panelTitle.setVisible(v);
    this.selectedHint.setVisible(v);
    for (const s of this.gridSlots) s.setVisible(v);
    if (!v) this.selectedGridSlot = -1;
  }

  private onGridClick(i: number) {
    if (!this.panelOpen) return;
    const slot = this.gridSlots[i];
    if (!slot.itemId) return;

    if (this.selectedGridSlot === i) {
      // Second click on same slot → eat
      this.eatFromSlot(slot.itemId);
      this.selectedGridSlot = -1;
    } else {
      this.selectedGridSlot = i;
    }
    this.refreshGrid();
  }

  private eatFromSlot(itemId: string) {
    const def = ITEM_MAP[itemId];
    if (!def?.eatable) return;
    const count = this.inventory.get(itemId) ?? 0;
    if (count <= 0) return;
    this.inventory.set(itemId, count - 1);
    if (this.room) this.room.send("eat", { itemId });
    this.refresh();
  }

  private refreshGrid() {
    for (let i = 0; i < this.gridSlots.length; i++) {
      const def   = ITEM_DEFS[i] ?? null;
      const count = def ? (this.inventory.get(def.id) ?? 0) : 0;
      this.gridSlots[i].draw(def, count, i === this.selectedGridSlot);
    }

    const sel = this.selectedGridSlot;
    if (sel >= 0) {
      const slot = this.gridSlots[sel];
      const def  = slot.itemId ? ITEM_MAP[slot.itemId] : null;
      if (def?.eatable) {
        this.selectedHint.setText(`[E] Zjedz ${def.name}`);
      } else if (def) {
        this.selectedHint.setText(def.name + " — nie można zjeść");
      } else {
        this.selectedHint.setText("");
      }
    } else {
      this.selectedHint.setText("Kliknij slot aby wybrać");
    }
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  private bindKeys() {
    const kb    = this.scene.input.keyboard!;
    const KC    = Phaser.Input.Keyboard.KeyCodes;
    this.keyI   = kb.addKey(KC.I);
    this.keyE   = kb.addKey(KC.E);
    this.keys18 = [
      kb.addKey(KC.ONE), kb.addKey(KC.TWO),   kb.addKey(KC.THREE),
      kb.addKey(KC.FOUR), kb.addKey(KC.FIVE),  kb.addKey(KC.SIX),
      kb.addKey(KC.SEVEN), kb.addKey(KC.EIGHT),
    ];
  }
}
