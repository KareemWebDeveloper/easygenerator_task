import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('System')
@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongooseHealth: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Verifies server uptime and MongoDB database connectivity.',
  })
  @ApiResponse({
    status: 200,
    description: 'System and database are healthy.',
  })
  check() {
    return this.health.check([
      () => this.mongooseHealth.pingCheck('mongodb'),
    ]);
  }
}
