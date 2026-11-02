import { z } from 'zod';

export const MAX_QUOTE_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_QUOTE_FILES = 3;
export const MAX_QUOTE_TOTAL_SIZE = 8 * 1024 * 1024;
export const QUOTE_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export function normalizeMoroccanPhone(value: string): string {
  const compact = value.replace(/[\s().-]/g, '').replace(/^00212/, '+212');
  return /^0[5-7]\d{8}$/.test(compact) ? `+212${compact.slice(1)}` : compact;
}
export const quoteRequestSchema = z.object({
  first_name: z.string().trim().min(1, 'Indiquez votre prénom.').max(80, 'Prénom trop long.'),
  last_name: z.string().trim().min(1, 'Indiquez votre nom.').max(80, 'Nom trop long.'),
  phone: z.string().transform(normalizeMoroccanPhone).refine(v => /^\+212[5-7]\d{8}$/.test(v), 'Indiquez un numéro marocain valide : +212 suivi de 9 chiffres (5, 6 ou 7).'),
  email: z.string().trim().email('Indiquez une adresse e-mail valide.').max(254, 'L’adresse e-mail ne doit pas dépasser 254 caractères.'),
  category_id: z.string().refine(v => v === 'general' || z.string().uuid().safeParse(v).success, 'Choisissez un type de demande.'),
  subject: z.string().trim().min(3, 'Précisez le sujet (3 caractères minimum).').max(160, 'Le sujet ne doit pas dépasser 160 caractères.'),
  message: z.string().trim().min(10, 'Décrivez votre besoin (10 caractères minimum).').max(5000, 'La description ne doit pas dépasser 5 000 caractères.'),
});
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type QuoteCategory = { id: string; label: string };
export function quoteFileError(files: {name: string; size: number; type: string}[]): string | null {
  if (files.length > MAX_QUOTE_FILES) return 'Vous pouvez joindre 3 fichiers maximum.';
  if (files.some(f => !QUOTE_FILE_TYPES.includes(f.type) || !({'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i, 'image/webp': /\.webp$/i, 'application/pdf': /\.pdf$/i}[f.type]?.test(f.name)))) return 'Formats acceptés : JPG, PNG, WebP ou PDF.';
  if (files.some(f => !f.size || f.size > MAX_QUOTE_FILE_SIZE)) return 'Chaque fichier doit être non vide et ne pas dépasser 5 Mo.';
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_QUOTE_TOTAL_SIZE) return 'Les pièces jointes ne doivent pas dépasser 8 Mo au total.';
  return null;
}
export function quoteFileMatchesContent(type: string, bytes: Uint8Array): boolean {
  const hex = (values: number[]) => values.every((v, i) => bytes[i] === v);
  if (type === 'image/jpeg') return hex([255, 216, 255]);
  if (type === 'image/png') return hex([137, 80, 78, 71, 13, 10, 26, 10]);
  if (type === 'application/pdf') return hex([37, 80, 68, 70, 45]);
  return type === 'image/webp' && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
}
export function quoteReference(id: string) { return `DEV-${id.replaceAll('-', '').toUpperCase()}`; }
