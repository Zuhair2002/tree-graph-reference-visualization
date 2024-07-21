import { useEffect, useState } from "react";
import CircularJSON from "circular-json";
import Tree from "react-d3-tree";
import { useCenteredTree } from "../utils/helpers";

const renderRectSvgNode = ({ nodeDatum, toggleNode }: any) => (
  <g>
    <circle r="10" onClick={toggleNode} />
    <text fill="black" strokeWidth="1" textAnchor="middle" y="30">
      {nodeDatum.id}
    </text>
  </g>
);

const TreePage = () => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [selectedTree, setSelectedTree] = useState<any>(null);
  const [translate, containerRef] = useCenteredTree();

  useEffect(() => {
    const storedTreeData = localStorage.getItem("treeData");
    if (storedTreeData) {
      try {
        const parsedData = CircularJSON.parse(storedTreeData);
        setTreeData(parsedData);
        console.log(parsedData[3]);
        setSelectedTree(parsedData[0]);
      } catch (error) {
        console.error("Error parsing tree data from localStorage:", error);
      }
    } else {
      console.warn("No tree data found in localStorage.");
    }
  }, []);

  const handleTreeSelect = (tree: any) => {
    setSelectedTree(tree);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          width: "200px",
          overflowY: "auto",
          borderRight: "1px solid #ccc",
        }}
      >
        <h2 style={{ padding: "10px" }}>Tree List</h2>
        <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
          {treeData.map((tree, index) => (
            <li key={index} style={{ marginBottom: "10px" }}>
              <button
                onClick={() => handleTreeSelect(tree)}
                style={{ width: "100%", padding: "10px" }}
              >
                {tree.id}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flexGrow: 1, padding: "20px" }}>
        {selectedTree && (
          <div
            ref={containerRef}
            style={{
              width: "100%",
              height: "100%",
              border: "1px solid #ccc",
              backgroundColor: "#f9f9f9",
            }}
          >
            <Tree
              dimensions={{ width: 1000, height: 800 }}
              enableLegacyTransitions
              data={selectedTree}
              orientation="vertical"
              renderCustomNodeElement={renderRectSvgNode}
              translate={translate}
              zoomable
              separation={{ siblings: 1.5, nonSiblings: 1 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TreePage;
