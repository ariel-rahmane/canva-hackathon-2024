import axios from "axios";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";

dotenv.config();

const OWNER = "Leonardo-Interactive";
const REPO = "leonardo-platform";
const TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT_FILE = "pull_requests.json";
interface PullRequest {
  title: string;
  body: string;
  html_url: string;
  merged_at: string | null;
  number: number;
}
const MAX_PAGES = 3;

interface Comment {
  body: string;
}

interface ProcessedPR {
  title: string;
  body: string;
  url: string;
  comments: string[];
}

const headers = { Authorization: `token ${TOKEN}` };

async function fetchClosedPullRequests(
  owner: string,
  repo: string
): Promise<PullRequest[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  let page = 1;

  const allPRs: PullRequest[] = [];

  while (page < MAX_PAGES) {
    const response = await axios.get<PullRequest[]>(url, {
      headers,
      params: { state: "closed", per_page: 100, page }
    });
    const prs = response.data;
    if (prs.length === 0) break;
    allPRs.push(...prs);
    page += 1;
  }
  return allPRs;
}

async function fetchCommentsForPR(
  owner: string,
  repo: string,
  prNumber: number
): Promise<string[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  const response = await axios.get<Comment[]>(url, { headers });
  return response.data.map((comment) => comment.body);
}

async function processPRsForIndex(prs: PullRequest[]): Promise<ProcessedPR[]> {
  const processedPRs: ProcessedPR[] = [];

  for (const pr of prs) {
    const comments = await fetchCommentsForPR(OWNER, REPO, pr.number);
    processedPRs.push({
      title: pr.title,
      body: pr.body,
      url: pr.html_url,
      comments
    });
  }

  return processedPRs;
}

async function savePRsToFile(prs: ProcessedPR[], filePath: string) {
  writeFileSync(filePath, JSON.stringify(prs, null, 2));
  console.log(`Data saved to ${filePath}`);
}

async function main() {
  try {
    const prs = await fetchClosedPullRequests(OWNER, REPO);
    const processedPRs = await processPRsForIndex(prs);
    await savePRsToFile(processedPRs, OUTPUT_FILE);
  } catch (error) {
    console.error("Error fetching or processing pull requests:", error);
  }
}

main();
