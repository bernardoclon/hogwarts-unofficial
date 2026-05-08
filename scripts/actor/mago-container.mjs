/**
 * Hoja de Actor para Contenedores (Baúles) en el sistema Hogwarts.
 * Permite almacenar objetos y transferirlos a magos.
 */
export class MagoContainerSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hogwarts", "sheet", "actor", "container"],
      template: "systems/hogwarts/templates/actor/container.hbs",
      width: 450,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "contents" }]
    });
  }

  /** @override */
  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    context.isGM = game.user.isGM;

    // Filtramos los items para que no aparezcan mezclados en la misma lista
    context.inventory = context.items.filter(i => i.type === "objeto_magico");
    context.spells = context.items.filter(i => i.type === "hechizo");

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Solo dueños o GMs pueden editar contenido
    if (!this.options.editable) return;

    // Crear, editar y borrar objetos
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
    });

    // Botón de "Recoger" para transferir al personaje del usuario
    html.find('.item-take').click(this._onItemTake.bind(this));

    // Habilitar Drag & Drop con metadatos de origen
    html.find('.item').each((i, li) => {
      if (li.classList.contains("items-list-header")) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", this._onDragStart.bind(this), false);
    });
  }

  /**
   * Al empezar el arrastre, marcamos el ID del contenedor para borrar el objeto si se suelta en otro actor.
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    const item = this.actor.items.get(li.dataset.itemId);
    if (!item) return;

    const itemData = item.toObject();
    // Limpiamos IDs para que Foundry lo trate como creación nueva en el destino
    delete itemData._id;

    const dragData = {
      type: "Item",
      data: itemData,
      uuid: item.uuid,
      flags: {
        hogwarts: {
          sourceContainerId: this.actor.uuid,
          sourceItemId: item.id
        }
      }
    };

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type || "objeto_magico";
    const typeName = game.i18n.localize(`TYPES.Item.${type}`);

    const itemData = {
      name: game.i18n.format("HOGWARTS.NewItem", {name: typeName}),
      type: type,
      system: {}
    };

    // Si es un hechizo, inicializamos el nivel por defecto
    if (type === "hechizo") itemData.system.level = 1;

    return await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Lógica de transferencia directa mediante botón
   */
  async _onItemTake(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    
    // Buscamos actores tipo 'mago' que el usuario controle
    const targets = game.actors.filter(a => a.type === "mago" && a.isOwner);

    if (targets.length === 0) return ui.notifications.warn("No tienes ningún mago disponible para recibir este objeto.");
    if (targets.length === 1) return this._transferItem(item, targets[0]);

    // Si hay varios, preguntar a quién
    let content = `<form><div class="form-group"><label>Selecciona el mago:</label><select name="target">`;
    for (let actor of targets) content += `<option value="${actor.id}">${actor.name}</option>`;
    content += `</select></div></form>`;

    new Dialog({
      title: "Recoger Objeto",
      content: content,
      buttons: {
        take: {
          icon: '<i class="fas fa-hand-paper"></i>',
          label: "Recoger",
          callback: (html) => this._transferItem(item, game.actors.get(html.find('[name="target"]').val()))
        }
      },
      default: "take"
    }).render(true);
  }

  async _transferItem(item, targetActor) {
    const itemData = item.toObject();
    delete itemData._id;
    await targetActor.createEmbeddedDocuments("Item", [itemData]);
    await this.actor.deleteEmbeddedDocuments("Item", [item.id]);
    ui.notifications.info(`${item.name} recogido por ${targetActor.name}.`);
  }
}

// --- Hooks para gestionar el "Movimiento" (Borrar del origen al crear en destino) ---
Hooks.on("createItem", async (item, options, userId) => {
  if (userId !== game.user.id) return;
  
  // Recuperamos la información de origen de los flags del objeto creado (si venía de un Drag)
  // Nota: Si el sistema base no pasa flags en el drop, esta lógica puede requerir ajuste en _onDrop del Actor principal.
  const sourceContainerId = item.flags?.hogwarts?.sourceContainerId;
  const sourceItemId = item.flags?.hogwarts?.sourceItemId;

  if (sourceContainerId && sourceItemId) {
    const sourceActor = await fromUuid(sourceContainerId);
    if (sourceActor) await sourceActor.deleteEmbeddedDocuments("Item", [sourceItemId]);
  }
});