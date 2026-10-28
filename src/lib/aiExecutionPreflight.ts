/** A source/model preflight is non-billable; commercial pricing is optional in beta. */
export function validPreflightCost(
  q: { costBasis: string; estimatedCostUsd: number | null },
  budget?: number,
) {
  if (q.costBasis === "usage-only")
    return q.estimatedCostUsd === null && budget === undefined;
  return (
    q.costBasis === "configured-estimate" &&
    typeof budget === "number" &&
    Number.isFinite(budget) &&
    budget > 0 &&
    budget <= 1 &&
    typeof q.estimatedCostUsd === "number" &&
    Number.isFinite(q.estimatedCostUsd) &&
    q.estimatedCostUsd >= 0 &&
    q.estimatedCostUsd <= budget
  );
}
