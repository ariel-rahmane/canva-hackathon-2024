import { Project, Node } from "ts-morph";
import fs from "fs";
import path from "path";

const BASE_DIRECTORY = "/Users/arielrahmane_1/leonardo-ai/repos";
const DIRECTORY_PATH = BASE_DIRECTORY + "/leonardo-platform/libs/tracking";
const OUTPUT_DIRECTORY = path.join(__dirname, "../../output");
const MAX_NODES_PER_FILE = 500;

const project = new Project();

function extractNodeData(node: Node, filePath: string, nodes: any[]) {
  const code = node.getText();
  const start = node.getStartLineNumber();
  const end = node.getEndLineNumber();
  const width = node.getFullWidth();
  const entityName = node.getSymbol()?.getName() || null;
  const comment = node
    .getLeadingCommentRanges()
    .map((c) => c.getText())
    .join("\n");
  const statementType = node.getKindName();

  if (!code || statementType === "EndOfFileToken") {
    return;
  }

  nodes.push({
    code,
    metadata: {
      fileName: path.basename(filePath),
      fileLocation: filePath,
      comment,
      entityName,
      statementType,
      width,
      startLineNumber: start,
      endLineNumber: end
    }
  });
}

let fileIndex = 0;
function saveNodesToJson(nodes: any[]) {
  const outputPath = path.join(OUTPUT_DIRECTORY, `nodes_${fileIndex}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(nodes, null, 2), "utf8");
  fileIndex++;
}

function analyzeFile(filePath: string): any[] {
  console.log(`Analyzing file at ${filePath}`);
  const sourceFile = project.addSourceFileAtPath(filePath);
  const nodes: any[] = [];

  sourceFile.forEachChild((node) => {
    extractNodeData(node, filePath, nodes);
  });

  return nodes;
}

function scanDirectory(directory: string) {
  const files = fs.readdirSync(directory);
  const nodes: any[] = [];
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith(".ts") && !fullPath.endsWith(".test.ts")) {
      const fileNodes = analyzeFile(fullPath);
      nodes.push(fileNodes);
    }
  }
  saveNodesToJson(nodes);
}

scanDirectory(DIRECTORY_PATH);
console.log("Node extraction completed.");
