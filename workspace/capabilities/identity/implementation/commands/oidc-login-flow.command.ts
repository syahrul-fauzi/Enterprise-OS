
import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { URL } from "url";

// For this PoC, we'll hardcode the OIDC client details.
// In a real application, this would be configured elsewhere.
const OIDC_CLIENT_ID = 'auth-code-client';
const OIDC_CLIENT_SECRET = 'secret';
const OIDC_REDIRECT_URI = 'http://127.0.0.1:8080/api/auth/callback';
const HYDRA_PUBLIC_URL = 'http://127.0.0.1:4444';

export const OidcLoginFlowInputSchema = z.object({});

export type OidcLoginFlowInput = z.infer<typeof OidcLoginFlowInputSchema>;

export type OidcLoginFlowOutput = {
  readonly authorizationUrl: string;
};

type OidcLoginFlowCommand = CapabilityCommand<OidcLoginFlowInput, OidcLoginFlowOutput>;

export const oidcLoginFlowCommand: OidcLoginFlowCommand = {
  kind: "command",
  name: "identity.oidcLoginFlow",
  version: "1.0.0",

  async execute(input) {
    const authUrl = new URL('/oauth2/auth', HYDRA_PUBLIC_URL);
    authUrl.searchParams.set('client_id', OIDC_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', OIDC_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid');

    return {
      authorizationUrl: authUrl.toString(),
    };
  },
};