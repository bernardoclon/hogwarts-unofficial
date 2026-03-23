import { MagoSheet } from "./actor/mago.mjs";
import { HogwartsItemSheet } from "./item/item-sheet.mjs";
import { HousePointsApp } from "./gm/house-points.mjs";
import "./compendiums/module.js";
import "./compendiums/style.js";
import "./pause-customizer.js";

Hooks.once("init", async function() {
  console.log("Hogwarts | Inicializando el sistema de juego");

  // Registrar hojas de actor
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("hogwarts", MagoSheet, {
    makeDefault: true,
    label: "Hoja de Mago"
  });

  // Registrar hojas de item
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("hogwarts", HogwartsItemSheet, {
    makeDefault: true,
    label: "Hoja de Objeto Hogwarts"
  });

  // Registrar configuración global para puntos de casas
  game.settings.register("hogwarts", "housePoints", {
    name: "Puntos de las Casas",
    scope: "world",
    config: false,
    type: Object,
    default: {
      gryffindor: 0, hufflepuff: 0, ravenclaw: 0, slytherin: 0
    }
  });

  // Pre-cargar templates de Handlebars (Partials)
  preloadHandlebarsTemplates();
});

/**
 * Define la lista de partials que se deben cargar al iniciar
 */
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/hogwarts/templates/actor/parts/header.hbs",
    "systems/hogwarts/templates/actor/parts/main/sidebar/sidebar.hbs",
    "systems/hogwarts/templates/actor/parts/main/social/social.hbs",
    "systems/hogwarts/templates/actor/parts/main/objetos/objetos.hbs",
    "systems/hogwarts/templates/actor/parts/main/progreso/progreso.hbs",
    "systems/hogwarts/templates/actor/parts/main/condiciones/condiciones.hbs",

    // Partials para la hoja de hechizos
    "systems/hogwarts/templates/actor/parts/spells/curso1/curso1.hbs",
    "systems/hogwarts/templates/actor/parts/spells/curso2/curso2.hbs",
    "systems/hogwarts/templates/actor/parts/spells/curso3/curso3.hbs",
    "systems/hogwarts/templates/actor/parts/spells/curso4/curso4.hbs",
    "systems/hogwarts/templates/actor/parts/spells/curso5/curso5.hbs",
    "systems/hogwarts/templates/actor/parts/spells/curso6/curso6.hbs",
    "systems/hogwarts/templates/actor/parts/spells/curso7/curso7.hbs",
    "systems/hogwarts/templates/actor/parts/spells/maldiciones/maldiciones.hbs",
    "systems/hogwarts/templates/actor/parts/spells/hechizo-row.hbs"
  ];
  return loadTemplates(templatePaths);
}

/**
 * Renderizar el botón del Panel GM en el directorio de Actores
 */
Hooks.on("renderActorDirectory", (app, html, data) => {
  // Solo mostrar para GMs
  if (!game.user.isGM) return;

  const $html = $(html);
  const button = $(`<button class="house-points-btn"><i class="fas fa-trophy"></i> Panel de Puntos</button>`);
  
  button.click(() => {
    new HousePointsApp().render(true);
  });

  // Añadimos el botón dentro del contenedor de acciones para que comparta el layout y se alinee correctamente
  $html.find(".header-actions").append(button);
});

/**
 * Actualización en tiempo real:
 * Cuando cambian los puntos de las casas, re-renderizar todas las hojas de personaje abiertas.
 */
Hooks.on("updateSetting", (setting) => {
  if (setting.key === "hogwarts.housePoints") {
    Object.values(ui.windows).forEach(app => {
      if (app instanceof MagoSheet) {
        app.render(false);
      }
    });
  }
});

/**
 * Control de animación de la Copa de las Casas
 * Permite que el destello termine su ciclo actual antes de detenerse al quitar el mouse.
 */
Hooks.once("ready", () => {
  // 1. Al entrar el mouse, añadimos la clase que inicia la animación
  $(document.body).on("mouseenter", ".house-cup", (e) => {
    $(e.currentTarget).addClass("shining");
  });

  // 2. Al terminar CADA iteración de la animación, verificamos si debemos seguir
  $(document.body).on("animationiteration", ".house-cup", (e) => {
    const el = $(e.currentTarget);
    // Si el mouse ya no está encima al finalizar el ciclo, paramos quitando la clase
    if (!el.is(":hover")) {
      el.removeClass("shining");
    }
  });
});
