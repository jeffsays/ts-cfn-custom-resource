/** The event type string for "Create" */
export const CREATE: "Create" = "Create";

/** The event type string for "Update" */
export const UPDATE: "Update" = "Update";

/** The event type string for "Delete" */
export const DELETE: "Delete" = "Delete";

/** The success status string, "SUCCESS" */
export const SUCCESS: "SUCCESS" = "SUCCESS";

/** The failure status string, "FAILED" */
export const FAILED: "FAILED" = "FAILED";

/** The normal logging level (1) */
export const LOG_NORMAL: number = 1;

/** The verbose logging level (2) */
export const LOG_VERBOSE: number = 2;

/** The debug logging level (3) */
export const LOG_DEBUG: number = 3;

/** The default physical resource ID */
export const DEFAULT_PHYSICAL_RESOURCE_ID: string = "NOIDPROVIDED";

/** The default reason used when referencing the log stream name. */
export const DEFAULT_REASON_WITH_CONTEXT: string = "Details in CloudWatch Log Stream: ";

/** The default reason when no other reason is provided */
export const DEFAULT_REASON: string = "WARNING: Reason not properly provided for failure";
