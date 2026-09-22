export function browserSignInHref(tenantId: string) {
  const parameters = new URLSearchParams({
    returnTo: `/tenants/${tenantId}`,
  });
  return `/bff/login?${parameters.toString()}`;
}
