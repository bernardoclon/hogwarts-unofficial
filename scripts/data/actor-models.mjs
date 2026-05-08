export class MagoData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      attributes: new fields.SchemaField({
        hp: new fields.SchemaField({
          value: new fields.NumberField({ initial: 10, integer: true }),
          max: new fields.NumberField({ initial: 10, integer: true })
        })
      }),
      traits: new fields.SchemaField({
        bravery: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
        cunning: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
        intellect: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
        loyalty: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 }),
        magic: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 3 })
      }),
      luck: new fields.SchemaField({
        val1: new fields.BooleanField({ initial: false }),
        val2: new fields.BooleanField({ initial: false }),
        val3: new fields.BooleanField({ initial: false })
      }),
      experience: new fields.SchemaField({
        val1: new fields.BooleanField({ initial: false }),
        val2: new fields.BooleanField({ initial: false }),
        val3: new fields.BooleanField({ initial: false }),
        val4: new fields.BooleanField({ initial: false })
      }),
      details: new fields.SchemaField({
        house: new fields.StringField({ initial: "" }),
        year: new fields.StringField({ initial: "" }),
        heritage: new fields.StringField({ initial: "" }),
        ambition: new fields.StringField({ initial: "" }),
        patronus: new fields.StringField({ initial: "" })
      }),
      appearance: new fields.SchemaField({
        skin: new fields.StringField({ initial: "" }),
        hair: new fields.StringField({ initial: "" }),
        build: new fields.StringField({ initial: "" })
      }),
      wand: new fields.SchemaField({
        wood: new fields.StringField({ initial: "" }),
        appearance: new fields.StringField({ initial: "" }),
        core: new fields.StringField({ initial: "" })
      }),
      social: new fields.SchemaField({
        pet: new fields.SchemaField({
          name: new fields.StringField({ initial: "" }),
          species: new fields.StringField({ initial: "" })
        }),
        subjects: new fields.SchemaField({
          fav1: new fields.StringField({ initial: "" }),
          fav2: new fields.StringField({ initial: "" })
        }),
        friends: new fields.SchemaField({
          friend1: new fields.StringField({ initial: "" }),
          friend2: new fields.StringField({ initial: "" })
        }),
        rival: new fields.StringField({ initial: "" })
      }),
      conditions: new fields.SchemaField({
        afraid: new fields.BooleanField({ initial: false }),
        angry: new fields.BooleanField({ initial: false }),
        stressed: new fields.BooleanField({ initial: false }),
        jealous: new fields.BooleanField({ initial: false }),
        embarrassed: new fields.BooleanField({ initial: false }),
        hurt: new fields.BooleanField({ initial: false }),
        hexed: new fields.BooleanField({ initial: false }),
        unconscious: new fields.BooleanField({ initial: false })
      }),
      sequel: new fields.StringField({ initial: "" }),
      quidditch: new fields.SchemaField({
        game: new fields.SchemaField({
          team1: new fields.StringField({ initial: "" }),
          score1: new fields.NumberField({ initial: 0 }),
          team2: new fields.StringField({ initial: "" }),
          score2: new fields.NumberField({ initial: 0 })
        }),
        season: new fields.StringField({ initial: "" }),
        totals: new fields.SchemaField({
          gryffindor: new fields.NumberField({ initial: 0 }),
          hufflepuff: new fields.NumberField({ initial: 0 }),
          ravenclaw: new fields.NumberField({ initial: 0 }),
          slytherin: new fields.NumberField({ initial: 0 })
        }),
        previousWinner: new fields.StringField({ initial: "" })
      })
    };
  }
}

export class BaulData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {}; // El baúl no tiene datos de sistema por ahora, solo inventario
  }
}