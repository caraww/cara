/* A payment verification is only accepted when the gateway reports an amount
   and that amount exactly matches the server-calculated order total. Missing
   amounts must fail closed instead of marking an order paid. */
export function verifiedAmountMatches(verification, expectedRial) {
  const amount = Number(verification && verification.amount);
  const expected = Math.round(Number(expectedRial));
  return Number.isSafeInteger(amount) && amount > 0 && amount === expected;
}
