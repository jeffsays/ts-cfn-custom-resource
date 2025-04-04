/**
 * Jest tests for the cfn-custom-resource module.
 *
 * @file index.test.ts
 */

import {
  CREATE,
  UPDATE,
  DELETE,
  SUCCESS,
  FAILED,
  DEFAULT_PHYSICAL_RESOURCE_ID,
  LOG_NORMAL,
  LOG_VERBOSE,
  LOG_DEBUG,
} from "./constants"; // Adjust path as needed

import { configure, sendResponse, sendSuccess, sendFailure } from "./index";

// Define our fake callback with typed parameters.
const fakeCallback = jest.fn((error: Error | null, data?: unknown) => {
  if (typeof data !== "undefined") {
    return { error, data };
  }
  return error;
});

// A fake context, used for testing reason injection
const fakeContext = { logStreamName: "fake-logs-1df372" };

// Common constants for events, IDs, reasons, etc.
const fakeStackId = "f3a936";
const fakeReqId = "c4dd7439";
const fakeLogicalResourceId = "testResource";
const fakePhysicalResourceId = "12345a";
const fakePhysicalResourceIdDefault = "NOIDPROVIDED";
const fakeReason = "Something bad happened";
const fakeReasonObj = { ohno: "Something bad happened" };
const fakeReasonError: Error = new Error(fakeReason);
const fakeRespURL: string = "https://google.com/resp/testing?testId=436"; // Not a valid CFN URL, but used for test
const badFakeRespURL: string = "notAURL";
const notExistFakeRespURL: string = "https://thiswebsitedoesntexist1354htrbt3.com/nope?foo=bar";

// Base fake event
const fakeEvent = {
  StackId: fakeStackId,
  RequestId: fakeReqId,
  LogicalResourceId: fakeLogicalResourceId,
  ResponseURL: fakeRespURL,
};

// Variations of the fake event
const badFakeEvent = { ...fakeEvent, ResponseURL: badFakeRespURL };
const physIdFakeEvent = { ...fakeEvent, PhysicalResourceId: fakePhysicalResourceId };
const notExistFakeEvent = { ...fakeEvent, ResponseURL: notExistFakeRespURL };

type responseDetails = {
  Status: "SUCCESS" | "FAILED";
  PhysicalResourceId: string;
};

// Successful response details
const successRespDetails: responseDetails = {
  Status: SUCCESS,
  PhysicalResourceId: fakePhysicalResourceId,
};

const successRespDetailsWithData = {
  ...successRespDetails,
  Data: { test: "I'm some data" },
};

const strData = "I'm some data";
const successRespDetailsWithStrData = {
  ...successRespDetails,
  Data: strData,
};

type ohno = {
  ohno: string;
};

interface failedResponse extends responseDetails {
  Reason: string | Error | undefined;
}

// Failed response details
const failedRespDetailsNoReason = {
  Status: FAILED,
  PhysicalResourceId: fakePhysicalResourceId,
};

const failedRespDetails: failedResponse = {
  ...failedRespDetailsNoReason,
  Reason: fakeReason,
};

const failedRespDetailsObjReason: failedResponse = {
  ...failedRespDetailsNoReason,
  // @ts-ignore
  Reason: fakeReasonObj,
};

const failedRespDetailsErrorReason: failedResponse = {
  ...failedRespDetailsNoReason,
  Reason: fakeReasonError,
};

// Error references
const noEventError = new Error("CRITICAL: no event, cannot send response");
const noRespDetailsError = new Error("CRITICAL: no response details, cannot send response");
const reasonContextErrorMsg = `Details in CloudWatch Log Stream: ${fakeContext.logStreamName}`;
const reasonContextError = new Error(reasonContextErrorMsg);
const reasonDefaultErrorMsg = "WARNING: Reason not properly provided for failure";
const reasonDefaultError = new Error(reasonDefaultErrorMsg);

// Extend Jest with a custom matcher to check if something is an Error
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAnError(): R;
    }
    interface Expect {
      toBeAnError<T>(): any;
    }
  }
}

expect.extend({
  toBeAnError(received: unknown) {
    // "Duck typing" to check if it's an Error instance
    const pass =
      !!received
      && typeof received === "object"
      && "message" in received
      && "stack" in received
      && (received as Error).constructor.name.includes("Error");

    return {
      pass,
      message: (): string => `Expected ${received} ${pass ? "not " : ""}to be an Error`,
    };
  },
});

describe("cfn-custom-resource TypeScript Module", () => {
  it("should export correct constants", () => {
    expect(CREATE).toBe("Create");
    expect(UPDATE).toBe("Update");
    expect(DELETE).toBe("Delete");
    expect(SUCCESS).toBe("SUCCESS");
    expect(FAILED).toBe("FAILED");
    expect(DEFAULT_PHYSICAL_RESOURCE_ID).toBe("NOIDPROVIDED");
  });

  it("should allow configuring log level without error", () => {
    // No errors expected, just verifying it runs
    configure({ logLevel: 3 });
    expect(true).toBe(true);
  });
});

describe("Pure Errors", () => {
  test("Resolved Promise with thrown error to callback if event is omitted", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, null as any, fakeCallback)).resolves.toEqual(noEventError);
  });

  test("Resolved Promise with thrown error if no callback and event omitted", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, null as any)).resolves.toThrow(noEventError);
  });

  test("Resolved Promise with thrown error to callback if response details omitted", () => {
    expect.assertions(1);
    return expect(sendResponse(null as any, fakeEvent, fakeCallback)).resolves.toEqual(noRespDetailsError);
  });

  test("Resolved Promise with thrown error if no callback and response details omitted", () => {
    expect.assertions(1);
    return expect(sendResponse(null as any, fakeEvent)).resolves.toThrow(noRespDetailsError);
  });
});

describe("Proper Success sendResponses", () => {
  test("Resolved Promise => { error: null } to callback for success response", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, fakeEvent, fakeCallback)).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  test("Resolved Promise => null (no callback) for success response", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, fakeEvent)).resolves.toEqual(null);
  });

  test("Resolved Promise => { error: null, data } for success response with data", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetailsWithData, fakeEvent, fakeCallback)).resolves.toEqual({
      error: null,
      data: successRespDetailsWithData.Data,
    });
  });

  test("Resolved Promise => data (no callback) for success response with data", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetailsWithData, fakeEvent)).resolves.toEqual(
      successRespDetailsWithData.Data
    );
  });

  test("Resolved Promise => { error: null, data: { data: string } } if non-object data", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetailsWithStrData, fakeEvent, fakeCallback)).resolves.toEqual({
      error: null,
      data: { data: strData },
    });
  });

  test("Resolved Promise => { data: string } if no callback and non-object data", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetailsWithStrData, fakeEvent)).resolves.toEqual({
      data: strData,
    });
  });
});

describe("Improper Success sendResponses", () => {
  test("Resolved => error (callback) if success but bad response URL", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, badFakeEvent, fakeCallback)).resolves.toBeAnError();
  });

  test("Resolved => throw if success but bad response URL (no callback)", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, badFakeEvent)).resolves.toThrow();
  });

  test("Resolved => error (callback) if success but non-existent response URL", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, notExistFakeEvent, fakeCallback)).resolves.toBeAnError();
  });

  test("Resolved => throw if success but non-existent response URL (no callback)", () => {
    expect.assertions(1);
    return expect(sendResponse(successRespDetails, notExistFakeEvent)).resolves.toThrow();
  });
});

describe("Proper Failed sendResponses", () => {
  test("Resolved => { error: reason } to callback for failed response", () => {
    expect.assertions(1);
    return expect(sendResponse(failedRespDetails, fakeEvent, fakeCallback)).resolves.toEqual(fakeReasonError);
  });

  test("Resolved => { error: JSON.stringified(reasonObj) } to callback for object reason", () => {
    expect.assertions(1);
    return expect(sendResponse(failedRespDetailsObjReason, fakeEvent, fakeCallback)).resolves.toBeAnError();
    //   .toEqual({
    //   error: failedRespDetailsObjReason.Reason
    // });
  });

  test("Resolved => { error: JSON.stringified(reasonError.stack) } to callback for Error reason", () => {
    expect.assertions(1);
    return expect(sendResponse(failedRespDetailsErrorReason, fakeEvent, fakeCallback)).resolves.toBeAnError(); // ({error: fakeReasonError})
    //  ) .resolves.toEqual(
    //   {error: failedRespDetailsErrorReason.Reason}
    // );
  });

  test("Resolved => throw if no callback for failed response", () => {
    expect.assertions(1);
    return expect(sendResponse(failedRespDetails, fakeEvent)).resolves.toThrow();
  });
});

describe("Proper sendSuccesses", () => {
  test("Resolved => { error: null } to callback for success", () => {
    expect.assertions(1);
    return expect(sendSuccess(fakePhysicalResourceId, null, fakeEvent, fakeCallback)).resolves.toEqual({
      data: null,
      error: null,
    });
  });

  test("Resolved => { error: null, data } to callback for success with data", () => {
    expect.assertions(1);
    return expect(
      sendSuccess(fakePhysicalResourceId, successRespDetailsWithData.Data, fakeEvent, fakeCallback)
    ).resolves.toEqual({
      error: null,
      data: successRespDetailsWithData.Data,
    });
  });
});

describe("Proper sendFailures", () => {
  test("Resolved => { error: reason } to callback for failed response", () => {
    expect.assertions(1);
    return expect(
      sendFailure(fakeReason, fakeEvent, fakeCallback, fakeContext, fakePhysicalResourceId)
    ).resolves.toEqual(fakeReasonError);
  });

  test("Resolved => throw if no callback for failed response", () => {
    expect.assertions(1);
    return expect(
      sendFailure(fakeReason, fakeEvent, null as any, fakeContext, fakePhysicalResourceId)
    ).resolves.toThrow(fakeReasonError);
  });

  test("Resolved => { error: reason } to callback (omitting context param)", () => {
    expect.assertions(1);
    return expect(sendFailure(fakeReason, fakeEvent, fakeCallback, fakePhysicalResourceId as any)).resolves.toEqual(
      fakeReasonError
    );
  });

  test("Resolved => throw if no callback (omitting context param)", () => {
    expect.assertions(1);
    // @ts-ignore null intentional
    return expect(sendFailure(fakeReason, fakeEvent, null as any, null, fakePhysicalResourceId)).resolves.toThrow(
      fakeReasonError
    );
  });

  test("Resolved => { error: reasonContextErrorMsg } if reason is null and context is provided", () => {
    expect.assertions(1);
    return expect(
      // @ts-ignore null intentional
      sendFailure(null, fakeEvent, fakeCallback, fakeContext, fakePhysicalResourceId)
    ).resolves.toEqual(reasonContextError);
  });

  test("Resolved => throw with reasonContextError if no callback and reason is null", () => {
    expect.assertions(1);
    return expect(
      // @ts-ignore null intentional
      sendFailure(null, fakeEvent, null as any, fakeContext, fakePhysicalResourceId)
    ).resolves.toThrow(reasonContextError);
  });

  test("Resolved => { error: reasonDefaultErrorMsg } if reason is null and no context provided", () => {
    expect.assertions(1);
    return expect(
      // @ts-ignore null intentional
      sendFailure(null, fakeEvent, fakeCallback, null, fakePhysicalResourceId)
    ).resolves.toEqual(reasonDefaultError);
  });

  test("Resolved => throw with reasonDefaultError if no callback, reason is null, and no context provided", () => {
    expect.assertions(1);
    // @ts-ignore null intentional
    return expect(sendFailure(null, fakeEvent, null as any, null, fakePhysicalResourceId)).resolves.toThrow(
      reasonDefaultError
    );
  });

  test("Uses default physical resource ID if not provided, logs it at debug level, returns error to callback", () => {
    expect.assertions(2);
    configure({ logLevel: LOG_DEBUG });
    const logSpy = jest.spyOn(global.console, "log");
    return sendFailure(fakeReason, fakeEvent, fakeCallback, fakeContext).then((result) => {
      // The default PhysicalResourceId is "NOIDPROVIDED"
      expect(logSpy).toHaveBeenCalledWith(fakePhysicalResourceIdDefault);
      expect(result).toStrictEqual(fakeReasonError);
      configure({ logLevel: LOG_NORMAL });
      logSpy.mockRestore();
    });
  });

  test("Uses event's PhysicalResourceId if provided, logs it at debug level, returns error to callback", () => {
    expect.assertions(2);
    configure({ logLevel: LOG_DEBUG });
    const logSpy = jest.spyOn(global.console, "log");
    return sendFailure(fakeReason, physIdFakeEvent, fakeCallback, fakeContext).then((result) => {
      expect(logSpy).toHaveBeenCalledWith(fakePhysicalResourceId);
      expect(result).toStrictEqual(fakeReasonError);
      configure({ logLevel: LOG_NORMAL });
      logSpy.mockRestore();
    });
  });
});

describe("Test Logging", () => {
  test("LOG_NORMAL => minimal logs", () => {
    configure({ logLevel: LOG_NORMAL });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    const EXPECTED_LOG_COUNT = 1;
    return sendResponse(successRespDetails, fakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledTimes(EXPECTED_LOG_COUNT);
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_NORMAL => logs error message if no event", () => {
    configure({ logLevel: LOG_NORMAL });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, null as any, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(noEventError.message);
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_NORMAL => logs error message if no responseDetails", () => {
    configure({ logLevel: LOG_NORMAL });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(null as any, fakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(noRespDetailsError.message);
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_NORMAL => logs minimal error for bad response URL", () => {
    configure({ logLevel: LOG_NORMAL });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, badFakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(expect.any(String));
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_NORMAL => logs minimal error for non-existent response URL", () => {
    configure({ logLevel: LOG_NORMAL });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, notExistFakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(expect.any(String));
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_VERBOSE => more logs", () => {
    const EXPECTED_LOG_COUNT = 8;
    configure({ logLevel: LOG_VERBOSE });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, fakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledTimes(EXPECTED_LOG_COUNT);
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_DEBUG => logs entire error if no event", () => {
    configure({ logLevel: LOG_DEBUG });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, null as any, fakeCallback).then(() => {
      expect.assertions(1);
      // It should have been called with the full Error object
      expect(logSpy).toHaveBeenCalledWith(noEventError);
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_DEBUG => logs entire error if no responseDetails", () => {
    configure({ logLevel: LOG_DEBUG });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(null as any, fakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(noRespDetailsError);
      logSpy.mockRestore();
      configure({ logLevel: LOG_NORMAL });
    });
  });

  test("LOG_DEBUG => logs entire error for bad response URL", () => {
    configure({ logLevel: LOG_DEBUG });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, badFakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(expect.toBeAnError());
      logSpy.mockRestore();
      configure({ logLevel: LOG_DEBUG });
    });
  });

  test("LOG_DEBUG => logs entire error for non-existent response URL", () => {
    configure({ logLevel: LOG_DEBUG });
    const logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReset();

    return sendResponse(successRespDetails, notExistFakeEvent, fakeCallback).then(() => {
      expect.assertions(1);
      expect(logSpy).toHaveBeenCalledWith(expect.toBeAnError());
      logSpy.mockRestore();
      configure({ logLevel: LOG_DEBUG });
    });
  });
});
