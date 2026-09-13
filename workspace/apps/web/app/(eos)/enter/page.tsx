import { AuthenticationTemplate } from "@repo/presentation-templates/authentication";
import { EnterForm } from "./EnterForm";

export default function EnterPage() {
  return (
    <AuthenticationTemplate 
      title="Enter EOS"
      subtitle="Sign in to your Enterprise Operating System workspace"
    >
      <EnterForm />
    </AuthenticationTemplate>
  );
}