/* BatchWatt planner entrypoint. Node/API use V6; production build replaces this file with the browser-ready V6 engine. */
'use strict';
if (typeof module !== 'undefined' && module.exports) {
  module.exports = require('./energy-planner-v6');
} else if (typeof globalThis !== 'undefined' && globalThis.BatchWattEnergy) {
  // Browser production builds overwrite this entrypoint with energy-planner-v6.js.
}
