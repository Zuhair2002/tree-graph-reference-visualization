import ts from "typescript";

export interface TreeNode {
  id: string;
  children?: TreeNode[];
}

export interface GraphNode {
  id: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export function parseInterfaces(fileContent: string): Record<string, string[]> {
  const ignoreList = ["PublishDetails", "File", "Link", "Taxonomy"];
  const interfaces: Set<string> = new Set();
  const references: { [key: string]: Set<string> } = {};

  const sourceFile = ts.createSourceFile(
    "generated.d.ts",
    fileContent,
    ts.ScriptTarget.ES2020,
    true
  );

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;
      if (!ignoreList.includes(interfaceName)) {
        interfaces.add(interfaceName);
        references[interfaceName] = new Set();
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  function checkReferences(node: ts.Node) {
    if (ts.isTypeReferenceNode(node)) {
      const typeName = (node.typeName as ts.Identifier).text;
      if (interfaces.has(typeName)) {
        const currentInterface = getCurrentInterfaceName(node);
        if (currentInterface) {
          references[currentInterface].add(typeName);
        }
      }
    }
    ts.forEachChild(node, checkReferences);
  }

  function getCurrentInterfaceName(node: ts.Node): string | null {
    let parent = node.parent;
    while (parent) {
      if (ts.isInterfaceDeclaration(parent)) {
        return parent.name.text;
      }
      parent = parent.parent;
    }
    return null;
  }

  ts.forEachChild(sourceFile, checkReferences);

  const referencesArray: { [key: string]: string[] } = {};
  Object.keys(references).forEach((key) => {
    referencesArray[key] = Array.from(references[key]);
  });

  return referencesArray;
}

export function transformToTreeData(
  referenceData: Record<string, string[]>
): TreeNode[] {
  const nodeMap: Record<string, TreeNode> = {};

  for (const key of Object.keys(referenceData)) {
    nodeMap[key] = { id: key };
  }

  for (const [source, targets] of Object.entries(referenceData)) {
    nodeMap[source].children = targets.map((target) => nodeMap[target]);
  }

  const allTargets = new Set(Object.values(referenceData).flat());
  const rootNodes = Object.keys(referenceData)
    .filter((id) => !allTargets.has(id))
    .map((id) => nodeMap[id]);

  return rootNodes;
}

export function transformToGraphData(referenceData: Record<string, string[]>): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const nodes: GraphNode[] = Object.keys(referenceData).map((id) => ({ id }));
  const links: GraphLink[] = [];

  for (const [source, targets] of Object.entries(referenceData)) {
    targets.forEach((target) => {
      if (nodes.some((node) => node.id === target)) {
        links.push({ source, target });
      }
    });
  }

  return { nodes, links };
}
