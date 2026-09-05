/**
 * Prayer Check-In Window Thresholds
 *
 * Single source of truth for early/mid/closing stage percentages.
 * See AGENTS.md §4.2 and §7.
 *
 * These constants control when each check-in stage fires within a prayer window.
 */

/**
 * Early check-in fires as soon as the prayer window opens.
 * The user is asked: "Did you go to the masjid?" [Yes/No]
 */
export const EARLY_THRESHOLD_PCT = 0.0;

/**
 * Mid check-in fires at 50% of the window elapsed.
 * The user is asked: "Have you prayed yet?" [Yes / Are you going to pray now?]
 */
export const MID_THRESHOLD_PCT = 0.5;

/**
 * Closing check-in fires this many minutes before the window ends.
 * The user is asked: [Yes / I will pray right now]
 */
export const CLOSING_THRESHOLD_MINUTES = 20;

/**
 * Number of days of absence before the batch catch-up screen appears.
 */
export const ABSENCE_CATCHUP_DAYS = 7;
