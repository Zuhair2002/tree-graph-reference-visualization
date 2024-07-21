import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const GraphPage = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );
  let graphData: any = {};

  useEffect(() => {
    const storedGraphData = localStorage.getItem("graphData");
    if (!storedGraphData) {
      console.error("No graph data found in localStorage");
      return;
    }

    graphData = JSON.parse(storedGraphData);

    const targetNodes = new Set(
      graphData.links.map((link: any) => link.target)
    );

    const rootNodes = new Set(
      graphData.nodes
        .filter((node: any) => !targetNodes.has(node.id))
        .map((node: any) => node.id)
    );

    const nodesWithType = graphData.nodes.map((node: any) => ({
      ...node,
      type: rootNodes.has(node.id) ? "root" : "non-root",
    }));

    if (svgRef.current) {
      const svg = d3
        .select(svgRef.current)
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight)
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

      // Set initial zoom level to 0.75
      svg.call(zoom.transform, d3.zoomIdentity.scale(0.6));

      const simulation = d3
        .forceSimulation(nodesWithType)
        .force(
          "link",
          d3
            .forceLink(graphData.links)
            .id((d: any) => d.id)
            .distance(200)
        )
        .force("charge", d3.forceManyBody().strength(-1000)) // Decrease strength for more spacing
        .force(
          "center",
          d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2)
        )
        .force("collision", d3.forceCollide().radius(40)) // Increase collision radius
        .force("x", d3.forceX(window.innerWidth / 2).strength(0.1))
        .force("y", d3.forceY(window.innerHeight / 2).strength(0.1));

      simulationRef.current = simulation;

      const link = container
        .append("g")
        .selectAll("path")
        .data(graphData.links)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", "0.6");

      const node = container
        .append("g")
        .selectAll("circle")
        .data(nodesWithType)
        .enter()
        .append("circle")
        .attr("r", 20) // Optimize node size
        .attr("fill", (d: any) => (d.type === "root" ? "#ff6347" : "#1f77b4"))
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
        )
        .on("click", (event, d: any) => {
          if (d.type === "root") {
            highlightNodeAndChildren(d.id);
          } else {
            setHighlightedNodes(new Set());
          }
        });

      const labels = container
        .append("g")
        .selectAll("text")
        .data(nodesWithType)
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
        svg.attr("width", window.innerWidth).attr("height", window.innerHeight);
        simulation.force(
          "center",
          d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2)
        );
        simulation.alpha(1).restart();
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        simulation.stop();
      };
    }
  }, []);

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

  function highlightNodeAndChildren(rootId: string) {
    const nodesToHighlight = new Set<string>();
    const linksToHighlight = new Set<string>(); // Track links to highlight
    nodesToHighlight.add(rootId);

    graphData.links.forEach((link: any) => {
      if (link.source.id === rootId || nodesToHighlight.has(link.source.id)) {
        nodesToHighlight.add(link.target.id);
        linksToHighlight.add(`${link.source.id}-${link.target.id}`); // Add link to highlight
      }
    });

    setHighlightedNodes(nodesToHighlight);

    // Update link color
    d3.select(svgRef.current)
      .selectAll("path")
      .attr("stroke", (d: any) =>
        linksToHighlight.has(`${d.source.id}-${d.target.id}`)
          ? "#000000"
          : "#999"
      );
  }

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);

      svg
        .selectAll("circle")
        .attr("opacity", (d: any) =>
          highlightedNodes.size === 0 || highlightedNodes.has(d.id) ? 1 : 0.1
        );

      svg
        .selectAll("path")
        .attr("opacity", (d: any) =>
          highlightedNodes.size === 0 ||
          (highlightedNodes.has(d.source.id) &&
            highlightedNodes.has(d.target.id))
            ? 1
            : 0.1
        );

      svg
        .selectAll("text")
        .attr("opacity", (d: any) =>
          highlightedNodes.size === 0 || highlightedNodes.has(d.id) ? 1 : 0.1
        )
        .attr("font-size", (d: any) =>
          highlightedNodes.size === 0 || highlightedNodes.has(d.id)
            ? d.type === "root"
              ? "18px"
              : "18px"
            : "18px"
        );
    }
  }, [highlightedNodes]);

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default GraphPage;
