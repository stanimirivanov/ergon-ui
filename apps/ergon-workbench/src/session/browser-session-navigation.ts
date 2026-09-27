/**
 * Builds the canonical same-origin sign-in URL for a tenant route.
 *
 * The return location is encoded as one query value and never grants tenant
 * authority; the BFF validates the authenticated session after navigation.
 */
export function browserSignInHref(tenantId: string) {
  const parameters = new URLSearchParams({
    returnTo: `/tenants/${tenantId}`,
  });
  return `/bff/login?${parameters.toString()}`;
}
