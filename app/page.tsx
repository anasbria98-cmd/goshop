import { Home } from "@/components/home";
import { getHomepageData } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Page() {
  return <Home {...await getHomepageData()} />;
}
