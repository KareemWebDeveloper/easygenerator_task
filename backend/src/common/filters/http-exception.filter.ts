import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ProblemDetails {
  status: number;
  title: string;
  detail: string | string[];
  instance: string;
  correlationId: string;
  timestamp: string;
}

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request as any).correlationId ||
      request.headers['x-correlation-id'] ||
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail: string | string[] =
      'An unexpected internal server error occurred.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        detail = res;
        title = exception.name || 'Error';
      } else if (typeof res === 'object' && res !== null) {
        const errorObj = res as Record<string, any>;
        title = errorObj.error || exception.name || 'Error';
        detail = errorObj.message || detail;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    const problemPayload: ProblemDetails = {
      status,
      title,
      detail,
      instance: request.originalUrl || request.url,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] 5xx Error at ${request.method} ${request.url}:`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${status} at ${request.method} ${request.url} - ${JSON.stringify(detail)}`,
      );
    }

    response.status(status).json(problemPayload);
  }
}
