// All flags: the concatenation of the per-domain files. Order does not matter (evaluate() sorts by
// bucket, priority, id). Created once by Story S2; later stories edit only their own domain file,
// never this one.
import umbrella from './umbrella.mjs';
import umbrellaScope from './umbrellaScope.mjs';
import vehicles from './vehicles.mjs';
import auto from './auto.mjs';
import home from './home.mjs';
import renters from './renters.mjs';
import health from './health.mjs';
import deductible from './deductible.mjs';
import other from './other.mjs';

export const FLAGS = [
  ...umbrella,
  ...umbrellaScope,
  ...vehicles,
  ...auto,
  ...home,
  ...renters,
  ...health,
  ...deductible,
  ...other,
];

export default FLAGS;
