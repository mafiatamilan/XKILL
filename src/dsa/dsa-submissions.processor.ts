import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DsaService } from './dsa.service';
import { SUBMISSION_QUEUE, SubmissionJobData } from './submission.queue';

/**
 * BullMQ worker that grades queued DSA submissions asynchronously. The HTTP
 * request that created the submission returns immediately; this processor does
 * the (potentially slow) Judge0 work and pushes the verdict over WebSocket.
 */
@Processor(SUBMISSION_QUEUE)
export class DsaSubmissionsProcessor extends WorkerHost {
  private readonly logger = new Logger(DsaSubmissionsProcessor.name);

  constructor(private readonly dsa: DsaService) {
    super();
  }

  override async process(job: Job<SubmissionJobData>): Promise<void> {
    this.logger.log(`Grading submission ${job.data.submissionId}`);
    await this.dsa.gradeSubmission(job.data.submissionId);
  }
}
