import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  select,
  line,
  axisBottom,
  axisLeft,
  scaleLinear,
  tsvParse,
  utcParse,
  max,
  scaleUtc,
  extent,
  pointer,
  bisectCenter,
  least,
} from "d3";
import useGetViewport from "./useGetViewport";
import { GithubIcon } from "./GithubIcon";

function App() {
  const { width: viewportWidth, height: viewportHeight } = useGetViewport();
  const width = viewportWidth * 0.8;
  const height = viewportHeight * 0.8;
  const [rawData, setRawData] = useState();
  const [data, setData] = useState();
  const svgRef = useRef();

  useEffect(() => {
    fetch("./unemployment.tsv")
      .then((response) => response.text())
      .then((data) => setRawData(data));
  });

  useEffect(() => {
    if (rawData) {
      const parsed = tsvParse(rawData);
      const columns = parsed.columns.slice(1);
      const formatted = parsed.map((entry) => {
        return {
          name: entry.name.replace(/, ([\w-]+).*/, " $1"),
          values: columns.map((k) => +entry[k]),
        };
      });
      const dates = columns.map(utcParse("%Y-%m"));
      const dataObject = {
        y: "% Unemployment",
        series: formatted,
        dates: dates,
      };
      // console.log(dataObject.series[0].values);
      setData(dataObject);
    }
  }, [rawData]);

  useEffect(() => {
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };
    if (data) {
      const x = scaleUtc()
        .domain(extent(data.dates))
        .range([margin.left, width - margin.right]);

      const y = scaleLinear()
        .domain([0, max(data.series, (d) => max(d.values))])
        .nice()
        .range([height - margin.bottom, margin.top]);

      const xAxis = (g) =>
        g.attr("transform", `translate(0,${height - margin.bottom})`).call(
          axisBottom(x)
            .ticks(width / 80)
            .tickSizeOuter(0)
        );

      const yAxis = (g) =>
        g
          .attr("transform", `translate(${margin.left},0)`)
          .call(axisLeft(y))
          .call((g) => g.select(".domain").remove())
          .call((g) =>
            g
              .select(".tick:last-of-type text")
              .clone()
              .attr("x", 3)
              .attr("text-anchor", "start")
              .attr("font-weight", "bold")
              .text(data.y)
          );

      const getLine = line()
        .defined((d) => !isNaN(d))
        .x((d, i) => x(data.dates[i]))
        .y((d) => y(d));

      const chart = () => {
        const svg = select(svgRef.current);
        svg.selectAll("g").remove();
        svg.attr("width", `${width}px`).attr("height", `${height}px`);

        const dot = svg.append("g").attr("display", "none");

        dot.append("circle").attr("r", 2.5);

        dot
          .append("text")
          .attr("font-family", "sans-serif")
          .attr("font-size", 10)
          .attr("text-anchor", "middle")
          .attr("y", -8);

        const entered = () => {
          svg
            .selectAll("path")
            .style("mix-blend-mode", null)
            .attr("stroke", "#ddd");
          dot.attr("display", null);
        };

        const left = () => {
          svg
            .selectAll("path")
            .style("mix-blend-mode", "multiply")
            .attr("stroke", null);
          dot.attr("display", "none");
        };

        const moved = (event) => {
          event.preventDefault();
          const cursorPosition = pointer(event, this);
          // date
          const xm = x.invert(cursorPosition[0]);
          // unemployment %
          const ym = y.invert(cursorPosition[1]);
          // index
          const i = bisectCenter(data.dates, xm);
          // data object
          const s = least(data.series, (d) => Math.abs(d.values[i] - ym));

          svg
            .selectAll("path")
            .attr("stroke", (d) => (d === s ? null : "#ddd"))
            .filter((d) => d === s)
            .raise();
          dot.attr(
            "transform",
            `translate(${x(data.dates[i])},${y(s.values[i])})`
          );
          dot.select("text").text(s.name);
        };

        const rect = (g) =>
          g
            .append("rect")
            .attr("fill", "transparent")
            .attr("width", width)
            .attr("height", height)
            .on("mousemove", moved)
            .on("mouseenter", entered)
            .on("mouseleave", left);

        svg.append("g").call(xAxis);
        svg.append("g").call(yAxis);
        svg.append("g").call(rect);

        const path = () => {
          svg
            .append("g")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .selectAll("path")
            .data(data.series)
            .join("path")
            .style("mix-blend-mode", "multiply")
            .attr("d", (d) => getLine(d.values));
        };

        svg.call(path);
      };
      chart();
    }
  }, [width, height, data, svgRef]);

  return (
    <div className="App">
      <div className="Title">Multi-Line Chart</div>
      <div className="SubTitle">
        <a href="https://observablehq.com/@d3/multi-line-chart">
          Observable Example
        </a>{" "}
        Implemented in React
      </div>
      <svg ref={svgRef} overflow="visible">
        <g className="xAxis" />
        <g className="yAxis" />
      </svg>
      <div
        style={{
          width: `${width}px`,
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <div>
          <a href="https://github.com/anselbrandt/d3-multiline/blob/master/src/App.js">
            <GithubIcon fill={"black"} size={"20"} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
