import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "./login";

// Signup is ONLY for employees — HR Admin cannot sign up
export const Route = createFileRoute("/signup")({
  component: () => <AuthCard mode="signup" forceRole="Employee" />,
});
