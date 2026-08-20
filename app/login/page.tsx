import type { Metadata } from "next";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Arcade Vault · Iniciar sesión",
};

export default function Page() {
  return <LoginForm />;
}
