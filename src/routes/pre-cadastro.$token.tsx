import { createFileRoute } from "@tanstack/react-router";
import { RegistrationForm } from "@/components/patient-registration/RegistrationForm";

export const Route = createFileRoute("/pre-cadastro/$token")({
  head: () => ({ meta: [{ title: "Pré-cadastro seguro — TeraClini" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Page,
});
function Page() { const { token } = Route.useParams(); return <RegistrationForm token={token} />; }
