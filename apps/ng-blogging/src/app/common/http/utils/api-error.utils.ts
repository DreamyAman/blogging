import { HttpErrorResponse, HttpStatusCode } from "@angular/common/http";
import {
  IApiErrorResponse,
  IBadRequestError,
  IErrorType,
  ISerializedErrorResponse,
} from "../../types/error-response.types";
import { ErrorStatus } from "../../types/error.constants";
import { throwError } from "rxjs";

export function handleApiError(errResp: HttpErrorResponse | Error) {
  const error = {} as ISerializedErrorResponse;

  const isHttpErrorResponse = errResp instanceof HttpErrorResponse;

  if (!isHttpErrorResponse) {
    error.message = "Something went wrong. Please try again.";
    error.status = ErrorStatus.UNKNOWN;
    return throwError(() => error);
  }

  const apiErrorResp = errResp.error as IApiErrorResponse;

  error.message = apiErrorResp.error?.message;
  error.status = apiErrorResp.error?.status;

  if (errResp.status === 0) {
    console.error(error.message);
    error.message =
      "Something went wrong. Please check your internet connection or try again after sometime.";
    error.status = ErrorStatus.UNKNOWN;
  }

  else if (!apiErrorResp) {
    error.message = errResp.message || "Something went wrong. Contact support.";
    error.status = ErrorStatus.UNKNOWN;
  }

  else if (errResp.status === HttpStatusCode.BadRequest) {
    const badRequestError = apiErrorResp.error.details.find((errorDetail) => {
      return (errorDetail as IErrorType)["@type"].includes("BadRequest");
    });

    error.details = (badRequestError as IBadRequestError).fieldViolations;
  }

  else if (errResp.status === HttpStatusCode.Conflict) {
    error.details = apiErrorResp.error.details.find((errorDetail) => {
      return (errorDetail as IErrorType)["@type"].includes("ErrorInfo");
    });
  }

  else if (errResp.status === HttpStatusCode.Unauthorized) {
    error.details = apiErrorResp.error.details.find((errorDetail) => {
      return (errorDetail as IErrorType)["@type"].includes("ErrorInfo");
    });
  }

  else if (errResp.status < 500) {
    error.details = apiErrorResp.error.details.find((errorDetail) => {
      const errorType = (errorDetail as IErrorType)["@type"];

      return (
        errorType.includes("ErrorInfo") ||
        errorType.includes("ResourceInfo") ||
        errorType.includes("LocalizedMessage")
      );
    });
  }

  else if (errResp.status >= 500) {
    error.status = ErrorStatus.INTERNAL;
    error.message = "Something went wrong. Please try again after sometime.";
  }

  return throwError(() => error);
}
