export class HousePointsApp extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "house-points-app",
            title: "Panel de Puntos de Casas",
            template: "systems/hogwarts/templates/gm/house-points.hbs",
            width: 420,
            height: "auto",
            classes: ["hogwarts", "house-points"],
            resizable: false
        });
    }

    async getData() {
        // Obtener los puntos guardados en la configuración global
        const points = game.settings.get("hogwarts", "housePoints");

        // Determinar qué casa va ganando para colorear la copa
        let max = -1;
        let winner = "default";
        
        for (const [house, score] of Object.entries(points)) {
            if (score > max && score > 0) {
                max = score;
                winner = house;
            } else if (score === max) {
                winner = "default"; // Empate o 0
            }
        }

        return {
            points,
            winner,
            houses: {
                gryffindor: "HOGWARTS.HouseGryffindor",
                slytherin: "HOGWARTS.HouseSlytherin",
                ravenclaw: "HOGWARTS.HouseRavenclaw",
                hufflepuff: "HOGWARTS.HouseHufflepuff"
            }
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        // Listener para el botón de Puntuar
        html.find("#btn-puntuar").click(this._onPuntuar.bind(this));

        // Listener para editar manualmente los totales (sin mensaje de chat)
        html.find(".house-total input").change(this._onManualEdit.bind(this));
    }

    async _onPuntuar(event) {
        event.preventDefault();
        const form = this.element.find("form")[0];
        
        const pointsToAdd = parseInt(form.pointsInput.value) || 0;
        const targetHouse = form.houseSelect.value;

        if (!targetHouse || pointsToAdd === 0) return;

        // Actualizar configuración global
        const currentPoints = game.settings.get("hogwarts", "housePoints");
        currentPoints[targetHouse] += pointsToAdd;
        await game.settings.set("hogwarts", "housePoints", currentPoints);

        // Enviar mensaje al chat
        const houseLabel = game.i18n.localize(`HOGWARTS.House${targetHouse.charAt(0).toUpperCase() + targetHouse.slice(1)}`);
        
        let flavorText;
        if (pointsToAdd > 0) {
            flavorText = `¡${pointsToAdd} puntos para <strong>${houseLabel}</strong>!`;
        } else {
            flavorText = `¡${Math.abs(pointsToAdd)} puntos menos para <strong>${houseLabel}</strong>!`;
        }

        const messageContent = `
            <div class="hogwarts-chat-card" data-house="${targetHouse}">
                <div class="result-header">
                    <h3 class="move-title">Puntos para la Casa</h3>
                </div>
                <div class="dice-display" style="font-size: 40px; font-weight: bold; color: #fff;">
                    ${pointsToAdd > 0 ? '+' : ''}${pointsToAdd}
                </div>
                <div class="roll-outcome">${flavorText}</div>
            </div>`;

        ChatMessage.create({ content: messageContent });

        // Re-renderizar panel para ver cambios en la copa y totales
        this.render();
    }

    async _onManualEdit(event) {
        event.preventDefault();
        const input = event.currentTarget;
        const house = input.dataset.house;
        const newValue = parseInt(input.value) || 0;

        if (house) {
            const currentPoints = game.settings.get("hogwarts", "housePoints");
            currentPoints[house] = newValue;
            await game.settings.set("hogwarts", "housePoints", currentPoints);
            
            // Re-renderizar para actualizar la copa si cambia el líder
            this.render();
        }
    }
}