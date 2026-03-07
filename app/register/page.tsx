import { Package } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">StockFlow</h1>
          <p className="text-[13px] text-muted-foreground">
            Crie sua conta gratuita
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
