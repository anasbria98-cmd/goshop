import { getCategoryNavigation } from '@/lib/category-navigation-server';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json((await getCategoryNavigation()).mobile,{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Impossible de charger les catégories.'},{status:503});
  }
}
