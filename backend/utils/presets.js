// utils/presets.js
// Preset templates (9/12) matching V1 路线图.
// Returns role counts object used for validation & assignment.
export const PRESETS = {
  "9p-classic": {
    werewolf: 3,
    seer: 1,
    witch: 1,
    guard: 1,
    villager: 3,
  },
  "12p-classic": {
    werewolf: 4,
    seer: 1,
    witch: 1,
    guard: 1,
    villager: 5,
  },
};

export function totalRoles(roles = {}) {
  return Object.values(roles).reduce((s, n) => s + Number(n || 0), 0);
}
