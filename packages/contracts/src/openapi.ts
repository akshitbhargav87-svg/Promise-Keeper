export const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Promise Keeper Domain API',
    version: '1.0.0',
    description:
      'Authoritative HTTP API for Promise Keeper: evidence vault, automatic email tracking, brand directory, promise timelines, subscriptions, grounded assistant, and action center.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Default API v1 Base Path',
    },
  ],
  paths: {
    '/health/live': {
      get: {
        summary: 'Minimal liveness check',
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                    service: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['status', 'service', 'timestamp'],
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        summary: 'Readiness check verifying database and storage connectivity',
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ready'] },
                    service: { type: 'string' },
                    mode: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['status', 'service', 'mode', 'timestamp'],
                },
              },
            },
          },
          '503': {
            description: 'Service not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}': {
      get: {
        summary: 'Get background job status',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Job status and sanitized metadata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobRef' },
              },
            },
          },
          '404': {
            description: 'Job not found or inaccessible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/me': {
      get: {
        summary: 'Get current authenticated principal and workspace context',
        responses: {
          '200': {
            description: 'Current user and active workspace',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Principal' },
              },
            },
          },
        },
      },
    },
    '/evidence': {
      get: {
        summary: 'List evidence assets in workspace',
        responses: {
          '200': {
            description: 'Page of evidence records',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/EvidenceRecord' },
                    },
                    nextCursor: { type: ['string', 'null'] },
                  },
                  required: ['items', 'nextCursor'],
                },
              },
            },
          },
        },
      },
    },
    '/promises': {
      get: {
        summary: 'List promises in workspace',
        responses: {
          '200': {
            description: 'Page of promises',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PromiseRecord' },
                    },
                    nextCursor: { type: ['string', 'null'] },
                  },
                  required: ['items', 'nextCursor'],
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new promise record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePromiseRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created promise',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PromiseRecord' },
              },
            },
          },
          '409': {
            description: 'Version or idempotency conflict',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/comparisons': {
      post: {
        summary: 'Compare promise terms against observed evidence',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  promiseId: { type: 'string' },
                  observedEvidenceId: { type: 'string' },
                },
                required: ['promiseId', 'observedEvidenceId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Deterministic delta comparison result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ComparisonResult' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Money: {
        type: 'object',
        properties: {
          minor: {
            type: 'string',
            pattern: '^-?\\d+$',
            description: 'Integer string minor units',
          },
          currency: {
            type: 'string',
            minLength: 3,
            maxLength: 3,
            description: 'ISO 4217 currency code',
          },
        },
        required: ['minor', 'currency'],
      },
      Principal: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          workspaceId: { type: 'string', format: 'uuid' },
          roles: { type: 'array', items: { type: 'string' } },
          sessionId: { type: 'string', format: 'uuid' },
        },
        required: ['userId', 'workspaceId', 'roles', 'sessionId'],
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              retryable: { type: 'boolean' },
              fieldErrors: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
            },
            required: ['code', 'message', 'requestId', 'retryable'],
          },
        },
        required: ['error'],
      },
      JobRef: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
          },
        },
        required: ['jobId', 'status'],
      },
      SourceRef: {
        type: 'object',
        properties: {
          evidenceId: { type: 'string' },
          assetVersion: { type: 'integer', minimum: 1 },
          spanId: { type: 'string' },
        },
        required: ['evidenceId', 'assetVersion', 'spanId'],
      },
      EvidenceRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          mimeType: { type: 'string' },
          fileSize: { type: 'integer' },
          sha256: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'workspaceId', 'mimeType', 'fileSize', 'sha256', 'createdAt'],
      },
      PromiseRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          brandId: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string' },
          status: { type: 'string', enum: ['active', 'fulfilled', 'breached', 'expired'] },
          version: { type: 'integer', minimum: 1 },
          money: { $ref: '#/components/schemas/Money' },
          sourceRefs: {
            type: 'array',
            items: { $ref: '#/components/schemas/SourceRef' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'workspaceId',
          'brandId',
          'title',
          'category',
          'status',
          'version',
          'createdAt',
          'updatedAt',
        ],
      },
      CreatePromiseRequest: {
        type: 'object',
        properties: {
          brandId: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string' },
          money: { $ref: '#/components/schemas/Money' },
          sourceRefs: {
            type: 'array',
            items: { $ref: '#/components/schemas/SourceRef' },
          },
        },
        required: ['brandId', 'title', 'category'],
      },
      ComparisonResult: {
        type: 'object',
        properties: {
          promised: { $ref: '#/components/schemas/Money' },
          observed: { $ref: '#/components/schemas/Money' },
          delta: { $ref: '#/components/schemas/Money' },
          status: { type: 'string', enum: ['match', 'possible_mismatch', 'breach'] },
          explanation: { type: 'string' },
        },
        required: ['promised', 'observed', 'delta', 'status', 'explanation'],
      },
    },
  },
} as const;
