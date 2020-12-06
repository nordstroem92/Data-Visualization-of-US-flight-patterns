const svg = d3.select("svg");
const width = svg.attr("width");
const height = svg.attr("height");

const unemployment = d3.map();
const path = d3.geoPath();
const x = d3.scaleLinear()
  .domain([1, 10])
  .rangeRound([600, 860]);

const color = d3.scaleThreshold()
  .domain(d3.range(2, 10))
  .range(d3.schemeBlues[9]);

const g = svg.append("g")
  .attr("class", "key")
  .attr("transform", "translate(0, 40)");

g.selectAll("rect")
  .data(color.range().map(d => {
    d = color.invertExtent(d);
    if (d[0] == null) d[0] = x.domain()[0];
    if (d[1] == null) d[1] = x.domain()[1];
    return d;
	}))
  .enter().append("rect")
  .attr("height", 8)
  .attr("x", d => x(d[0]))
  .attr("width", d => x(d[1]) - x(d[0]))
  .attr("fill", d => color(d[0]));

g.append("text")
  .attr("class", "caption")
  .attr("x", x.range()[0])
  .attr("y", -6)
  .attr("fill", "#000")
  .attr("text-anchor", "start")
  .attr("font-weight", "bold")
  .text("Unemployment rate");

g.call(d3.axisBottom(x)
       .tickSize(13)
       .tickFormat((x, i) => i ? x : x + "%")
       .tickValues(color.domain()))
  .select(".domain")
  .remove();

const promises = [
  d3.json("https://d3js.org/us-10m.v1.json"),
  d3.tsv("map.tsv",  d => unemployment.set(d.id, +d.rate))
];

Promise.all(promises).then(data => {
  ready(data[0]);
}).catch(error => {
  console.log(error);
});

const ready = us => {
  svg.append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.counties).features)
    .enter().append("path")
    .attr("fill", d => color(d.rate = unemployment.get(d.id)))
    .attr("d", path)
    .append("title")
    .text(d => d.rate + "%");
  svg.append("path")
    .datum(topojson.mesh(us, us.objects.states, a, b => a !== b))
    .attr("class", "states")
    .attr("d", path);
}