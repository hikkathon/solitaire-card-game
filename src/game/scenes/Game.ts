import { ASSET_KEYS } from '../constants/assets';
import { GameEvents } from '../constants/events';
import { CARD_HEIGHT, CARD_WIDTH } from '../constants/game';
import { SCENE_KEYS } from '../constants/scenes';
import { EventBus } from '../core/event-bus';
import { BaseScene } from './BaseScene';

const DEBUG = true;
const SCALE = 0.5;
const CARD_BACK_FRAME = 'back';
const SUIT_FRAMES = {
  CLUB: 'clubs',
  DIAMOND: 'diamonds',
  HEART: 'hearts',
  SPADE: 'spades',
} as const;

const FOUNDATION_PILE_X_POSITIONS = [360, 440, 520, 600];
const FOUNDATION_PILE_Y_POSITION = 5;
const DISCARD_PILE_POSITION = {
  X: 90,
  Y: 5,
};
const DRAW_PILE_POSITION = {
  X: 5,
  Y: 5,
};
const TABLEAU_PILE_POSITION = {
  X: 40,
  Y: 92,
};

export class Game extends BaseScene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;

  #drawPileCards!: Phaser.GameObjects.Image[];
  #discardPileCards!: Phaser.GameObjects.Image[];
  #foundationPileCards!: Phaser.GameObjects.Image[];
  #tableauContainers!: Phaser.GameObjects.Container[];

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create(): void {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x00ff00);

    this.#createDrawPile();
    this.#createDiscardPile();
    this.#createFundationPiles();
    this.#createTableauPiles();
    this.#createDragEvents();

    super.create();

    EventBus.emit(GameEvents.SCENE.READY, this);
  }

  changeScene(): void {
    this.scene.start(SCENE_KEYS.GAME_OVER);
  }

  override refreshLayout(): void {
    if (!this.background) return;

    this.setBackgroundCover(this.background);
  }

  #createDrawPile(): void {
    const cardPositionMultiplierOffsetX = 2.5;

    this.#drawCardLocationBox(DRAW_PILE_POSITION.X, DRAW_PILE_POSITION.Y);

    this.#drawPileCards = [];

    for (let i = 0; i < 3; i++) {
      this.#drawPileCards.push(
        this.#createCard(DRAW_PILE_POSITION.X + i * cardPositionMultiplierOffsetX, DRAW_PILE_POSITION.Y, false)
      );
    }

    const drawZone = this.add
      .zone(DRAW_PILE_POSITION.X, DRAW_PILE_POSITION.Y, CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE)
      .setOrigin(0)
      .setInteractive();

    drawZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.#discardPileCards[0]
        .setFrame(this.#discardPileCards[1].frame)
        .setVisible(this.#discardPileCards[1].visible)
        .setOrigin(0);
      this.#discardPileCards[1].setFrame(CARD_BACK_FRAME).setVisible(true).setOrigin(0);
    });

    if (DEBUG) {
      this.add.rectangle(drawZone.x, drawZone.y, drawZone.width, drawZone.height, 0xf40bbd, 0.5).setOrigin(0);
    }
  }

  #drawCardLocationBox(x: number, y: number): void {
    this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT).setOrigin(0).setStrokeStyle(8, 0xffffff, 1).setScale(SCALE);
  }

  #createCard(
    x: number,
    y: number,
    draggable: boolean,
    cardIndex?: number,
    pileIndex?: number
  ): Phaser.GameObjects.Image {
    const suit = 'clubs';
    const rank = '10';
    const frameName = `${suit}${rank}`;

    const card = this.add
      .sprite(x, y, ASSET_KEYS.CARDS, CARD_BACK_FRAME)
      .setOrigin(0)
      .setScale(SCALE)
      .setInteractive({ draggable: draggable })
      .setData({ x, y, cardIndex, pileIndex });

    return card;
  }

  #createDiscardPile(): void {
    this.#drawCardLocationBox(DISCARD_PILE_POSITION.X, DISCARD_PILE_POSITION.Y);

    this.#discardPileCards = [];

    const bottomCard = this.#createCard(DISCARD_PILE_POSITION.X, DISCARD_PILE_POSITION.Y, true).setVisible(false);
    const topCard = this.#createCard(DISCARD_PILE_POSITION.X, DISCARD_PILE_POSITION.Y, true).setVisible(false);

    this.#discardPileCards.push(bottomCard, topCard);
  }

  #createFundationPiles(): void {
    this.#foundationPileCards = [];

    FOUNDATION_PILE_X_POSITIONS.forEach(x => {
      this.#drawCardLocationBox(x, FOUNDATION_PILE_Y_POSITION);
      const card = this.#createCard(x, FOUNDATION_PILE_Y_POSITION, false).setVisible(false);
      this.#foundationPileCards.push(card);
    });
  }

  #createTableauPiles(): void {
    this.#tableauContainers = [];
    const tableauPilePositionOffsetY = 50;
    const tableauPilePositionOffsetX = 25;
    const cardPositionOffsetY = 19;

    for (let i = 0; i < 7; i++) {
      const x = TABLEAU_PILE_POSITION.X + i * 80;

      const tableauContainer = this.add.container(
        x + tableauPilePositionOffsetX,
        TABLEAU_PILE_POSITION.Y + tableauPilePositionOffsetY,
        []
      );

      this.#tableauContainers.push(tableauContainer);

      for (let j = 0; j <= i; j++) {
        const cardGameObject = this.#createCard(0, j * cardPositionOffsetY, true, j, i);
        tableauContainer.add(cardGameObject);
      }
    }
  }

  #createDragEvents(): void {
    this.#createDragStartEventListener();
    this.#createDragEventListener();
    this.#createDragEndEventListener();
  }

  #createDragStartEventListener(): void {
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        gameObject.setData({ originPosX: gameObject.x, originPosY: gameObject.y });

        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;

        if (tableauPileIndex !== undefined) {
          this.#tableauContainers[tableauPileIndex].setDepth(2);
        } else {
          gameObject.setDepth(2);
        }

        gameObject.setAlpha(0.8);
      }
    );
  }

  #createDragEventListener(): void {
    this.input.on(
      Phaser.Input.Events.DRAG,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
        gameObject.setPosition(dragX, dragY);

        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
        const cardIndex = gameObject.getData('cardIndex') as number;

        if (tableauPileIndex !== undefined) {
          const numberOfCardsToMove = this.#getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex, cardIndex);

          for (let i = 1; i <= numberOfCardsToMove; i++) {
            this.#tableauContainers[tableauPileIndex]
              .getAt<Phaser.GameObjects.Image>(cardIndex + i)
              .setPosition(dragX, dragY + 19 * i);
          }
        }
      }
    );
  }

  #createDragEndEventListener(): void {
    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
        const originPosX = gameObject.getData('originPosX') as number;
        const originPosY = gameObject.getData('originPosY') as number;

        if (tableauPileIndex !== undefined) {
          this.#tableauContainers[tableauPileIndex].setDepth(0);
        } else {
          gameObject.setDepth(0);
        }

        gameObject.setAlpha(1);
        gameObject.setPosition(originPosX, originPosY);

        const cardIndex = gameObject.getData('cardIndex') as number;

        if (tableauPileIndex !== undefined) {
          const numberOfCardsToMove = this.#getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex, cardIndex);

          for (let i = 1; i <= numberOfCardsToMove; i++) {
            const cardToMove = this.#tableauContainers[tableauPileIndex].getAt<Phaser.GameObjects.Image>(cardIndex + i);

            const originPosX = gameObject.getData('originPosX') as number;
            const originPosY = gameObject.getData('originPosY') as number;

            cardToMove.setPosition(originPosX, originPosY + 19 * i);
          }
        }
      }
    );
  }

  #getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex: number, cardIndex: number): number {
    if (tableauPileIndex !== undefined) {
      const lastCardIndex = this.#tableauContainers[tableauPileIndex].length - 1;
      return lastCardIndex - cardIndex;
    }

    return 0;
  }
}
