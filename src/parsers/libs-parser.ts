import { Project, Node } from "ts-morph";
import fs from "fs";
import path from "path";

const BASE_DIRECTORY = "/Users/arielrahmane_1/leonardo-ai/repos";
const DIRECTORY_PATH = BASE_DIRECTORY + "/leonardo-platform/libs";
const OUTPUT_DIRECTORY = path.join(__dirname, "../../output");
const MAX_NODES_PER_FILE = 100;

const includeExtensions = [".ts", ".tsx"];
const excludePatterns = [".test.ts", ".test.tsx"];
let fileIndex = 0;

const project = new Project();

function getRelativeFilePath(filePath: string, baseDir: string): string {
  return path.relative(baseDir, filePath);
}

function getAllFilePaths(directory: string): string[] {
  let filePaths: string[] = [];

  function iterateDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        iterateDirectory(fullPath);
      } else {
        filePaths.push(fullPath);
      }
    }
  }

  iterateDirectory(directory);
  return filePaths;
}

function shouldIncludeFile(filePath: string): boolean {
  const hasValidExtension = includeExtensions.some((ext) =>
    filePath.endsWith(ext)
  );
  if (!hasValidExtension) return false;

  // Check if the file matches any of the exclude patterns
  const isExcluded = excludePatterns.some((pattern) =>
    filePath.endsWith(pattern)
  );
  return !isExcluded;
}

function extractNodeData(node: Node, filePath: string): any {
  const code = node.getText();
  const start = node.getStartLineNumber();
  const end = node.getEndLineNumber();
  const width = node.getFullWidth();
  const entityName = node.getSymbol()?.getName() || null;
  const comment = node
    .getLeadingCommentRanges()
    .map((c) => c.getText())
    .join("\n");
  const type = node.getKindName();

  if (!code || type === "EndOfFileToken" || type === "ImportDeclaration") {
    return;
  }

  const extractedNode = {
    code,
    metadata: {
      fileName: path.basename(filePath),
      fileLocation: getRelativeFilePath(filePath, BASE_DIRECTORY),
      comment,
      entityName,
      type,
      width,
      startLineNumber: start,
      endLineNumber: end
    }
  };

  return extractedNode;
}

async function saveNodesToJson(nodes: any[]) {
  const outputPath = path.join(OUTPUT_DIRECTORY, `nodes_${fileIndex}.json`);
  console.log(`Nodes length for nodes_${fileIndex}.json: `, nodes.length);
  console.log("-----------------------------------------");
  fs.writeFileSync(outputPath, JSON.stringify(nodes, null, 2), "utf8");
  fileIndex++;
}

function analyzeFile(filePath: string): any[] {
  const sourceFile = project.addSourceFileAtPath(filePath);
  const nodes: any[] = [];

  sourceFile.forEachChild((node) => {
    const extractedNode = extractNodeData(node, filePath);
    if (extractedNode) {
      nodes.push(extractedNode);
    }
  });

  return nodes;
}

function scanDirectory(directory: string) {
  const filesPath = getAllFilePaths(directory);
  let nodes: any[] = [];

  for (const filePath of filesPath) {
    if (shouldIncludeFile(filePath)) {
      console.log(
        "Extracting: ",
        getRelativeFilePath(filePath, BASE_DIRECTORY)
      );
      const fileNodes = analyzeFile(filePath);
      nodes.push(...fileNodes);

      // Check if nodes exceed the limit, then save and reset
      if (nodes.length >= MAX_NODES_PER_FILE) {
        saveNodesToJson(nodes);
        nodes = [];
      }
    }
  }

  if (nodes.length > 0) {
    saveNodesToJson(nodes);
  }
}

scanDirectory(DIRECTORY_PATH);
console.log("Node extraction completed.");
