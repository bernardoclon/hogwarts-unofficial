/**
 * Map of progress types to their labels and images.
 * NOTE: You will need to create these images in the specified paths.
 */
const PROGRESS_TYPES = {
  none: {
    label: "HOGWARTS.ProgressNone",
    img: "icons/svg/mystery-man.svg"
  },
  increaseTrait: {
    label: "HOGWARTS.ProgressIncreaseTrait",
    img: "systems/hogwarts/art/progress/trait.png"
  },
  secondSubject: {
    label: "HOGWARTS.ProgressSecondSubject",
    img: "systems/hogwarts/art/progress/subject.png"
  },
  newSpell: {
    label: "HOGWARTS.ProgressNewSpell",
    img: "systems/hogwarts/art/progress/spell.png"
  },
  newItem: {
    label: "HOGWARTS.ProgressNewItem",
    img: "systems/hogwarts/art/progress/item.png"
  },
  recoverLuck: {
    label: "HOGWARTS.ProgressRecoverLuck",
    img: "systems/hogwarts/art/progress/luck.png"
  }
};

/**
 * Extiende la clase ItemSheet básica de Foundry para implementar la lógica del sistema Hogwarts.
 * @extends {ItemSheet}
 */
export class HogwartsItemSheet extends ItemSheet {

  constructor(object, options = {}) {
    super(object, options);

    // Agregar el tipo de item (ej. "progreso", "hechizo") a las clases CSS de la ventana
    this.options.classes.push(this.item.type);

    // Definir tamaños específicos según el tipo de objeto
    if (this.item.type === "progreso") {
      this.options.width = 475;
      this.options.height = 210;
      this.position.width = 475;
      this.position.height = 210;
    }
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hogwarts", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/hogwarts/templates/items";
    // Devuelve templates/items/item-tipo-sheet.hbs
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = await super.getData();
    context.system = this.item.system;

    // Enriquecer la descripción para el editor (permite enlaces, secretos, estilos)
    context.enrichedDescription = await TextEditor.enrichHTML(this.item.system.description, {async: true});

    // Logic specific to 'progreso' items
    if (this.item.type === 'progreso') {
      context.progressTypes = PROGRESS_TYPES;
      const progressTypeInfo = PROGRESS_TYPES[context.system.progressType];

      // Lista de rasgos para el selector
      context.traits = {
        bravery: "HOGWARTS.Bravery",
        cunning: "HOGWARTS.Cunning",
        intellect: "HOGWARTS.Intellect",
        loyalty: "HOGWARTS.Loyalty",
        magic: "HOGWARTS.Magic"
      };

      // Mostrar selector solo si es del tipo "Aumenta un rasgo"
      context.hasTraitSelection = context.system.progressType === 'increaseTrait';

      // We are overriding the item name and image for display purposes in the sheet.
      // The actual update happens in _updateObject.
      if (progressTypeInfo) {
        context.item.name = game.i18n.localize(progressTypeInfo.label);
        context.item.img = progressTypeInfo.img;
      }
    }

    return context;
  }

  /** @override */
  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (this.item.type === 'progreso' && expanded.system?.progressType) {
      
      // Validar límites si el item pertenece a un Actor
      if (this.item.actor) {
        const newType = expanded.system.progressType;
        // Contamos cuántos items de este tipo ya tiene el actor (excluyendo el que estamos editando)
        const existingCount = this.item.actor.items.filter(i => 
          i.type === 'progreso' && i.system.progressType === newType && i.id !== this.item.id
        ).length;

        if (newType === 'increaseTrait' && existingCount >= 2) {
          ui.notifications.warn(game.i18n.localize("HOGWARTS.WarnMaxIncreaseTrait"));
          return; // Cancelar la actualización
        }

        if (newType === 'secondSubject' && existingCount >= 1) {
          ui.notifications.warn(game.i18n.localize("HOGWARTS.WarnMaxSecondSubject"));
          return; // Cancelar la actualización
        }
      }

      const typeInfo = PROGRESS_TYPES[expanded.system.progressType];
      if (typeInfo) {
        formData["name"] = game.i18n.localize(typeInfo.label);
        formData["img"] = typeInfo.img;
      }
    }
    return super._updateObject(event, formData);
  }
}