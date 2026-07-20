export function normalizeTransactionComment(comment) {
  return typeof comment === 'string' ? comment : '';
}

export function isVisibleTransactionComment(comment) {
  return normalizeTransactionComment(comment).trim().length > 0;
}
