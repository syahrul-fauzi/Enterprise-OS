#!/bin/bash
set -e

# Wait for Hydra to start
echo "Waiting for Hydra admin API to be available..."
sleep 10

# Register LawyersHub as an OIDC client with Hydra using container's CLI
echo "Registering LawyersHub OIDC client with Hydra..."
docker compose exec -T hydra hydra create oauth2-client \
  --endpoint http://127.0.0.1:4445 \
  --grant-type authorization_code,refresh_token \
  --response-type code,id_token \
  --scope openid,email,profile \
  --redirect-uri http://127.0.0.1:3002/api/auth/callback \
  --name "LawyersHub Web Application" \
  --secret lawyershub-secret \
  --token-endpoint-auth-method client_secret_basic

echo "OIDC client registration complete!"
echo "Client ID: lawyershub-client"
echo "Client Secret: lawyershub-secret"