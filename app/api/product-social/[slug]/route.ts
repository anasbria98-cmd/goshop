import { getSocialProduct } from '@/lib/product-social-catalog';
import { productSocialHtml } from '@/lib/product-sharing';
export const runtime = 'nodejs';
async function respond(_request: Request, {params}: {params: Promise<{slug:string}>}) {
  const start=performance.now();
  try {
    const {slug}=await params;
    const result=await getSocialProduct(slug);
    if (!result) return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
    return new Response(_request.method==='HEAD' ? null : productSocialHtml(result.value),{headers:{
      'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'Vary':'User-Agent',
      'Server-Timing':`social;dur=${(performance.now()-start).toFixed(1)};desc="${result.status}"`,
      'X-Content-Type-Options':'nosniff',
    }});
  } catch { return new Response(null,{status:503,headers:{'Cache-Control':'no-store','Retry-After':'5'}}); }
}
export { respond as GET, respond as HEAD };
