import { createFileRoute } from "@tanstack/react-router";
import Onboarding from "@/components/Onboarding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yeti — Set up your AI guide" },
      { name: "description", content: "Set up your Yeti AI website guide in three quick steps." },
      { property: "og:title", content: "Yeti — Set up your AI guide" },
      {
        property: "og:description",
        content: "Set up your Yeti AI website guide in three quick steps.",
      },
    ],
  }),
  component: Onboarding,
});
