import { Project, Node } from "ts-morph";
import fs from "fs";
import path from "path";

const BASE_DIRECTORY = "/Users/arielrahmane_1/leonardo-ai/repos";
const DIRECTORY_PATH = BASE_DIRECTORY + "/leonardo-platform/libs";
const OUTPUT_DIRECTORY = path.join(__dirname, "../../output");
const MAX_NODES_PER_FILE = 100;

const project = new Project();

function getRelativeFilePath(filePath: string, baseDir: string): string {
  return path.relative(baseDir, filePath);
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

async function saveNodesToJson(nodes: any[], fileIndex: number) {
  const outputPath = path.join(OUTPUT_DIRECTORY, `nodes_${fileIndex}.json`);
  console.log("Nodes length for nodes_${fileIndex}.json: ", nodes.length);
  console.log("-----------------------------------------");
  fs.writeFileSync(outputPath, JSON.stringify(nodes, null, 2), "utf8");
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

let fileIndex = 0;
function scanDirectory(directory: string) {
  const files = fs.readdirSync(directory);
  let nodes: any[] = [];

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith(".ts") && !fullPath.endsWith(".test.ts")) {
      console.log(
        "Extracting: ",
        getRelativeFilePath(fullPath, BASE_DIRECTORY)
      );
      const fileNodes = analyzeFile(fullPath);
      nodes.push(...fileNodes);

      // Check if nodes exceed the limit, then save and reset
      if (nodes.length >= MAX_NODES_PER_FILE) {
        console.log("Saving nodes: ", fileIndex);
        saveNodesToJson(nodes, fileIndex);
        fileIndex++;
        nodes = [];
      }
    }
  }

  if (nodes.length > 0) {
    fileIndex++;
    console.log("saving remaining nodes: ", fileIndex);
    saveNodesToJson(nodes, fileIndex);
  }
}

scanDirectory(DIRECTORY_PATH);
console.log("Node extraction completed.");
