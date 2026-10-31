import { AppError, type RepoRef, type IssueCheck } from '@unforked/contracts';
import type { GitHubClient } from './client';
export async function checkIssue(repo: RepoRef, number: number, client: GitHubClient): Promise<IssueCheck> {
  const base = `/repos/${repo.owner}/${repo.name}`; const metadata = await client.get(base, true);
  if (metadata.private !== false) throw new AppError('INVALID_INPUT', 'Only public GitHub issues can be checked.');
  const issue = await client.get(`${base}/issues/${number}`, true); const reasons: string[] = [];
  if (metadata.archived) reasons.push('This repository is archived.');
  if (issue.state !== 'open' || issue.pull_request) reasons.push('This is not an open contribution issue.');
  if (issue.assignees?.length || issue.assignee) reasons.push('This issue is already assigned.');
  if (/(?:\/pull\/\d+|working on this|PR\s*#\d+)/i.test(issue.body || '')) reasons.push('The issue mentions work that may already be underway.');
  return { repo, issueNumber: number, available: !reasons.length, reasons: reasons.length ? reasons : ['Currently open and unassigned. Comments and all competing PRs were not exhaustively checked; read the discussion before starting.'], checkedAt: new Date().toISOString() };
}
