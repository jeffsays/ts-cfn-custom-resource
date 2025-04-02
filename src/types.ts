/** @file Provides TypeScript type definitions for the cfn-custom-resource module. */

/**
 * @description
 *
 * Options to configure the cfn-custom-resource module.
 */
export interface ConfigureOptions {
  logLevel: number;
}

/**
 * @description
 *
 * Represents the AWS Lambda context, needed mainly for accessing the log stream name
 */
export interface LambdaContext {
  /**
   * @description
   *
   * The name of the CloudWatch log stream.
   */
  logStreamName: string;
}

/**
 * @description
 *
 * The callback signature for Lambda functions.
 */
export type LambdaCallback = (error: Error | null, result?: unknown) => unknown;

/**
 * @description
 *
 * Defines the shape of CloudFormation's custom resource event object relevant to sending status back to CloudFormation.
 */
export interface CloudFormationEvent {
  /**
   * @description
   *
   * The ARN that identifies the stack.
   */
  StackId: string;

  /**
   * @description
   *
   * A unique ID for this request.
   */
  RequestId: string;

  /**
   * @description
   *
   * The template developer-chosen name (logical name) of the custom resource.
   */
  LogicalResourceId: string;

  /**
   * @description
   *
   * The presigned URL to which the response is sent.
   */
  ResponseURL: string;

  /**
   * @description
   *
   * The physical ID of the resource (if it exists).
   */
  PhysicalResourceId?: string;
}

/**
 * @description
 *
 * Defines the details that must be sent in the response to CloudFormation.
 */
export interface CloudFormationResponseDetails {
  /**
   * @description
   *
   * Must be either "SUCCESS" or "FAILED"
   */
  Status: "SUCCESS" | "FAILED";

  /**
   * @description
   *
   * The reason for a failure. Ignored if the Status is "SUCCESS"
   */
  Reason?: string | Error;

  /**
   * @description
   *
   * The physical resource ID to use or return to CloudFormation.
   */
  PhysicalResourceId: string;

  /**
   * @description
   *
   * Additional data to send back to CloudFormation, if needed.
   */
  Data?: unknown;
}
