/** @file Provides the TypeScript implementation of the cfn-custom-resource module. */

import * as https from "https";
import { URL } from "node:url";
import {
  CloudFormationEvent,
  CloudFormationResponseDetails,
  ConfigureOptions,
  LambdaCallback,
  LambdaContext,
} from "./types";

import {
  SUCCESS,
  FAILED,
  LOG_NORMAL,
  LOG_VERBOSE,
  LOG_DEBUG,
  DEFAULT_PHYSICAL_RESOURCE_ID,
  DEFAULT_REASON_WITH_CONTEXT,
  DEFAULT_REASON,
} from "./constants";

/**
 * @description
 *
 * Internal options object to hold configuration like logLevel. Initialized to LOG_NORMAL
 */
const opts: ConfigureOptions = {
  logLevel: LOG_NORMAL,
};

/**
 * @description
 *
 * Configures the cfn-custom-resource module with the given options.
 *
 * @param   {ConfigureOptions} options - The configuration options.
 *
 * @returns {void}                     No return value.
 */
export function configure(options: ConfigureOptions): void {
  Object.assign(opts, options);
}

/**
 * @description
 *
 * Mocks a callback if one is not provided, returning the intended callback value.
 *
 * @param   {Error | string | null}  error  - The error encountered, if any.
 * @param   {unknown}                result - The result value (if any).
 *
 * @returns {Error | unknown | null}        Either an Error, the result, or null.
 */
function mockCallback(error: Error | string | null, result: unknown): Error | unknown | null {
  if (error !== null) {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }

  if (typeof result !== "undefined" && result !== null) {
    return result;
  }

  return null;
}

/**
 * @description
 *
 * Sends a success or failure response to CloudFormation.
 *
 * @param   {CloudFormationResponseDetails} responseDetails Details of the response (Status, Reason, etc.).
 * @param   {CloudFormationEvent}           event           The CloudFormation custom resource event.
 * @param   {LambdaCallback}                [callback]      The optional Lambda callback.
 *
 * @returns {Promise<unknown>}                              Promise that resolves or rejects based on the response
 *   result.
 */
export async function sendResponse(
  responseDetails: CloudFormationResponseDetails,
  event: CloudFormationEvent,
  callback?: LambdaCallback
): Promise<unknown> {
  if (opts.logLevel >= LOG_VERBOSE) {
    console.log(responseDetails);
    console.log(event);
  }

  const internalCallback: LambdaCallback = callback ?? mockCallback;

  let result: unknown;

  try {
    result = await sendResponseInternal(responseDetails, event);
  } catch (err: unknown) {
    if (opts.logLevel >= LOG_DEBUG && err instanceof Error) {
      console.log(err);
    } else if (err instanceof Error) {
      console.log(err.message);
    }
    return internalCallback(err instanceof Error ? err : new Error(String(err)));
  }

  return internalCallback(null, result);
}

/**
 * @description
 *
 * Internal function to send the response to CloudFormation regarding the success/failure of a custom resource deploy.
 *
 * @param   {CloudFormationResponseDetails} responseDetails Details of the response (Status, Reason, etc.).
 * @param   {CloudFormationEvent}           event           The CloudFormation custom resource event.
 *
 * @returns {Promise<unknown>}                              Promise that resolves with additional data or null, or
 *   rejects if an error.
 */
async function sendResponseInternal(
  responseDetails: CloudFormationResponseDetails,
  event: CloudFormationEvent
): Promise<unknown> {
  if (!event) {
    throw new Error("CRITICAL: no event, cannot send response");
  }

  if (!responseDetails) {
    throw new Error("CRITICAL: no response details, cannot send response");
  }

  // Ensure "Data" is an object if it exists
  if (
    typeof responseDetails.Data !== "undefined"
    && responseDetails.Data !== null
    && typeof responseDetails.Data !== "object"
  ) {
    responseDetails.Data = { data: responseDetails.Data };
  }

  // Ensure "Reason" is a string if it exists
  if (typeof responseDetails.Reason !== "undefined" && responseDetails.Reason !== null) {
    if (responseDetails.Reason instanceof Error) {
      responseDetails.Reason = responseDetails.Reason.stack ?? String(responseDetails.Reason);
    }
  }

  const { Status, Reason, PhysicalResourceId, Data } = responseDetails;
  const { StackId, RequestId, LogicalResourceId, ResponseURL } = event;

  let respUrl: URL;

  try {
    respUrl = new URL(ResponseURL);
  } catch (urlError) {
    throw new Error(String(urlError));
  }

  const { hostname, protocol, pathname, search } = respUrl;
  const path: string = `${pathname}${search}`;
  const responseBodyStr: string = JSON.stringify({
    Status,
    ...(Reason ? { Reason } : {}),
    PhysicalResourceId,
    StackId,
    RequestId,
    LogicalResourceId,
    ...(Data ? { Data } : {}),
  });
  const headers = {
    "content-type": "",
    "content-length": responseBodyStr.length,
  };

  // Some Node.js type definitions do not include "protocol" in https.RequestOptions, so we intersect it.
  const requestOptions: https.RequestOptions & { protocol: string } = {
    hostname,
    protocol,
    path,
    method: "PUT",
    headers,
  };

  if (opts.logLevel >= LOG_VERBOSE) {
    console.log(JSON.stringify(requestOptions));
    console.log(responseBodyStr);
  }

  return new Promise<void>((resolve: () => void, reject: (reason: unknown) => void) => {
    const request = https.request(requestOptions, (res) => {
      console.log("Response sent.");

      // Capture response body if verbose logging
      if (opts.logLevel >= LOG_VERBOSE) {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

        let body: string = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });

        res.on("end", () => {
          console.log(`RESPONSE BODY: ${body}`);
          resolve();
        });
      } else {
        resolve();
      }
    });

    request.on("error", (error: Error) => {
      reject(error);
    });

    request.write(responseBodyStr);
    request.end();
  })
  .then(() => {
    if (Status === FAILED) {
      // Throw the reason string if we have one; otherwise, throw a generic error
      throw Reason ?? new Error("Failed status with no reason provided.");
    }
    if (typeof Data !== "undefined" && Data !== null) {
      return Data;
    }
    return null;
  })
  .catch(err => {
    const debugString = `CRITICAL: Error sending response due to: [${String(err)}]`;
    console.log(opts.logLevel >= LOG_DEBUG ? err : debugString);
    throw err;
  });
}

/**
 * @description
 *
 * Sends a success response to CloudFormation, wrapping sendResponse.
 *
 * @param   {string}              physicalResourceId - The Physical Resource Id for the resource.
 * @param   {unknown}             data               - Additional data to send. If not an object, it is wrapped in `{
 *   data }`.
 * @param   {CloudFormationEvent} event              - The CloudFormation custom resource event.
 * @param   {LambdaCallback}      [callback]         - The optional Lambda callback.
 *
 * @returns {Promise<unknown>}                       Promise that resolves with the Data or null, or rejects if an
 *   error.
 */
export async function sendSuccess(
  physicalResourceId: string,
  data: unknown,
  event: CloudFormationEvent,
  callback?: LambdaCallback
): Promise<unknown> {
  return sendResponse(
    {
      Status: SUCCESS,
      Reason: "",
      PhysicalResourceId: physicalResourceId,
      Data: data,
    },
    event,
    callback
  );
}

/**
 * @description
 *
 * Sends a failure response to CloudFormation, wrapping sendResponse.
 *
 * @param   {string | Error | undefined} reason               The reason for the failure. Defaults if not provided.
 * @param   {CloudFormationEvent}        event                The CloudFormation custom resource event.
 * @param   {LambdaCallback}             [callback]           The optional Lambda callback.
 * @param   {LambdaContext}              [context]            The Lambda context (used for a more helpful default
 *   reason).
 * @param   {string}                     [physicalResourceId] Overrides the Physical Resource Id for the response.
 *
 * @returns {Promise<unknown>}                                Promise that resolves or rejects based on the response
 *   result.
 */
export async function sendFailure(
  reason: string | Error | undefined,
  event: CloudFormationEvent,
  callback?: LambdaCallback,
  context?: LambdaContext,
  physicalResourceId?: string
): Promise<unknown> {
  const defaultReason: string = context ? `${DEFAULT_REASON_WITH_CONTEXT}${context.logStreamName}` : DEFAULT_REASON;

  const finalReason: string | Error = reason ?? defaultReason;

  const defaultPhysicalResourceId: string = event.PhysicalResourceId ?? DEFAULT_PHYSICAL_RESOURCE_ID;

  const finalPhysicalResourceId: string = physicalResourceId ?? defaultPhysicalResourceId;

  if (opts.logLevel >= LOG_DEBUG) {
    console.log(finalPhysicalResourceId);
  }

  return sendResponse(
    {
      Status: FAILED,
      Reason: finalReason,
      PhysicalResourceId: finalPhysicalResourceId,
    },
    event,
    callback
  );
}
