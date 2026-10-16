import { Home } from "@/components/home";
import { getHomepageData } from "@/lib/catalog";
import { getHomeSlides } from "@/lib/home-slides-server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const data = await getHomepageData();
  return <Home {...data} slides={await getHomeSlides(data.categories)} />;
}
