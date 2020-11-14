const urls = {
  // source: https://observablehq.com/@mbostock/u-s-airports-voronoi
  // source: https://github.com/topojson/us-atlas
  map: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json",

  // source: https://gist.github.com/mbostock/7608400
  airports:
    "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/airport_locations.csv",

  // source: https://gist.github.com/mbostock/7608400
  flights:
    "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/merged_flight_data.csv"
};

const svg  = d3.select("svg");

const width  = parseInt(svg.attr("width"));
const height = parseInt(svg.attr("height"));
const hypotenuse = Math.sqrt(width * width + height * height);

// must be hard-coded to match our topojson projection
// source: https://github.com/topojson/us-atlas
const projection = d3.geoAlbers().scale(1280).translate([480, 300]);

const scales = {
  // used to scale airport bubbles
  airports: d3.scaleSqrt()
    .range([4, 18]),

  // used to scale number of segments per line
  segments: d3.scaleLinear()
    .domain([0, hypotenuse])
    .range([1, 10])
};

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
  d3.csv(urls.flights,  typeFlight)
];

Promise.all(promises).then(processData);

// process airport and flight data
function processData(values) {
  let airports = values[0];
  let flights  = values[1];
  console.log("airports: " + airports.length);
  console.log("flights: " + flights.length);

  // convert airports array (pre filter) into map for fast lookup - lav lufthavn søgbar fra dens ident-name
  let ident = new Map(airports.map(node => [node.ident, node]));

  flights.forEach(function(link) {
    link.source = ident.get(link.ORIGIN);
    link.target = ident.get(link.DESTINATION);
    link.source.outgoing += link.count;
  });

  flights = flights.filter(flight => flight.DATE > '2018-01-05' && flight.DATE < '2018-01-10');

  drawAirports(airports);
  drawFlights(airports, flights);
}

// DRAW UNDERLYING MAP
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

function drawAirports(airports) {
  // draw airport bubbles
  g.airports.selectAll("circle.airport")
    .data(airports, d => d.ident)
    .enter()
    .append("circle")
    .attr("r",  d => scales.airports(d.outgoing)/300)
    .attr("cx", d => d.x) // calculated on load
    .attr("cy", d => d.y) // calculated on load
    .attr("class", "airport")
    .each(function(d) {
      // adds the circle object to our airport
      // makes it fast to select airports on hover
      d.bubble = this;
    });
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

  airport.flights = [];  // eventually tracks outgoing flights

  return airport;
}
// see flights.csv
// convert count to number
function typeFlight(flight) {
  flight.count = parseInt(flight.FLIGHTCOUNT);
  return flight;
}

function drawFlights(airports, flights) {
  // break each flight between airports into multiple segments
  let bundle = generateSegments(airports, flights);

  // https://github.com/d3/d3-shape#curveBundle
  let line = d3.line()
    .curve(d3.curveBundle)
    .x(airport => airport.x)
    .y(airport => airport.y);

  let links = g.flights.selectAll("path.flight")
    .data(bundle.paths)
    .enter()
    .append("path")
    .attr("d", line)
    .attr("class", "flight")
    .each(function(d) {
      // adds the path object to our source airport
      // makes it fast to select outgoing paths
      d[0].flights.push(this);
    });

  // https://github.com/d3/d3-force
  let layout = d3.forceSimulation()
    // settle at a layout faster
    .alphaDecay(0.5)
    // nearby nodes attract each other
    .force("charge", d3.forceManyBody()
      .strength(8) 
      .distanceMax(scales.airports.range()[1] * 3)
    )
    // edges want to be as short as possible
    // prevents too much stretching
    .force("link", d3.forceLink()
      .strength(0.3)
      .distance(0)
    )
    .on("tick", function(d) {
      links.attr("d", line);
    })
    .on("end", function(d) {
      console.log("layout complete");
    });

  layout.nodes(bundle.nodes).force("link").links(bundle.links);
}


// Turns a single edge into several segments that can
// be used for simple edge bundling.
function generateSegments(nodes, links) {
  // generate separate graph for edge bundling
  // nodes: all nodes including control nodes
  // links: all individual segments (source to target)
  // paths: all segments combined into single path for drawing
  let bundle = {nodes: [], links: [], paths: []};

  // make existing nodes fixed
  bundle.nodes = nodes.map(function(d, i) {
    d.fx = d.x;
    d.fy = d.y;
    return d;
  });

  links.forEach(function(d, i) {
    // calculate the distance between the source and target
    let length = distance(d.source, d.target);

    // calculate total number of inner nodes for this link
    let total = Math.round(scales.segments(length));

    // create scales from source to target
    let xscale = d3.scaleLinear()
      .domain([0, total + 1]) // source, inner nodes, target
      .range([d.source.x, d.target.x]);

    let yscale = d3.scaleLinear()
      .domain([0, total + 1])
      .range([d.source.y, d.target.y]);

    // initialize source node
    let source = d.source;
    let target = null;

    // add all points to local path
    let local = [source];

    for (let j = 1; j <= total; j++) {
      // calculate target node
      target = {
        x: xscale(j),
        y: yscale(j)
      };

      local.push(target);
      bundle.nodes.push(target);

      bundle.links.push({
        source: source,
        target: target
      });

      source = target;
    }

    local.push(d.target);

    // add last link to target node
    bundle.links.push({
      source: target,
      target: d.target
    });

    bundle.paths.push(local);
  });

  return bundle;
}

// calculates the distance between two nodes
// sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
function distance(source, target) {
  const dx2 = Math.pow(target.x - source.x, 2);
  const dy2 = Math.pow(target.y - source.y, 2);

  return Math.sqrt(dx2 + dy2);

}