export async function resolveCompanyId(): Promise<string> {
  return process.env.DEFAULT_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001'
}
