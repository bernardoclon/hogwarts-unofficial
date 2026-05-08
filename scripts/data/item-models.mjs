export class ObjetoMagicoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      quantity: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

export class HechizoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      level: new fields.NumberField({ initial: 1, integer: true, min: 1, max: 8 }),
      description: new fields.HTMLField({ initial: "" })
    };
  }
}

export class ProgresoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      progressType: new fields.StringField({ initial: "none" }),
      selectedTrait: new fields.StringField({ initial: "" })
    };
  }
}