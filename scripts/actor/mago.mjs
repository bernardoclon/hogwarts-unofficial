export class MagoSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["hogwarts", "sheet", "actor"],
      width: 800,
      height: 880,
      tabs: [
        { navSelector: ".tabs[data-group='primary']", contentSelector: ".content-body", initial: "social" },
        { navSelector: ".tabs[data-group='spells']", contentSelector: ".content-body", initial: "curso1" }
      ],
      scrollY: [".sidebar", ".content-body"]
    });
  }

  /** @override */
  get template() {
    // Obtiene el modo de la hoja (main, spells, quidditch) desde las flags, por defecto 'main'
    const mode = this.actor.getFlag("hogwarts", "sheetMode") || "main";
    // Excepción para la hoja de la copa que está en una ruta distinta
    if (mode === "cup") return "systems/hogwarts/templates/cup.hbs";
    return `systems/hogwarts/templates/actor/mago-${mode}.hbs`;
  }

  /** @override */
  async getData() {
    const context = await super.getData();
    const actorData = context.actor.system;

    context.system = actorData;
    context.flags = context.actor.flags;

    // Pasamos el modo actual al template para activar el botón correcto en el header
    context.sheetMode = this.actor.getFlag("hogwarts", "sheetMode") || "main";

    // Filtramos los items para mostrar solo "objeto_magico" en la pestaña de objetos
    context.inventory = context.items.filter(i => i.type === "objeto_magico");

    // Filtramos los items para mostrar solo "progreso" en la pestaña de progreso
    context.progress = context.items.filter(i => i.type === "progreso");

    // Verificar si el mago tiene el progreso de "Segunda Asignatura"
    context.hasSecondSubject = context.progress.some(i => i.system.progressType === 'secondSubject');

    // Calcular bonificadores de rasgos basados en ítems de progreso
    context.traitBonuses = { bravery: 0, cunning: 0, intellect: 0, loyalty: 0, magic: 0 };

    if (context.progress) {
      context.progress.forEach(item => {
        if (item.system.progressType === 'increaseTrait' && item.system.selectedTrait) {
          const trait = item.system.selectedTrait;
          if (context.traitBonuses[trait] !== undefined) {
            context.traitBonuses[trait] += 1;
          }
        }
      });
    }

    // Definir el logo de la casa basado en la selección
    if (context.system.details.house) {
      context.houseLogo = `systems/hogwarts/art/casas/${context.system.details.house}.png`;
    }

    // Datos específicos para el modo Copa de las Casas
    if (context.sheetMode === "cup") {
        const points = game.settings.get("hogwarts", "housePoints");
        let max = -1;
        let winner = "default";
        
        for (const [house, score] of Object.entries(points)) {
            if (score > max && score > 0) {
                max = score;
                winner = house;
            } else if (score === max) {
                winner = "default";
            }
        }
        context.points = points;
        context.winner = winner;
    }

    // Preparamos los datos para la hoja de hechizos
    this._prepareSpellBook(context);

    return context;
  }

  /** @override */
  async _updateObject(event, formData) {
    // Validar que los rasgos no superen el valor de 3
    const traits = ["bravery", "cunning", "intellect", "loyalty", "magic"];
    for (const trait of traits) {
      const key = `system.traits.${trait}`;
      // Si el campo existe en el formulario y supera el límite, lo corregimos
      if (key in formData && Number(formData[key]) > 3) {
        formData[key] = 3;
      }
    }
    return super._updateObject(event, formData);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Listener para tirar dados al hacer click en el label del rasgo
    html.find('.sidebar .rollable').click(this._onRollTrait.bind(this));

    // Listeners para botones de navegación del header (Main, Spells, Quidditch)
    html.find(".nav-button").click(this._onSheetNavigation.bind(this));

    // Listener para validar rasgos (traits) y forzar el máximo de 3
    html.find(".sidebar input[name^='system.traits.']").change(event => {
      const input = event.currentTarget;
      if (Number(input.value) > 3) {
        input.value = 3;
      }
    });

    // Listener para comportamiento de grupo en Suerte y Experiencia
    html.find(".star-checkbox, .diamond-checkbox").click(this._onResourceCheck.bind(this));

    // Listener para expandir/colapsar descripción de items (Inventario y Hechizos)
    html.find(".item-name").click(this._onItemSummary.bind(this));

    if (!this.isEditable) return;

    // Crear Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Editar Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Borrar Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
    });
  }

  /**
   * Maneja el cambio de modo de la hoja (Main <-> Spells <-> Quidditch)
   * @param {Event} event 
   */
  async _onSheetNavigation(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const mode = button.dataset.sheetMode;

    // Guardamos el modo seleccionado en las flags del actor y re-renderizamos la hoja
    await this.actor.setFlag("hogwarts", "sheetMode", mode);
  }

  /**
   * Crea un nuevo item basado en el dataset del botón pulsado
   * @param {Event} event 
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Obtenemos el tipo de item (ej. "objeto_magico") del HTML
    const type = header.dataset.type;
    const typeName = game.i18n.localize(`TYPES.Item.${type}`);

    const itemData = {
      name: game.i18n.format("HOGWARTS.NewItem", {name: typeName}),
      type: type,
      system: {}
    };

    // Si es un hechizo, asignamos el nivel del tab correspondiente
    if (type === "hechizo") {
      const level = header.dataset.level || 1;
      itemData.system.level = parseInt(level);
    }

    if (type === "progreso") {
      itemData.img = "icons/svg/mystery-man.svg";
    }

    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Organiza los hechizos por nivel para la hoja de hechizos.
   * @param {Object} context El objeto de datos de la hoja.
   * @private
   */
  _prepareSpellBook(context) {
    const spells = {};

    // Inicializamos un objeto para agrupar hechizos por nivel (1-7 para cursos, 8 para maldiciones)
    for (let i = 1; i <= 8; i++) {
      spells[`level${i}`] = [];
    }

    for (let i of context.items) {
      if (i.type === 'hechizo') {
        const level = i.system.level;
        if (spells[`level${level}`]) {
          spells[`level${level}`].push(i);
        }
      }
    }
    context.spells = spells;
  }

  /** @override */
  async _onDrop(event) {
    // Recuperamos los datos del evento de arrastre
    const data = TextEditor.getDragEventData(event);

    // Solo nos interesa intervenir si se está arrastrando un Item
    if (data.type !== "Item") return super._onDrop(event);

    // Obtenemos el item que se está arrastrando
    const item = await Item.implementation.fromDropData(data);
    if (!item) return super._onDrop(event);

    // Validar límites para items de progreso antes de añadirlos
    if (item.type === 'progreso') {
      const progressType = item.system.progressType;
      const existingCount = this.actor.items.filter(i => i.type === 'progreso' && i.system.progressType === progressType).length;

      if (progressType === 'increaseTrait' && existingCount >= 2) {
        ui.notifications.warn(game.i18n.localize("HOGWARTS.WarnMaxIncreaseTrait"));
        return false; // Prevenir que se suelte el item
      }

      if (progressType === 'secondSubject' && existingCount >= 1) {
        ui.notifications.warn(game.i18n.localize("HOGWARTS.WarnMaxSecondSubject"));
        return false; // Prevenir que se suelte el item
      }
    }

    // Identificamos sobre qué pestaña o elemento se soltó el item
    const dropTarget = $(event.target).closest("[data-tab]");
    if (!dropTarget.length) return super._onDrop(event);

    const tabName = dropTarget.data("tab");

    // Mapa de validación: Nombre del Tab -> Nivel requerido
    const tabToLevel = {
      "curso1": 1,
      "curso2": 2,
      "curso3": 3,
      "curso4": 4,
      "curso5": 5,
      "curso6": 6,
      "curso7": 7,
      "maldiciones": 8
    };

    // Si se soltó en una pestaña que NO es de hechizos (ej. Inventario), dejamos pasar el evento
    if (tabToLevel[tabName] === undefined) return super._onDrop(event);

    // 1. Validar que sea del tipo "hechizo"
    if (item.type !== "hechizo") {
      ui.notifications.warn(game.i18n.localize("HOGWARTS.WarnNotASpell"));
      return false;
    }

    // 2. Validar que el nivel del hechizo coincida con el curso de la pestaña
    if (item.system.level !== tabToLevel[tabName]) {
      ui.notifications.warn(game.i18n.localize("HOGWARTS.WarnWrongLevel"));
      return false;
    }

    // Si todo es correcto, permitimos que Foundry procese el drop (crear u ordenar)
    return super._onDrop(event);
  }

  /**
   * Gestiona el lanzamiento de dados de rasgo con diálogo de configuración
   * @param {Event} event 
   */
  async _onRollTrait(event) {
    event.preventDefault();
    const label = event.currentTarget;
    const traitKey = label.dataset.trait;
    const traitLabel = label.innerText.trim();
    
    // Datos del actor
    const actorData = this.actor.system;
    const items = this.actor.items;
    const traitValue = actorData.traits[traitKey];

    // Calcular bonus del rasgo (items de progreso)
    let traitBonus = 0;
    items.forEach(i => {
      if (i.type === 'progreso' && i.system.progressType === 'increaseTrait' && i.system.selectedTrait === traitKey) {
        traitBonus += 1;
      }
    });

    // Listas para selectores
    const spells = items.filter(i => i.type === "hechizo");
    const objects = items.filter(i => i.type === "objeto_magico");

    // Condiciones y Penalizadores
    const conditions = actorData.conditions;
    const specificPenalties = {
      bravery: { key: 'afraid', label: 'HOGWARTS.Afraid', val: -2 },
      cunning: { key: 'angry', label: 'HOGWARTS.Angry', val: -2 },
      intellect: { key: 'stressed', label: 'HOGWARTS.Stressed', val: -2 },
      loyalty: { key: 'jealous', label: 'HOGWARTS.Jealous', val: -2 },
      magic: { key: 'embarrassed', label: 'HOGWARTS.Embarrassed', val: -2 }
    };

    let activeSpecific = null;
    if (specificPenalties[traitKey] && conditions[specificPenalties[traitKey].key]) {
      activeSpecific = specificPenalties[traitKey];
    }

    const isHurt = conditions.hurt;
    const isHexed = conditions.hexed;

    // Obtenemos la casa para estilizar el diálogo
    const house = this.actor.system.details.house || "gryffindor";

    // Contenido del Diálogo
    const dialogContent = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("HOGWARTS.Spells")}</label>
          <select name="spell"><option value="">${game.i18n.localize("HOGWARTS.None")}</option>${spells.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("HOGWARTS.Inventory")}</label>
          <select name="object"><option value="">${game.i18n.localize("HOGWARTS.None")}</option>${objects.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("HOGWARTS.Bonus")}</label>
          <input type="number" name="bonus" value="0"/>
        </div>
        <hr>
        ${activeSpecific ? `<div class="form-group"><label>${game.i18n.localize(activeSpecific.label)} (${activeSpecific.val})</label><input type="checkbox" checked disabled/></div>` : ''}
        ${isHurt ? `<div class="form-group"><label>${game.i18n.localize("HOGWARTS.Hurt")} (-1)</label><input type="checkbox" name="hurt" checked/></div>` : ''}
        ${isHexed ? `<div class="form-group"><label>${game.i18n.localize("HOGWARTS.Hexed")} (-1)</label><input type="checkbox" name="hexed"/></div>` : ''}
      </form>
    `;

    new Dialog({
      title: `${game.i18n.localize("HOGWARTS.Roll")}: ${traitLabel}`,
      content: dialogContent,
      buttons: {
        roll: {
          label: game.i18n.localize("HOGWARTS.Roll"),
          callback: async (html) => {
            const spellId = html.find('[name="spell"]').val();
            const objectId = html.find('[name="object"]').val();
            const manualBonus = Number(html.find('[name="bonus"]').val()) || 0;

            // Cálculo de modificadores
            let finalMod = traitValue + traitBonus + manualBonus;
            let appliedConditions = [];
            let conditionPenalty = 0;

            if (activeSpecific) { finalMod += activeSpecific.val; conditionPenalty += activeSpecific.val; appliedConditions.push(game.i18n.localize(activeSpecific.label)); }
            if (isHurt && html.find('[name="hurt"]').is(':checked')) { finalMod -= 1; conditionPenalty -= 1; appliedConditions.push(game.i18n.localize("HOGWARTS.Hurt")); }
            if (isHexed && html.find('[name="hexed"]').is(':checked')) { finalMod -= 1; conditionPenalty -= 1; appliedConditions.push(game.i18n.localize("HOGWARTS.Hexed")); }

            // Ejecutar tirada
            const roll = new Roll(`2d6 + ${finalMod}`);
            await roll.evaluate();

            // Determinar mensaje de resultado
            let resultLabel = "";
            let resultClass = "";
            if (roll.total >= 10) {
              resultLabel = game.i18n.localize("HOGWARTS.ResultSuccess");
              resultClass = "result-success";
            } else if (roll.total >= 7) {
              resultLabel = game.i18n.localize("HOGWARTS.ResultPartial");
              resultClass = "result-partial";
            } else {
              resultLabel = game.i18n.localize("HOGWARTS.ResultFailure");
              resultClass = "result-failure";
            }

            // Datos para el chat
            const spell = spells.find(s => s.id === spellId);
            const object = objects.find(o => o.id === objectId);
            const diceIcons = roll.dice[0].results.map(r => `<i class="fas fa-dice-${['one','two','three','four','five','six'][r.result-1]}"></i>`).join('');

            // Preparar información contextual (Stats) similar a Nahual
            const contextHTML = `
                <div class="roll-details" style="display: flex; justify-content: space-around; border-top: 1px dashed #444; margin-top: 10px; padding-top: 5px;">
                    <span><strong>${traitLabel}:</strong> ${traitValue}</span>
                    <span><strong>${game.i18n.localize("HOGWARTS.Bonus")}:</strong> ${traitBonus + manualBonus}</span>
                </div>
                ${appliedConditions.length ? `<div class="roll-details" style="text-align: center; margin-top: 5px; color: #b71c1c;"><strong>${game.i18n.localize("HOGWARTS.Conditions")}:</strong> ${appliedConditions.join(", ")} (${conditionPenalty})</div>` : ''}
            `;

            // Preparar información de uso (Hechizos/Objetos)
            let usageHTML = "";
            if (spell || object) {
                usageHTML += `<div class="roll-details" style="text-align: center; margin-bottom: 5px; font-style: italic;">`;
                if (spell) usageHTML += `<div><strong>${game.i18n.localize("HOGWARTS.Spells")}:</strong> ${spell.name}</div>`;
                if (object) usageHTML += `<div><strong>${game.i18n.localize("HOGWARTS.Inventory")}:</strong> ${object.name}</div>`;
                usageHTML += `</div>`;
            }

            const msgContent = `
              <div class="hogwarts-chat-card ${resultClass}" data-house="${house}">
                  <div class="result-header">
                      <h3 class="move-title">${traitLabel}</h3>
                      <span class="roll-total">${roll.total}</span>
                  </div>
                  
                  <div class="dice-display">${diceIcons}</div>
                  <div class="roll-outcome">${resultLabel}</div>
                  
                  ${usageHTML}
                  ${contextHTML}
              </div>`;

            ChatMessage.create({
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: msgContent,
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              rolls: [roll],
              sound: CONFIG.sounds.dice
            });
          }
        }
      },
      default: "roll"
    }, {
      classes: ["hogwarts", "dialog", house]
    }).render(true);
  }

  /**
   * Maneja el click en checkboxes de recursos (Suerte/Experiencia) para rellenar/vaciar en grupo.
   * @param {Event} event 
   */
  async _onResourceCheck(event) {
    event.preventDefault(); // Evitamos que el input cambie visualmente por sí solo
    const checkbox = event.currentTarget;
    const name = checkbox.name; // Ej: "system.luck.val2"

    // Descomponemos el nombre para saber qué grupo y qué índice es
    const parts = name.split("."); // ["system", "luck", "val2"]
    if (parts.length < 3) return;
    
    const groupName = parts[1]; // "luck" o "experience"
    const key = parts[2]; // "val2"
    const index = parseInt(key.replace("val", ""));

    // Obtenemos los datos actuales del grupo
    const groupData = this.actor.system[groupName];
    
    // Determinamos cuántos items tiene el grupo buscando hasta que no encontremos valN
    let max = 0;
    while (groupData.hasOwnProperty(`val${max + 1}`) || (this.actor.system._source && this.actor.system._source[groupName] && this.actor.system._source[groupName][`val${max + 1}`] !== undefined)) {
        max++;
        // Límite de seguridad por si acaso
        if (max > 10) break;
    }

    // Lógica de "Radio Button" acumulativo:
    // - Si clicamos en el nivel actual (el activo más alto), lo desactivamos (bajamos un nivel).
    // - Si clicamos en cualquier otro, establecemos el nivel a ese índice.
    const isActive = groupData[`val${index}`] === true;
    const nextIsInactive = (index === max) || (groupData[`val${index + 1}`] === false);
    
    const targetLevel = (isActive && nextIsInactive) ? index - 1 : index;

    // Preparamos la actualización para todos los checkboxes del grupo
    const updateData = {};
    for (let i = 1; i <= max; i++) {
        updateData[`system.${groupName}.val${i}`] = (i <= targetLevel);
    }

    return this.actor.update(updateData);
  }

  /**
   * Despliega la descripción del objeto al hacer click en el nombre.
   * Ignora los items de tipo "progreso".
   * @param {Event} event 
   */
  async _onItemSummary(event) {
    event.preventDefault();
    const li = $(event.currentTarget).closest(".item");
    const item = this.actor.items.get(li.data("itemId"));

    // Si no es un item válido o es de tipo Progreso, no hacemos nada
    if (!item || item.type === "progreso") return;

    // Lógica de Toggle
    if (li.hasClass("expanded")) {
        let summary = li.children(".item-summary");
        summary.slideUp(200, () => summary.remove());
    } else {
        const description = await TextEditor.enrichHTML(item.system.description, {async: true});
        const div = $(`<div class="item-summary">${description}</div>`);
        li.append(div.hide());
        div.slideDown(200);
    }
    li.toggleClass("expanded");
  }
}