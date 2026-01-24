/**
 * Pricing calculation utilities for transcription services
 */

interface PricingTier {
  model10min: string;
  model30min: string;
  model1hr: string;
  bestFor: string;
}

/**
 * Calculates the cost of transcription based on audio duration and pricing tiers.
 * Uses linear interpolation between pricing tiers for accurate cost estimation.
 *
 * @param audioDurationSeconds - Duration of the audio in seconds
 * @param pricing - Pricing tier object containing rates at different durations
 * @returns Formatted cost string with 3 decimal places, or null if calculation fails
 */
export function calculateTranscriptionCost(
  audioDurationSeconds: number,
  pricing: PricingTier
): string | null {
  if (!audioDurationSeconds || !pricing) {
    return null;
  }

  const durationMinutes = audioDurationSeconds / 60;

  // Extract numeric values from pricing strings (e.g., "$0.02" -> 0.02)
  const price10min = parseFloat(pricing.model10min.replace('$', ''));
  const price30min = parseFloat(pricing.model30min.replace('$', ''));
  const price1hr = parseFloat(pricing.model1hr.replace('$', ''));

  // Validate parsed prices
  if (isNaN(price10min) || isNaN(price30min) || isNaN(price1hr)) {
    return null;
  }

  let cost: number;

  // Calculate cost based on duration with linear interpolation
  if (durationMinutes <= 10) {
    cost = price10min;
  } else if (durationMinutes <= 30) {
    // Linear interpolation between 10min and 30min
    const ratio = (durationMinutes - 10) / 20;
    cost = price10min + (price30min - price10min) * ratio;
  } else if (durationMinutes <= 60) {
    // Linear interpolation between 30min and 1hr
    const ratio = (durationMinutes - 30) / 30;
    cost = price30min + (price1hr - price30min) * ratio;
  } else {
    // For longer than 1 hour, calculate proportionally
    const rate = price1hr / 60; // cost per minute
    cost = durationMinutes * rate;
  }

  return cost.toFixed(3); // Return as string with 3 decimal places
}
