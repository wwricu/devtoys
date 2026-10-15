import type { Metadata } from "next";
import FavouritesContent from "@/components/FavouritesContent";

export const metadata: Metadata = {
  title: "Favourites",
  description: "Your favourite developer tools.",
};

export default function FavouritesPage() {
  return <FavouritesContent />;
}
