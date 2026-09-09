import type { Job } from '../shared/types';

export function canResumeJob(job: Job): boolean {
  return job.provider === 'runninghub' && Boolean(job.remoteTaskId) && ['failed', 'unknown'].includes(job.status);
}
