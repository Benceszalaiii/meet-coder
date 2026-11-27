'use strict';
const Catalog = require('./model-catalog');
const Runner = require('./runner');
const { head } = require('./models');

function failure(error) {
  return { structured: null, text: '', cost: 0, error };
}

class ModelRouter {
  constructor(onChange) {
    this.onChange = onChange;
    this.catalog = null;
    this.pending = null;
    this.probeError = '';
  }

  snapshot(preference) {
    const catalog = this.catalog || { models: [], providers: {} };
    return {
      ...catalog, active: Catalog.resolve(preference, catalog),
      checking: !!this.pending, error: this.probeError,
    };
  }

  refresh() {
    if (!this.pending) {
      this.pending = Catalog.discover().then(catalog => {
        this.catalog = catalog;
        this.probeError = '';
      }).catch(() => {
        this.probeError = 'A modellek keresése sikertelen. Próbáld újra a Beállításokban.';
      }).finally(() => {
        this.pending = null;
        this.onChange();
      });
      this.onChange();
    }
    return this.pending;
  }

  async run(kind, preference, options) {
    if (!this.catalog || this.pending) await this.refresh();
    const tried = new Set();
    let totalCost = 0;
    let result = failure(this.probeError || 'Nincs elérhető modell. Ellenőrizd a szolgáltatókat a Beállításokban.');
    let model = this.snapshot(preference).active;
    while (model && !tried.has(model.id)) {
      if (options.signal?.aborted) return failure('Megszakítva.');
      tried.add(model.id);
      try { result = await Runner[kind](model, options); }
      catch (e) { result = failure(head(String(e.message || e), 300)); }
      totalCost += result.cost;
      if (!result.unavailable || options.signal?.aborted) break;
      this.markUnavailable(model);
      // An editing process may have changed the project before losing access.
      if (kind !== 'ask') break;
      model = this.snapshot(preference).active;
    }
    return { ...result, cost: totalCost };
  }

  markUnavailable(model) {
    // An in-flight request from before a refresh must not invalidate the new catalog.
    if (!this.catalog.models.includes(model)) return;
    const provider = model.provider;
    this.catalog = {
      models: this.catalog.models.filter(m => m.provider !== provider),
      providers: {
        ...this.catalog.providers,
        [provider]: { status: 'unavailable', detail: model.label + ' jelenleg nem érhető el. Ellenőrizd a hozzáférést és a használati keretet, majd frissíts.' },
      },
    };
    this.onChange();
  }
}

module.exports = { ModelRouter };
