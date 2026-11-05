import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = req.headers[CORRELATION_ID_HEADER];

    // Senior Decision: Never blindly trust incoming correlation IDs.
    // Validate format: must be valid UUID v4. If invalid or missing, generate a new one.
    let correlationId: string;
    if (
      typeof rawHeader === 'string' &&
      rawHeader.length <= 64 &&
      uuidValidate(rawHeader)
    ) {
      correlationId = rawHeader;
    } else {
      correlationId = uuidv4();
    }

    // Attach to request object and response headers
    (req as any).correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
