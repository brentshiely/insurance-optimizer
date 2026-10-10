// The default catalog the engine evaluates: { questions, flags, sources, cards }.
// Assembled from the data modules; edit those, not this file.
import { QUESTIONS } from './questions/index.mjs';
import { FLAGS } from './flags/index.mjs';
import { SOURCES } from './sources.mjs';
import { CARDS } from './cards.mjs';

export const CATALOG = {
  questions: QUESTIONS,
  flags: FLAGS,
  sources: SOURCES,
  cards: CARDS,
};

export default CATALOG;
