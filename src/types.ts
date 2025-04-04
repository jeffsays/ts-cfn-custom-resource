/** @file Provides TypeScript type definitions for the cfn-custom-resource module. */

/** Options to configure the cfn-custom-resource module. */
export interface ConfigureOptions {
  logLevel: number;
}

/** Represents the AWS Lambda context, needed mainly for accessing the log stream name */
export interface LambdaContext {
  /** The name of the CloudWatch log stream. */
  logStreamName: string;
}

/** The callback signature for Lambda functions. */
export type LambdaCallback = (error: Error | null, result?: unknown) => unknown;

/** Defines the shape of CloudFormation's custom resource event object relevant to sending status back to CloudFormation. */
export interface CloudFormationEvent {
  /** The ARN that identifies the stack. */
  StackId: string;

  /** A unique ID for this request. */
  RequestId: string;

  /** The template developer-chosen name (logical name) of the custom resource. */
  LogicalResourceId: string;

  /** The presigned URL to which the response is sent. */
  ResponseURL: string;

  /** The physical ID of the resource (if it exists). */
  PhysicalResourceId?: string;
}

/** Defines the details that must be sent in the response to CloudFormation. */
export interface CloudFormationResponseDetails {
  /** Must be either "SUCCESS" or "FAILED" */
  Status: "SUCCESS" | "FAILED";

  /** The reason for a failure. Ignored if the Status is "SUCCESS" */
  Reason?: string | Error;

  /** The physical resource ID to use or return to CloudFormation. */
  PhysicalResourceId: string;

  /** Additional data to send back to CloudFormation, if needed. */
  Data?: unknown;
}
