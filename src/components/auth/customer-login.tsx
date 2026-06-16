"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { phoneAuth, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initial: AuthState = { step: "phone" };

export function CustomerLogin({ oauthError }: { oauthError?: string }) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(phoneAuth, initial);
  const onCodeStep = state.step === "code";

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="w-full">
        <a href="/api/auth/google">{t("continueWithGoogle")}</a>
      </Button>

      {oauthError && (
        <p className="text-sm text-destructive" role="alert">
          {t("oauthFailed")}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t("or")}</span>
        <Separator className="flex-1" />
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="intent" value={onCodeStep ? "verify" : "request"} />

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phoneLabel")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            defaultValue={state.phone ?? ""}
            readOnly={onCodeStep}
            required
          />
        </div>

        {onCodeStep && (
          <div className="space-y-2">
            <Label htmlFor="code">{t("codeLabel")}</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="------"
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("codeSentTo", { phone: state.phone ?? "" })}
            </p>
          </div>
        )}

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {t(`errors.${state.error}`)}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {onCodeStep ? t("verifyAndSignIn") : t("sendCode")}
        </Button>
      </form>
    </div>
  );
}
