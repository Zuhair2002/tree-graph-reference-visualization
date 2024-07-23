import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";

const GraphPage = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [selectedRootNode, setSelectedRootNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [filteredGraphData, setFilteredGraphData] = useState<any>(null);

  useEffect(() => {
    const storedGraphData = localStorage.getItem("graphData");
    if (!storedGraphData) {
      console.error("No graph data found in localStorage");
      return;
    }

    const parsedGraphData = JSON.parse(storedGraphData);
    setGraphData(parsedGraphData);
  }, []);

  useEffect(() => {
    if (graphData) {
      if (selectedRootNode) {
        const nodesToHighlight = new Set<string>();
        const linksToHighlight = new Set<any>();

        // Function to gather all nodes and links in the subtree
        const gatherSubtree = (nodeId: string) => {
          nodesToHighlight.add(nodeId);

          graphData.links.forEach((link: any) => {
            if (link.source.id === nodeId) {
              if (!nodesToHighlight.has(link.target.id)) {
                nodesToHighlight.add(link.target.id);
                gatherSubtree(link.target.id);
              }
              if (!linksToHighlight.has(link)) {
                linksToHighlight.add(link);
              }
            }
          });
        };

        gatherSubtree(selectedRootNode);

        const nodesToShow = graphData.nodes.filter((node: any) =>
          nodesToHighlight.has(node.id)
        );
        const linksToShow = graphData.links.filter((link: any) =>
          linksToHighlight.has(link)
        );

        setFilteredGraphData({ nodes: nodesToShow, links: linksToShow });
      } else {
        setFilteredGraphData(graphData);
      }
    }
  }, [graphData, selectedRootNode]);

  useEffect(() => {
    if (!filteredGraphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = window.innerWidth - 200;
    const height = window.innerHeight;

    svg
      .attr("width", width)
      .attr("height", height)
      .style("border", "1px solid #ccc")
      .style("background-color", "#f9f9f9");

    const container = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3
      .forceSimulation(filteredGraphData.nodes)
      .force(
        "link",
        d3
          .forceLink(filteredGraphData.links)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    simulationRef.current = simulation;

    const link = container
      .append("g")
      .selectAll("path")
      .data(filteredGraphData.links)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", "2px")
      .attr("stroke-opacity", "0.6");

    const node = container
      .append("g")
      .selectAll("circle")
      .data(filteredGraphData.nodes)
      .enter()
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => {
        if (d.id === selectedRootNode) return "#ff6347"; // Root Node
        if (graphData.links.some((link: any) => link.source.id === d.id))
          return "#ffd700"; // Nodes with Children
        return "#1f77b4"; // Leaf Nodes
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", "3px")
      .on("mouseover", function () {
        d3.select(this).transition().duration(300).attr("r", 25);
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(300).attr("r", 20);
      })
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    const labels = container
      .append("g")
      .selectAll("text")
      .data(filteredGraphData.nodes)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#333")
      .attr("font-family", "Arial")
      .attr("pointer-events", "none")
      .text((d: any) => d.id);

    simulation.on("tick", () => {
      link.attr(
        "d",
        (d: any) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
      );
      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y + 5);
    });

    const handleResize = () => {
      svg
        .attr("width", window.innerWidth - 200)
        .attr("height", window.innerHeight);
      simulation.force("center", d3.forceCenter(width / 2, height / 2));
      simulation.alpha(1).restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      simulation.stop();
    };
  }, [filteredGraphData]);

  function dragstarted(
    event: d3.D3DragEvent<SVGCircleElement, any, any>,
    d: any
  ) {
    const simulation = simulationRef.current;
    if (simulation && !event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
    const simulation = simulationRef.current;
    if (simulation) {
      d.fx = event.x;
      d.fy = event.y;
    }
  }

  function dragended(
    event: d3.D3DragEvent<SVGCircleElement, any, any>,
    d: any
  ) {
    const simulation = simulationRef.current;
    if (simulation && !event.active) {
      simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedRootNode(nodeId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <ul>
          {graphData &&
            graphData.nodes.map((node: any) => (
              <li
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={
                  node.id === selectedRootNode ? styles.selectedNode : ""
                }
              >
                {node.id}
              </li>
            ))}
        </ul>
      </div>
      <div className={styles.graphContainer}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};

export default GraphPage;

// import { useEffect, useRef, useState } from "react";
// import * as d3 from "d3";
// import styles from "./GraphPage.module.css";

// const GraphPage = () => {
//   const svgRef = useRef<SVGSVGElement | null>(null);
//   const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
//   const [selectedRootNode, setSelectedRootNode] = useState<string | null>(null);
//   const [graphData, setGraphData] = useState<any>(null);
//   const [filteredGraphData, setFilteredGraphData] = useState<any>(null);

//   useEffect(() => {
//     const storedGraphData = localStorage.getItem("graphData");
//     if (!storedGraphData) {
//       console.error("No graph data found in localStorage");
//       return;
//     }

//     const parsedGraphData = JSON.parse(storedGraphData);
//     // Add a collapsed state to each node
//     parsedGraphData.nodes.forEach((node: any) => {
//       node.collapsed = false;
//     });
//     setGraphData(parsedGraphData);
//   }, []);

//   useEffect(() => {
//     if (graphData) {
//       const nodesToHighlight = new Set<string>();
//       const linksToHighlight = new Set<any>();

//       // Function to gather all nodes and links in the subtree
//       const gatherSubtree = (nodeId: string) => {
//         nodesToHighlight.add(nodeId);

//         graphData.links.forEach((link: any) => {
//           if (link.source.id === nodeId && !link.source.collapsed) {
//             if (!nodesToHighlight.has(link.target.id)) {
//               nodesToHighlight.add(link.target.id);
//               gatherSubtree(link.target.id);
//             }
//             if (!linksToHighlight.has(link)) {
//               linksToHighlight.add(link);
//             }
//           }
//         });
//       };

//       if (selectedRootNode) {
//         gatherSubtree(selectedRootNode);
//       } else {
//         graphData.nodes.forEach((node: any) => gatherSubtree(node.id));
//       }

//       const nodesToShow = graphData.nodes.filter((node: any) =>
//         nodesToHighlight.has(node.id)
//       );
//       const linksToShow = graphData.links.filter((link: any) =>
//         linksToHighlight.has(link)
//       );

//       setFilteredGraphData({ nodes: nodesToShow, links: linksToShow });
//     }
//   }, [graphData, selectedRootNode]);

//   useEffect(() => {
//     if (!filteredGraphData || !svgRef.current) return;

//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove();

//     const width = window.innerWidth - 200;
//     const height = window.innerHeight;

//     svg
//       .attr("width", width)
//       .attr("height", height)
//       .style("border", "1px solid #ccc")
//       .style("background-color", "#f9f9f9");

//     const container = svg.append("g");

//     const zoom = d3
//       .zoom<SVGSVGElement, unknown>()
//       .scaleExtent([0.1, 2])
//       .on("zoom", (event) => {
//         container.attr("transform", event.transform);
//       });

//     svg.call(zoom);

//     const simulation = d3
//       .forceSimulation(filteredGraphData.nodes)
//       .force(
//         "link",
//         d3
//           .forceLink(filteredGraphData.links)
//           .id((d: any) => d.id)
//           .distance(150)
//       )
//       .force("charge", d3.forceManyBody().strength(-800))
//       .force("center", d3.forceCenter(width / 2, height / 2))
//       .force("collision", d3.forceCollide().radius(40))
//       .force("x", d3.forceX(width / 2).strength(0.1))
//       .force("y", d3.forceY(height / 2).strength(0.1));

//     simulationRef.current = simulation;

//     const link = container
//       .append("g")
//       .selectAll("path")
//       .data(filteredGraphData.links)
//       .enter()
//       .append("path")
//       .attr("fill", "none")
//       .attr("stroke", "#999")
//       .attr("stroke-width", "2px")
//       .attr("stroke-opacity", "0.6");

//     const node = container
//       .append("g")
//       .selectAll("circle")
//       .data(filteredGraphData.nodes)
//       .enter()
//       .append("circle")
//       .attr("r", 20)
//       .attr("fill", (d: any) => {
//         if (d.id === selectedRootNode) return "#ff6347"; // Root Node
//         if (graphData.links.some((link: any) => link.source.id === d.id))
//           return "#ffd700"; // Nodes with Children
//         return "#1f77b4"; // Leaf Nodes
//       })
//       .attr("stroke", "#fff")
//       .attr("stroke-width", "3px")
//       .on("mouseover", function () {
//         d3.select(this).transition().duration(300).attr("r", 25);
//       })
//       .on("mouseout", function () {
//         d3.select(this).transition().duration(300).attr("r", 20);
//       })
//       .on("click", (event, d) => handleNodeClick(d))
//       .call(
//         d3
//           .drag<SVGCircleElement, any>()
//           .on("start", dragstarted)
//           .on("drag", dragged)
//           .on("end", dragended)
//       );

//     const labels = container
//       .append("g")
//       .selectAll("text")
//       .data(filteredGraphData.nodes)
//       .enter()
//       .append("text")
//       .attr("text-anchor", "middle")
//       .attr("font-size", "14px")
//       .attr("fill", "#333")
//       .attr("font-family", "Arial")
//       .attr("pointer-events", "none")
//       .text((d: any) => d.id);

//     simulation.on("tick", () => {
//       link.attr(
//         "d",
//         (d: any) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
//       );
//       node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
//       labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y + 5);
//     });

//     const handleResize = () => {
//       svg
//         .attr("width", window.innerWidth - 200)
//         .attr("height", window.innerHeight);
//       simulation.force("center", d3.forceCenter(width / 2, height / 2));
//       simulation.alpha(1).restart();
//     };

//     window.addEventListener("resize", handleResize);

//     return () => {
//       window.removeEventListener("resize", handleResize);
//       simulation.stop();
//     };
//   }, [filteredGraphData]);

//   function dragstarted(
//     event: d3.D3DragEvent<SVGCircleElement, any, any>,
//     d: any
//   ) {
//     const simulation = simulationRef.current;
//     if (simulation && !event.active) {
//       simulation.alphaTarget(0.3).restart();
//     }
//     d.fx = d.x;
//     d.fy = d.y;
//   }

//   function dragged(event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) {
//     const simulation = simulationRef.current;
//     if (simulation) {
//       d.fx = event.x;
//       d.fy = event.y;
//     }
//   }

//   function dragended(
//     event: d3.D3DragEvent<SVGCircleElement, any, any>,
//     d: any
//   ) {
//     const simulation = simulationRef.current;
//     if (simulation && !event.active) {
//       simulation.alphaTarget(0);
//     }
//     d.fx = null;
//     d.fy = null;
//   }

//   const handleNodeClick = (node: any) => {
//     // Toggle the collapsed state of the node
//     node.collapsed = !node.collapsed;
//     console.log(`Node ${node.id} collapsed state: ${node.collapsed}`);
//     // Update the filtered graph data
//     setFilteredGraphData((prevData: any) => {
//       const nodesToHighlight = new Set<string>();
//       const linksToHighlight = new Set<any>();

//       // Function to gather all nodes and links in the subtree
//       const gatherSubtree = (nodeId: string) => {
//         nodesToHighlight.add(nodeId);

//         graphData.links.forEach((link: any) => {
//           const sourceNode = graphData.nodes.find(
//             (n: any) => n.id === link.source.id
//           );
//           if (
//             link.source.id === nodeId &&
//             sourceNode &&
//             !sourceNode.collapsed
//           ) {
//             if (!nodesToHighlight.has(link.target.id)) {
//               nodesToHighlight.add(link.target.id);
//               gatherSubtree(link.target.id);
//             }
//             if (!linksToHighlight.has(link)) {
//               linksToHighlight.add(link);
//             }
//           }
//         });
//       };

//       if (selectedRootNode) {
//         gatherSubtree(selectedRootNode);
//       } else {
//         graphData.nodes.forEach((node: any) => gatherSubtree(node.id));
//       }

//       const nodesToShow = graphData.nodes.filter((node: any) =>
//         nodesToHighlight.has(node.id)
//       );
//       const linksToShow = graphData.links.filter((link: any) =>
//         linksToHighlight.has(link)
//       );
//       console.log(nodesToShow, linksToShow);
//       return { nodes: nodesToShow, links: linksToShow };
//     });
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.sidebar}>
//         <ul>
//           {graphData &&
//             graphData.nodes.map((node: any) => (
//               <li
//                 key={node.id}
//                 onClick={() => setSelectedRootNode(node.id)}
//                 className={
//                   node.id === selectedRootNode ? styles.selectedNode : ""
//                 }
//               >
//                 {node.id}
//               </li>
//             ))}
//         </ul>
//       </div>
//       <div className={styles.graphContainer}>
//         <svg ref={svgRef}></svg>
//       </div>
//     </div>
//   );
// };

// export default GraphPage;
