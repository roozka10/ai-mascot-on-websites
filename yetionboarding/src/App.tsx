import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Onboarding from "@/components/Onboarding";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Onboarding />
    </QueryClientProvider>
  );
}
