import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RESET Clinic Shop",
    short_name: "RESET Shop",
    description: "Професійна косметика та підбір догляду від RESET Clinic.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2ed",
    theme_color: "#171310",
    lang: "uk-UA",
    categories: ["beauty", "shopping", "health"],
  };
}
