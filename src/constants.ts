/**
 * @description
 *
 * The event type string for "Create"
 */
export const CREATE: "Create" = "Create";

/**
 * @description
 *
 * The event type string for "Update"
 */
export const UPDATE: "Update" = "Update";

/**
 * @description
 *
 * The event type string for "Delete"
 */
export const DELETE: "Delete" = "Delete";

/**
 * @description
 *
 * The success status string, "SUCCESS"
 */
export const SUCCESS: "SUCCESS" = "SUCCESS";

/**
 * @description
 *
 * The failure status string, "FAILED"
 */
export const FAILED: "FAILED" = "FAILED";

/**
 * @description
 *
 * The normal logging level (1)
 */
export const LOG_NORMAL: number = 1;

/**
 * @description
 *
 * The verbose logging level (2)
 */
export const LOG_VERBOSE: number = 2;

/**
 * @description
 *
 * The debug logging level (3)
 */
export const LOG_DEBUG: number = 3;

/**
 * @description
 *
 * The default physical resource ID
 */
export const DEFAULT_PHYSICAL_RESOURCE_ID: string = "NOIDPROVIDED";

/**
 * @description
 *
 * The default reason used when referencing the log stream name.
 */
export const DEFAULT_REASON_WITH_CONTEXT: string = "Details in CloudWatch Log Stream: ";

/**
 * @description
 *
 * The default reason when no other reason is provided
 */
export const DEFAULT_REASON: string = "WARNING: Reason not properly provided for failure";
