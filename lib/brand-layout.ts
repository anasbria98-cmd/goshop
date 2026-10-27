export type BrandSlot = string | null;

/** Only the source and destination change. Occupied destinations swap, never shift. */
export function moveBrandSlot(slots: BrandSlot[], from: number, to: number): BrandSlot[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= slots.length || to >= slots.length || !slots[from]) return slots;
  const next = [...slots];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function placeBrandInSlot(slots: BrandSlot[], id: string, to: number): BrandSlot[] {
  if (slots.includes(id) || !Number.isInteger(to) || to < 0 || to >= slots.length || slots[to] !== null) return slots;
  return slots.map((slot, index) => index === to ? id : slot);
}
