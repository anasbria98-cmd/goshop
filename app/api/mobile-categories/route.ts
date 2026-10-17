import { getCategories } from '@/lib/catalog';
import { mobileCategoryTree } from '@/lib/mobile-category-menu';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(mobileCategoryTree(await getCategories()),{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Impossible de charger les catégories.'},{status:503});
  }
}
