const urls = {
  // source: https://observablehq.com/@mbostock/u-s-airports-voronoi
  // source: https://github.com/topojson/us-atlas
  map: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json",

  // source: https://gist.github.com/mbostock/7608400
  airports:
    "https://raw.githubusercontent.com/nordstroem92/davi/master/airport_locations.csv",

  // source: https://gist.github.com/mbostock/7608400
  flights:
    "https://gist.githubusercontent.com/mbostock/7608400/raw/e5974d9bba45bc9ab272d98dd7427567aafd55bc/flights.csv"
};

const svg  = d3.select("svg");

const width  = parseInt(svg.attr("width"));
const height = parseInt(svg.attr("height"));
const hypotenuse = Math.sqrt(width * width + height * height);

// must be hard-coded to match our topojson projection
// source: https://github.com/topojson/us-atlas
const projection = d3.geoAlbers().scale(1280).translate([480, 300]);

// have these already created for easier drawing
const g = {
  basemap:  svg.select("g#basemap"),
  flights:  svg.select("g#flights"),
  airports: svg.select("g#airports"),
  voronoi:  svg.select("g#voronoi")
};

const tooltip = d3.select("text#tooltip");

// load and draw base map
d3.json(urls.map).then(drawMap);

// load the airport and flight data together
const promises = [
  d3.csv(urls.airports, typeAirport),
];

Promise.all(promises).then(processData);

// process airport and flight data
function processData(values) {
  let airports = values[0];
  console.log("airports: " + airports.length);
  console.log(airports[0]);

  // convert airports array (pre filter) into map for fast lookup - lav lufthavn søgbar fra dens ident-name
  let ident = new Map(airports.map(node => [node.ident, node]));

  drawAirports(airports);

}

// see airports.csv
// convert gps coordinates to number and init degree
function typeAirport(airport) {
  airport.longitude_deg = parseFloat(airport.longitude_deg);
  airport.latitude_deg  = parseFloat(airport.latitude_deg);

  // use projection hard-coded to match topojson data
  const coords = projection([airport.longitude_deg, airport.latitude_deg]);
  airport.x = coords[0];
  airport.y = coords[1];

  airport.outgoing = 0;  // eventually tracks number of outgoing flights
  airport.incoming = 0;  // eventually tracks number of incoming flights

  airport.flights = [];  // eventually tracks outgoing flights

  return airport;
}

function drawAirports(airports) {
  // adjust scale
  //const extent = d3.extent(airports, d => d.outgoing);
  //scales.airports.domain(extent);

  // draw airport bubbles
  g.airports.selectAll("circle.airport")
    .data(airports, d => d.ident)
    .enter()
    .append("circle")
    .attr("r",  5)
    .attr("cx", d => d.x) // calculated on load
    .attr("cy", d => d.y) // calculated on load
    .attr("class", "airport")
    .each(function(d) {
      // adds the circle object to our airport
      // makes it fast to select airports on hover
      d.bubble = this;
    });
}

// draws the underlying map
function drawMap(map) {
  // run topojson on remaining states and adjust projection
  let land = topojson.merge(map, map.objects.states.geometries);

  // use null projection; data is already projected
  let path = d3.geoPath();

  // draw base map
  g.basemap.append("path")
    .datum(land)
    .attr("class", "land")
    .attr("d", path);

  // draw interior borders
  g.basemap.append("path")
    .datum(topojson.mesh(map, map.objects.states, (a, b) => a !== b))
    .attr("class", "border interior")
    .attr("d", path);

  // draw exterior borders
  g.basemap.append("path")
    .datum(topojson.mesh(map, map.objects.states, (a, b) => a === b))
    .attr("class", "border exterior")
    .attr("d", path);
}




