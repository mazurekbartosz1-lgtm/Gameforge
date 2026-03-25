import { type Room } from "colyseus.js";
import { ITEM_DEFS, ITEM_MAP, getItemDef, type ItemDef } from "./itemConfig";

// Layout constants
const SLOT_SIZE   = 44;
const SLOT_GAP    = 4;
const HOTBAR_COLS = 8;
const GRID_COLS   = 5;
const GRID_ROWS   = 6;
const CANVAS_W    = 800;
const CANVAS_H    = 600;

const HOTBAR_Y = CANVAS_H - SLOT_SIZE - 8;
const HOTBAR_X = (CANVAS_W - (HOTBAR_COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP)) / 2;

const PANEL_W    = GRID_COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP + 20;
const ACTION_H   = 28;
const PANEL_H    = GRID_ROWS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP + 44 + ACTION_H + 8;
const PANEL_X    = (CANVAS_W - PANEL_W) / 2;
const PANEL_Y    = (CANVAS_H - PANEL_H) / 2;

// ── Info modal (side panel) ────────────────────────────────────────────────
const INFO_W    = 162;
const INFO_H    = PANEL_H;
const INFO_X    = PANEL_X + PANEL_W + 8;
const INFO_Y    = PANEL_Y;

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
  private equipment: Record<string, string> = {};

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

  // Action buttons
  private destroyBg!:    Phaser.GameObjects.Rectangle;
  private destroyLabel!: Phaser.GameObjects.Text;
  private dropBg!:       Phaser.GameObjects.Rectangle;
  private dropLabel!:    Phaser.GameObjects.Text;

  // Info modal
  private infoBg!:          Phaser.GameObjects.Rectangle;
  private infoBorder!:      Phaser.GameObjects.Rectangle;
  private infoTitle!:       Phaser.GameObjects.Text;
  private infoIconBg!:      Phaser.GameObjects.Graphics;
  private infoIconLabel!:   Phaser.GameObjects.Text;
  private infoName!:        Phaser.GameObjects.Text;
  private infoRarity!:      Phaser.GameObjects.Text;
  private infoStat!:        Phaser.GameObjects.Text;
  private infoStatVal!:     Phaser.GameObjects.Text;
  private infoSep!:         Phaser.GameObjects.Graphics;
  private infoCompHeader!:  Phaser.GameObjects.Text;
  private infoCompName!:    Phaser.GameObjects.Text;
  private infoCompDiff!:    Phaser.GameObjects.Text;
  private infoActionHint!:  Phaser.GameObjects.Text;

  // Keys
  private keyI!:   Phaser.Input.Keyboard.Key;
  private keyE!:   Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
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

  /** Update currently equipped items (called on stats_update from server). */
  updateEquipment(eq: Record<string, string>) {
    this.equipment = eq;
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

    if (this.panelOpen && Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.togglePanel();
      return false;
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
          const def = getItemDef(slot.itemId);
          if (def?.equippable) {
            this.equipFromSlot(slot.itemId);
          } else {
            this.eatFromSlot(slot.itemId);
          }
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

    // ── Action buttons ──
    const btnY    = PANEL_Y + PANEL_H - ACTION_H - 26;
    const btnW    = (PANEL_W - 20 - 6) / 2;   // two buttons with 6px gap, 10px padding each side
    const btnX1   = PANEL_X + 10;
    const btnX2   = btnX1 + btnW + 6;

    this.destroyBg = this.scene.add
      .rectangle(btnX1, btnY, btnW, ACTION_H, 0x4a1010, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1)
      .setStrokeStyle(1, 0x992222)
      .setInteractive({ useHandCursor: true });
    this.destroyBg.on("pointerdown", () => this.onDestroyClick());
    this.destroyBg.on("pointerover",  () => this.destroyBg.setFillStyle(0x6a1818));
    this.destroyBg.on("pointerout",   () => this.destroyBg.setFillStyle(0x4a1010));

    this.destroyLabel = this.scene.add
      .text(btnX1 + btnW / 2, btnY + ACTION_H / 2, "🗑 ZNISZCZ", {
        fontSize: "10px", color: "#ff6666", fontStyle: "bold",
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    this.dropBg = this.scene.add
      .rectangle(btnX2, btnY, btnW, ACTION_H, 0x0a1a2e, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1)
      .setStrokeStyle(1, 0x224466)
      .setInteractive({ useHandCursor: true });
    this.dropBg.on("pointerdown", () => this.onDropClick());
    this.dropBg.on("pointerover",  () => this.dropBg.setFillStyle(0x152a42));
    this.dropBg.on("pointerout",   () => this.dropBg.setFillStyle(0x0a1a2e));

    this.dropLabel = this.scene.add
      .text(btnX2 + btnW / 2, btnY + ACTION_H / 2, "📦 WYRZUĆ", {
        fontSize: "10px", color: "#4488bb", fontStyle: "bold",
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    this.buildInfoModal(depth);
    this.setPanelVisible(false);
  }

  private buildInfoModal(depth: number) {
    const cx = INFO_X + INFO_W / 2;

    this.infoBg = this.scene.add
      .rectangle(INFO_X, INFO_Y, INFO_W, INFO_H, 0x0d0e20, 0.97)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth)
      .setStrokeStyle(1, 0x22233e);

    this.infoBorder = this.scene.add
      .rectangle(INFO_X, INFO_Y, INFO_W, 2, 0xff8c00, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoTitle = this.scene.add
      .text(cx, INFO_Y + 14, "ITEM INFO", {
        fontSize: "9px", color: "#46465b", fontStyle: "bold",
        fontFamily: "'Space Grotesk', monospace", letterSpacing: 3,
      })
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(depth + 1);

    // Icon circle
    this.infoIconBg = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth + 1);

    this.infoIconLabel = this.scene.add
      .text(cx, INFO_Y + 64, "", {
        fontSize: "32px", color: "#ffffff",
      })
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(depth + 2);

    this.infoName = this.scene.add
      .text(cx, INFO_Y + 108, "", {
        fontSize: "13px", color: "#e4e3fe", fontStyle: "bold",
        fontFamily: "'Space Grotesk', monospace", align: "center",
        wordWrap: { width: INFO_W - 16 },
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoRarity = this.scene.add
      .text(cx, INFO_Y + 130, "", {
        fontSize: "8px", color: "#ffffff", fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoStat = this.scene.add
      .text(INFO_X + 12, INFO_Y + 150, "", {
        fontSize: "9px", color: "#46465b", fontStyle: "bold", letterSpacing: 1,
      })
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoStatVal = this.scene.add
      .text(INFO_X + INFO_W - 12, INFO_Y + 150, "", {
        fontSize: "18px", color: "#ff8c00", fontStyle: "bold",
        fontFamily: "'Space Grotesk', monospace",
      })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoSep = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(depth + 1);

    this.infoCompHeader = this.scene.add
      .text(INFO_X + 12, INFO_Y + 182, "VS EQUIPPED", {
        fontSize: "8px", color: "#46465b", fontStyle: "bold", letterSpacing: 2,
      })
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoCompName = this.scene.add
      .text(INFO_X + 12, INFO_Y + 196, "", {
        fontSize: "10px", color: "#888899",
      })
      .setOrigin(0, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoCompDiff = this.scene.add
      .text(cx, INFO_Y + 214, "", {
        fontSize: "20px", color: "#44ff88", fontStyle: "bold",
        fontFamily: "'Space Grotesk', monospace",
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 1);

    this.infoActionHint = this.scene.add
      .text(cx, INFO_Y + INFO_H - 12, "", {
        fontSize: "10px", color: "#ff8c00", fontStyle: "bold",
      })
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(depth + 1);
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
    this.destroyBg.setVisible(v);
    this.destroyLabel.setVisible(v);
    this.dropBg.setVisible(v);
    this.dropLabel.setVisible(v);
    for (const s of this.gridSlots) s.setVisible(v);
    if (!v) {
      this.selectedGridSlot = -1;
      this.setInfoVisible(false);
    }
  }

  private setInfoVisible(v: boolean) {
    this.infoBg.setVisible(v);
    this.infoBorder.setVisible(v);
    this.infoTitle.setVisible(v);
    this.infoIconBg.setVisible(v);
    this.infoIconLabel.setVisible(v);
    this.infoName.setVisible(v);
    this.infoRarity.setVisible(v);
    this.infoStat.setVisible(v);
    this.infoStatVal.setVisible(v);
    this.infoSep.setVisible(v);
    this.infoCompHeader.setVisible(v);
    this.infoCompName.setVisible(v);
    this.infoCompDiff.setVisible(v);
    this.infoActionHint.setVisible(v);
  }

  private onDestroyClick() {
    if (this.selectedGridSlot < 0) return;
    const slot = this.gridSlots[this.selectedGridSlot];
    if (!slot.itemId) return;
    const itemId = slot.itemId;
    const count  = this.inventory.get(itemId) ?? 0;
    if (count <= 0) return;
    // Remove one from local inventory
    if (count === 1) this.inventory.delete(itemId);
    else this.inventory.set(itemId, count - 1);
    this.selectedGridSlot = -1;
    if (this.room) this.room.send("destroy_item", { itemId });
    this.refresh();
  }

  private onDropClick() {
    if (this.selectedGridSlot < 0) return;
    const slot = this.gridSlots[this.selectedGridSlot];
    if (!slot.itemId) return;
    const itemId = slot.itemId;
    const count  = this.inventory.get(itemId) ?? 0;
    if (count <= 0) return;
    if (count === 1) this.inventory.delete(itemId);
    else this.inventory.set(itemId, count - 1);
    this.selectedGridSlot = -1;
    if (this.room) this.room.send("drop_item", { itemId });
    this.refresh();
  }

  private onGridClick(i: number) {
    if (!this.panelOpen) return;
    const slot = this.gridSlots[i];
    if (!slot.itemId) return;

    if (this.selectedGridSlot === i) {
      // Second click on same slot → action
      const def = getItemDef(slot.itemId);
      if (def?.equippable) {
        this.equipFromSlot(slot.itemId);
      } else {
        this.eatFromSlot(slot.itemId);
      }
      this.selectedGridSlot = -1;
    } else {
      this.selectedGridSlot = i;
    }
    this.refreshGrid();
  }

  private eatFromSlot(itemId: string) {
    const def = getItemDef(itemId);
    if (!def?.eatable) return;
    const count = this.inventory.get(itemId) ?? 0;
    if (count <= 0) return;
    this.inventory.set(itemId, count - 1);
    if (this.room) this.room.send("eat", { itemId });
    this.refresh();
  }

  private equipFromSlot(itemId: string) {
    const def = getItemDef(itemId);
    if (!def?.equippable) return;
    const count = this.inventory.get(itemId) ?? 0;
    if (count <= 0) return;
    this.inventory.set(itemId, count - 1);
    if (this.room) this.room.send("equip_item", { itemId });
    this.refresh();
  }

  private refreshGrid() {
    // Build ordered list: resources first (fixed order), then gear from actual inventory
    const resourceIds = ITEM_DEFS.filter(d => !d.equippable).map(d => d.id);
    const entries: Array<{ id: string; qty: number }> = [];
    // Resources in fixed order
    for (const id of resourceIds) {
      const qty = this.inventory.get(id) ?? 0;
      if (qty > 0) entries.push({ id, qty });
    }
    // Gear: all equipped-type items from inventory (includes elemental variants)
    this.inventory.forEach((qty, id) => {
      if (qty > 0 && !resourceIds.includes(id)) entries.push({ id, qty });
    });

    for (let i = 0; i < this.gridSlots.length; i++) {
      if (i < entries.length) {
        const { id, qty } = entries[i];
        const def = getItemDef(id) ?? null;
        this.gridSlots[i].draw(def, qty, i === this.selectedGridSlot);
      } else {
        this.gridSlots[i].draw(null, 0, i === this.selectedGridSlot);
      }
    }

    const sel = this.selectedGridSlot;
    if (sel >= 0) {
      const slot = this.gridSlots[sel];
      const def  = slot.itemId ? (getItemDef(slot.itemId) ?? null) : null;
      this.updateInfoModal(def);
    } else {
      this.setInfoVisible(false);
    }
  }

  private updateInfoModal(def: ItemDef | null) {
    if (!def) { this.setInfoVisible(false); return; }
    this.setInfoVisible(true);

    const cx = INFO_X + INFO_W / 2;
    const rarityColor = def.rarity === "rare" ? "#FFD700"
      : def.rarity === "uncommon" ? "#44ff88"
      : def.equippable ? "#ffffff" : "#aaaaaa";

    // Icon circle
    const iconY = INFO_Y + 64;
    this.infoIconBg.clear();
    const col = Phaser.Display.Color.HexStringToColor(def.color);
    this.infoIconBg.fillStyle(col.color, 0.25);
    this.infoIconBg.fillCircle(cx, iconY, 36);
    this.infoIconBg.lineStyle(2, col.color, 0.7);
    this.infoIconBg.strokeCircle(cx, iconY, 36);
    this.infoIconLabel.setPosition(cx, iconY).setText(def.symbol).setStyle({ color: def.color });

    // Name & rarity
    this.infoName.setText(def.name).setStyle({ color: rarityColor });
    this.infoRarity.setText(def.rarity ? def.rarity.toUpperCase() : "")
      .setStyle({ color: rarityColor });

    // Stat line
    this.infoSep.clear();
    this.infoSep.lineStyle(1, 0x22233e, 1);
    this.infoSep.lineBetween(INFO_X + 12, INFO_Y + 176, INFO_X + INFO_W - 12, INFO_Y + 176);

    if (def.equippable) {
      const isAtk = (def.attackBonus ?? 0) > 0;
      this.infoStat.setText(isAtk ? "ATAK" : "OBRONA");
      this.infoStatVal
        .setText(`+${isAtk ? def.attackBonus : def.defenseBonus}`)
        .setStyle({ color: isAtk ? "#ff8c00" : "#00e3fd" });

      // Comparison
      const equippedId  = def.equipSlot ? this.equipment[def.equipSlot] : undefined;
      const equippedDef = equippedId ? (getItemDef(equippedId) ?? null) : null;
      this.infoCompHeader.setVisible(true);
      if (equippedDef) {
        const newVal      = def.attackBonus ?? def.defenseBonus ?? 0;
        const equippedVal = equippedDef.attackBonus ?? equippedDef.defenseBonus ?? 0;
        const diff        = newVal - equippedVal;
        const arrow       = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
        const diffColor   = diff > 0 ? "#44ff88" : diff < 0 ? "#ff6666" : "#aaaaaa";
        this.infoCompName.setText(equippedDef.name).setVisible(true);
        this.infoCompDiff
          .setText(`${arrow} ${diff > 0 ? "+" : ""}${diff}`)
          .setStyle({ color: diffColor, fontSize: "20px" })
          .setVisible(true);
      } else {
        this.infoCompName.setText("(brak)").setStyle({ color: "#334455" }).setVisible(true);
        this.infoCompDiff.setText("NOWY SLOT").setStyle({ color: "#44ff88", fontSize: "12px" }).setVisible(true);
      }
      this.infoActionHint.setText("[E] Ekwipuj").setStyle({ color: "#ff8c00" });

    } else if (def.eatable) {
      this.infoStat.setText("JEDZENIE");
      this.infoStatVal.setText(`+${def.id === "mushroom" ? 15 : def.id === "berries" ? 20 : def.id === "raw_meat" ? 10 : def.id === "cooked_meat" ? 40 : 30} GŁÓD`)
        .setStyle({ color: "#fb923c" });
      this.infoCompHeader.setVisible(false);
      this.infoCompName.setVisible(false);
      this.infoCompDiff.setVisible(false);
      this.infoActionHint.setText("[E] Zjedz").setStyle({ color: "#fb923c" });

    } else {
      this.infoStat.setText("MATERIAŁ");
      this.infoStatVal.setText("").setStyle({ color: "#aaaaaa" });
      this.infoCompHeader.setVisible(false);
      this.infoCompName.setVisible(false);
      this.infoCompDiff.setVisible(false);
      this.infoActionHint.setText("").setStyle({ color: "#aaaaaa" });
    }
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  private bindKeys() {
    const kb    = this.scene.input.keyboard!;
    const KC    = Phaser.Input.Keyboard.KeyCodes;
    this.keyI   = kb.addKey(KC.I);
    this.keyE   = kb.addKey(KC.E);
    this.keyEsc = kb.addKey(KC.ESC);
    this.keys18 = [
      kb.addKey(KC.ONE), kb.addKey(KC.TWO),   kb.addKey(KC.THREE),
      kb.addKey(KC.FOUR), kb.addKey(KC.FIVE),  kb.addKey(KC.SIX),
      kb.addKey(KC.SEVEN), kb.addKey(KC.EIGHT),
    ];
  }
}
