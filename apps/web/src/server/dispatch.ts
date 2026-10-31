import type { ApiError } from '@promise-keeper/contracts';
import type { AppEnv } from '@promise-keeper/runtime';

export class AppHttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly fieldErrors?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    retryable = false,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.fieldErrors = fieldErrors;
    this.name = 'AppHttpError';
  }

  public toResponse(requestId = crypto.randomUUID()): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId,
        retryable: this.retryable,
        fieldErrors: this.fieldErrors,
      },
    };
  }
}

export function mapErrorToResponse(
  error: unknown,
  requestId = crypto.randomUUID(),
): { statusCode: number; body: ApiError } {
  if (error instanceof AppHttpError) {
    return {
      statusCode: error.statusCode,
      body: error.toResponse(requestId),
    };
  }

  if (error instanceof Error) {
    if (error.name === 'ZodError') {
      return {
        statusCode: 400,
        body: {
          error: {
            code: 'INVALID_INPUT',
            message: 'Input validation failed',
            requestId,
            retryable: false,
          },
        },
      };
    }

    if (error.name === 'VersionConflictError') {
      return {
        statusCode: 409,
        body: {
          error: {
            code: 'VERSION_CONFLICT',
            message: error.message,
            requestId,
            retryable: true,
          },
        },
      };
    }

    if (error.name === 'CrossTenantAccessError') {
      return {
        statusCode: 404, // Avoid existence leak across tenants
        body: {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found or inaccessible',
            requestId,
            retryable: false,
          },
        },
      };
    }
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred',
        requestId,
        retryable: false,
      },
    },
  };
}

export function enforceProductionProviderRules(env: AppEnv, providerName: string, isMock: boolean): void {
  if (env.NODE_ENV === 'production' && isMock) {
    throw new AppHttpError(
      503,
      'MOCK_PROVIDER_PROHIBITED_IN_PRODUCTION',
      `Mock provider ${providerName} is strictly prohibited in production mode. Dedicated provider configuration is required.`,
      false,
    );
  }
}
