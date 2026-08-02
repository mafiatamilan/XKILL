import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { DsaService } from './dsa.service';
import { DsaSubmissionsProcessor } from './dsa-submissions.processor';
import { SubmissionJobData } from './submission.queue';

describe('DsaSubmissionsProcessor', () => {
  let processor: DsaSubmissionsProcessor;
  let dsa: { gradeSubmission: jest.Mock };

  beforeEach(async () => {
    dsa = { gradeSubmission: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [DsaSubmissionsProcessor, { provide: DsaService, useValue: dsa }],
    }).compile();
    processor = module.get(DsaSubmissionsProcessor);
  });

  it('grades the submission referenced by the job data', async () => {
    const job = { data: { submissionId: 's1' } } as unknown as Job<SubmissionJobData>;
    await processor.process(job);
    expect(dsa.gradeSubmission).toHaveBeenCalledWith('s1');
  });

  it('propagates grading errors to BullMQ for retry handling', async () => {
    dsa.gradeSubmission.mockRejectedValue(new Error('judge down'));
    const job = { data: { submissionId: 's1' } } as unknown as Job<SubmissionJobData>;
    await expect(processor.process(job)).rejects.toThrow('judge down');
  });
});
