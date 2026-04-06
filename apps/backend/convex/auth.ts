import { betterAuth } from "better-auth";
import { anonymous, emailOTP } from "better-auth/plugins";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { OTP_EXPIRY_SECONDS, sendOtpEmail } from "./lib/otpEmail";

export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false,
});

export function isAnonymousAuthUser(user: {
  isAnonymous?: boolean | null;
} | null): boolean {
  return user?.isAnonymous === true;
}

export const createAuth = (convexCtx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    database: authComponent.adapter(convexCtx),
    account: {
      accountLinking: { enabled: true },
    },
    trustedOrigins: [
      process.env.SITE_URL!,
      "http://localhost:3000",
      "https://typefast.gg",
    ],
    plugins: [
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          if (!("runMutation" in convexCtx)) {
            throw new Error("Auth account linking requires mutation access");
          }

          await convexCtx.runMutation(
            (internal as any).authLinking.migrateAnonymousAccount,
            {
              anonymousUserId: anonymousUser.user.id,
              newUserId: newUser.user.id,
              email: newUser.user.email ?? undefined,
            }
          );
        },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: OTP_EXPIRY_SECONDS,
        resendStrategy: "reuse",
        allowedAttempts: 5,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendOtpEmail({ email, otp, type });
        },
      }),
      crossDomain({ siteUrl: process.env.SITE_URL! }),
      convex({ authConfig }),
    ],
  });
