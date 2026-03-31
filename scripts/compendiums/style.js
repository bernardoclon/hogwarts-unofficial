// Definición del ID del módulo para consistencia
const MODULE_ID = "hogwarts";

// Define la configuración de tus compendios.
const compendiumBanners = [
    {
        dataPack: `${MODULE_ID}.hechizos`,
        colorText: "#ff5252", // Se mantiene para compatibilidad con estilos de texto si se desea
        iconText: "fa-solid fa-tint", // Se mantiene para compatibilidad con iconos si se desea
        bannerImage: `systems/${MODULE_ID}/art/banner1.jpeg`,
    },
    {
        dataPack: `${MODULE_ID}.actores`,
        colorText: "#ff5252",
        iconText: "fa-solid fa-dot-circle",
        bannerImage: `systems/${MODULE_ID}/art/banner2.jpeg`,
    },
    {
        dataPack: `${MODULE_ID}.objetos`,
        colorText: "#ff5252",
        iconText: "fa-solid fa-dot-circle",
        bannerImage: `systems/${MODULE_ID}/art/banner3.jpeg`,
    }
];

// Nuevo Map para almacenar los MutationObservers de cada banner de ventana emergente abierto
// Mapea el popoutId a su MutationObserver.
const bannerObservers = new Map();

// Nuevo Map para almacenar los elementos <style> inyectados dinámicamente
// Mapea el popoutId a su elemento <style> HTML.
const injectedStyles = new Map();

// Hook que se ejecuta una vez que Foundry VTT está completamente cargado y listo
Hooks.once('ready', async function() {
  console.log(`${MODULE_ID} | Módulo completamente listo y cargado.`);

  // Iniciar un observador global del DOM en el body para detectar ventanas emergentes
  console.log(`${MODULE_ID} | DEBUG GLOBAL: Iniciando observador global del DOM en document.body para detectar ventanas emergentes.`);
  const globalBodyObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              for (const node of mutation.addedNodes) {
                  // Solo procesar si el nodo es un elemento HTML
                  if (node.nodeType === Node.ELEMENT_NODE) {
                      // Verificar si el nodo añadido es una ventana emergente de compendio o la contiene
                      const popoutSection = node.matches('section[id^="compendium-"].sidebar-popout') ? node : node.querySelector('section[id^="compendium-"].sidebar-popout');
                      
                      // Si detectamos una sección de ventana emergente
                      if (popoutSection) {
                          console.log(`${MODULE_ID} | DEBUG GLOBAL: Detectada posible ventana emergente de compendio para banner: ${popoutSection.id}`);
                          applyCompendiumBanner(popoutSection); // Llamar a la función para aplicar el banner
                      }
                  }
              }
          }
      }
  });

  // Observar cambios en el cuerpo del documento (adición/eliminación de nodos hijos)
  // subtree: true para observar también cambios en los descendientes del body
  globalBodyObserver.observe(document.body, { childList: true, subtree: true });
});


// Lógica para cambiar el atributo 'src' de la imagen del banner en la barra lateral
Hooks.on("renderCompendiumDirectory", (app, html, data) => {
  console.log(`${MODULE_ID} | Renderizando Directorio de Compendios, intentando cambiar src de banners de imagen.`);
  
  const compendiumThemesMap = new Map(compendiumBanners.map(theme => [theme.dataPack, theme.bannerImage]));

  // Obtener el elemento raíz, asegurándose de que sea un HTMLElement
  const rootElement = html instanceof HTMLElement ? html : html[0];

  if (!rootElement) {
    console.warn(`${MODULE_ID} | No se pudo obtener el elemento raíz para el Directorio de Compendios.`);
    return;
  }

  // Iterar sobre todos los elementos de compendio en el HTML renderizado
  const compendiumItems = rootElement.querySelectorAll('li.directory-item.compendium');
  compendiumItems.forEach(compendiumItem => {
    const dataPack = compendiumItem.dataset.pack;
    const customBannerImage = compendiumThemesMap.get(dataPack);

    if (customBannerImage) {
      const bannerImg = compendiumItem.querySelector('img.compendium-banner');
      if (bannerImg) {
        bannerImg.src = customBannerImage; // Cambia el atributo src de la imagen
        console.log(`${MODULE_ID} | Estableciendo banner para ${dataPack} (sidebar): ${customBannerImage}`);
      } else {
        // En tu HTML, el elemento img en el sidebar no tiene la clase .compendium-banner por defecto.
        // Podría ser un <a> directamente, o la imagen está en un elemento diferente.
        // Si el img.compendium-banner no existe, Foundry usa un background-image en el <a>.
        // Vamos a aplicar el background-image al <a> si no encontramos el img.
        const compendiumLink = compendiumItem.querySelector('a.entry-name.compendium-name');
        if (compendiumLink) {
             compendiumLink.style.setProperty('background-image', `url('${customBannerImage}')`, 'important');
             compendiumLink.style.setProperty('background-size', 'cover', 'important');
             compendiumLink.style.setProperty('background-position', 'center', 'important');
             compendiumLink.style.setProperty('background-repeat', 'no-repeat', 'important');
             console.log(`${MODULE_ID} | Aplicando background-image al enlace del sidebar para ${dataPack}: ${customBannerImage}`);
        } else {
            console.log(`${MODULE_ID} | No se encontró ni 'img.compendium-banner' ni 'a.entry-name.compendium-name' para el paquete: ${dataPack} (sidebar).`);
        }
      }
    } else {
      // console.log(`${MODULE_ID} | No hay banner personalizado definido para el paquete: ${dataPack} (sidebar).`);
    }
  });
});


// FUNCIÓN PRINCIPAL: Aplica el banner a una ventana emergente de compendio
function applyCompendiumBanner(popoutSection) {
    const popoutId = popoutSection.id;

    console.log(`${MODULE_ID} | DEBUG: applyCompendiumBanner: Procesando ventana emergente de compendio: ${popoutId}`);
    
    const compendiumThemesMap = new Map(compendiumBanners.map(theme => [theme.dataPack, theme.bannerImage]));

    // Extraer el dataPack ID del ID del elemento HTML de la ventana emergente
    // La ID es "compendium-MODULE_ID_PACK_NAME"
    const fullIdString = popoutId.replace('compendium-', '');
    const idParts = fullIdString.split('_', 2); // Dividir solo por el primer '_' para separar el módulo del nombre del pack

    let dataPackIdForPopout;
    if (idParts.length === 2) {
        dataPackIdForPopout = `${idParts[0]}.${idParts[1]}`;
    } else {
        // Si no se puede dividir, usar el ID completo o un valor por defecto si es necesario
        dataPackIdForPopout = fullIdString.replace(/_/g, '.'); // Fallback para reemplazar todos los _ con .
    }
    
    console.log(`${MODULE_ID} | DEBUG: applyCompendiumBanner: dataPackIdFromElementId para pop-out: ${dataPackIdForPopout}`);

    const customBannerImage = compendiumThemesMap.get(dataPackIdForPopout);
    
    if (customBannerImage) {
      const mainBannerImg = popoutSection.querySelector('.header-banner img');
      const headerBannerDiv = popoutSection.querySelector('.header-banner');

      if (headerBannerDiv) { // Solo necesitamos el div del banner, la imagen la eliminaremos
        // Eliminar la imagen por defecto de Foundry VTT si existe
        if (mainBannerImg) {
            mainBannerImg.remove(); 
            console.log(`${MODULE_ID} | DEBUG: Imagen por defecto eliminada para ${popoutId}.`);
        }

        // --- NUEVA ESTRATEGIA: INYECTAR CSS DINÁMICAMENTE ---
        // Primero, eliminar cualquier estilo previamente inyectado para esta ventana emergente
        if (injectedStyles.has(popoutId)) {
            injectedStyles.get(popoutId).remove();
            injectedStyles.delete(popoutId);
            console.log(`${MODULE_ID} | DEBUG: Estilo CSS inyectado existente eliminado para ${popoutId}.`);
        }

        // Crear un nuevo elemento <style> y adjuntarlo al <head>
        const styleElement = document.createElement('style');
        styleElement.id = `compendium-banner-style-${popoutId}`; // ID único para el elemento <style>
        styleElement.textContent = `
            #${popoutId} .header-banner {
                background-image: url('${customBannerImage}') !important;
                background-size: cover !important;
                background-position: center !important;
                background-repeat: no-repeat !important;
            }
            #${popoutId} .header-banner img {
                display: none !important; /* Asegurarse de que si se reinserta, se oculta */
            }
        `;
        document.head.appendChild(styleElement);
        injectedStyles.set(popoutId, styleElement); // Almacenar referencia al elemento <style>
        console.log(`${MODULE_ID} | DEBUG: Estilo CSS inyectado para ${popoutId}: ${customBannerImage}`);


        // --- LÓGICA DEL MUTATION OBSERVER REFINADA ---
        // Si ya hay un observer para este popout, desconectarlo primero para evitar duplicados
        if (bannerObservers.has(popoutId)) {
            bannerObservers.get(popoutId).disconnect();
            bannerObservers.delete(popoutId);
            console.log(`${MODULE_ID} | DEBUG: Observer existente desconectado para ${popoutId}.`);
        }

        // Crear y configurar un nuevo MutationObserver para este div de banner específico
        const observer = new MutationObserver((mutationsList) => {
            let reapplyNeeded = false;
            for (const mutation of mutationsList) {
                // Observar si se añaden o eliminan nodos hijos (como si reaparece la imagen por defecto)
                // o si los atributos (incluido el 'style') del .header-banner cambian.
                if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
                    const currentBgImage = headerBannerDiv.style.getPropertyValue('background-image');
                    const imgExists = headerBannerDiv.querySelector('img');

                    // Si nuestro background-image ya no está aplicado correctamente
                    // o si Foundry reinsertó una imagen 'img' dentro del .header-banner
                    if (!currentBgImage.includes(customBannerImage) || imgExists) {
                        reapplyNeeded = true;
                        break; 
                    }
                }
            }

            if (reapplyNeeded) {
                console.log(`${MODULE_ID} | DEBUG: Observer detectó cambio de banner para ${popoutId}. Re-aplicando.`);
                // Desconectar este observer *temporalmente* para evitar bucles infinitos durante la re-aplicación
                observer.disconnect();
                // Re-aplicar el banner, lo cual también re-configurará el nuevo estilo y observer
                // Envuelto en setTimeout para dar tiempo a Foundry a estabilizar el DOM antes de la re-aplicación forzada.
                setTimeout(() => applyCompendiumBanner(popoutSection), 50); 
            }
        });

        // Observar cambios en atributos (especialmente 'style') y en los hijos directos del div.header-banner
        observer.observe(headerBannerDiv, { attributes: true, childList: true, subtree: false });
        bannerObservers.set(popoutId, observer); // Almacenar el observer para este popout
        
      } else {
        console.log(`${MODULE_ID} | applyCompendiumBanner: No se encontró '.header-banner' en la ventana emergente para ${dataPackIdForPopout}.`);
      }
    } else {
      console.log(`${MODULE_ID} | applyCompendiumBanner: No hay banner personalizado definido para la ventana emergente: ${dataPackIdForPopout}.`);
    }
}


// Hook para limpiar los observers Y LOS ESTILOS INYECTADOS cuando una aplicación se cierra
Hooks.on("closeApplication", (app) => {
    const closedAppId = app.element?.[0]?.id;
    if (closedAppId) {
        // Desconectar y eliminar observer si existe
        if (bannerObservers.has(closedAppId)) {
            bannerObservers.get(closedAppId).disconnect();
            bannerObservers.delete(closedAppId);
            console.log(`${MODULE_ID} | DEBUG: Observer para la ventana emergente ${closedAppId} desconectado y eliminado.`);
        }
        // Eliminar estilo inyectado si existe
        if (injectedStyles.has(closedAppId)) {
            injectedStyles.get(closedAppId).remove();
            injectedStyles.delete(closedAppId);
            console.log(`${MODULE_ID} | DEBUG: Estilo CSS inyectado para la ventana emergente ${closedAppId} eliminado.`);
        }
    }
});

// El hook renderApplication sigue siendo útil para el primer renderizado o para cuando
// una aplicación es completamente reconstruida por Foundry (ej. arrastrar entre monitores).
// Usamos setTimeout para dar tiempo a Foundry a renderizar antes de aplicar nuestros cambios.
Hooks.on("renderApplication", (app, html, data) => {
    const popoutSection = app.element?.[0];

    // Verificamos si la aplicación renderizada es una ventana emergente de compendio.
    if (popoutSection && popoutSection.id.startsWith('compendium-') && popoutSection.classList.contains('sidebar-popout')) {
        const popoutId = popoutSection.id;
        console.log(`${MODULE_ID} | DEBUG: renderApplication hook DETECTADO para ID: ${popoutId}.`);

        // Programar la aplicación del banner con un pequeño retraso.
        // Esto permite que Foundry complete su ciclo de renderizado.
        setTimeout(() => {
            console.log(`${MODULE_ID} | DEBUG: Llamando a applyCompendiumBanner después de re-renderización con retardo para ID: ${popoutId}.`);
            applyCompendiumBanner(popoutSection);
        }, 100); 
    }
});