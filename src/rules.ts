export const CAPACITY = 6;
export type Round = { basket: number; delivered: number; collected: Set<number>; ended: boolean };
export const freshRound = (): Round => ({ basket: 0, delivered: 0, collected: new Set(), ended: false });
export function collect(round: Round, id: number) { if (!round.ended && round.basket < CAPACITY && !round.collected.has(id)) { round.collected.add(id); round.basket++; return true; } return false; }
export function deliver(round: Round) { const n = round.ended ? 0 : round.basket; round.delivered += n; round.basket = 0; return n; }
export function end(round: Round) { round.ended = true; }
