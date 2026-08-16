import { MapView } from "@/components/MapView";

export default function Home() {
  // Evaluated at build time, then handed to the client component so the
  // copyright year cannot drift out of sync between server and browser.
  return <MapView year={new Date().getFullYear()} />;
}
