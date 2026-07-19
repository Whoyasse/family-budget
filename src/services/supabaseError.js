export function getSupabaseErrorDetails(error, operation) {
  const details = {
    operation,
    code: error?.code || 'unknown',
    message: error?.message || 'Unknown Supabase error',
    details: error?.details || null,
    hint: error?.hint || null,
    status: error?.status || null
  };
  console.error(`[Supabase] ${operation}`, details);
  return details;
}

export function throwSupabaseError(error, operation) {
  const details = getSupabaseErrorDetails(error, operation);
  const suffix = [
    details.code !== 'unknown' ? details.code : null,
    details.message,
    details.hint
  ].filter(Boolean).join(': ');
  const wrapped = new Error(`${operation}: ${suffix}`);
  wrapped.supabase = details;
  throw wrapped;
}

export function describeSupabaseError(error, fallback) {
  if (!error) return fallback;
  const details = error.supabase || getSupabaseErrorDetails(error, 'request');
  return `${fallback}. ${details.code}: ${details.message}${details.hint ? ` (${details.hint})` : ''}`;
}
