const urls = {
  map: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json", // source: https://github.com/topojson/us-atlas
  airports: "https://raw.githubusercontent.com/nordstroem92/datavisualisering/0d8f1a272123aef9e6a6e8c911b837aebfcf2aa7/Data/airport_locations.csv", // source: https://gist.github.com/mbostock/7608400
  flights: "https://raw.githubusercontent.com/nordstroem92/datavisualisering/0d8f1a272123aef9e6a6e8c911b837aebfcf2aa7/Data/flights_2018.csv" // source: https://gist.github.com/mbostock/7608400
};

const svg  = d3.select("svg");
const width  = parseInt(svg.attr("width"));
const height = parseInt(svg.attr("height"));
const hypotenuse = Math.sqrt(width * width + height * height);
const projection = d3.geoAlbers().scale(1280).translate([480, 300]); // must be hard-coded to match our topojson projection, source: https://github.com/topojson/us-atlas

const scales = {
  airports: d3.scaleSqrt().range([4, 18]), // used to scale airport bubbles

  segments: d3.scaleLinear().domain([0, hypotenuse]).range([1, 10]) // used to scale number of segments per line
};

const g = { // have these already created for easier drawing
  basemap:  svg.select("g#basemap"),
  flights:  svg.select("g#flights"),
  airports: svg.select("g#airports"),
  voronoi:  svg.select("g#voronoi")
};

const tooltip = d3.select("text#tooltip");

d3.json(urls.map).then(drawMap); // load and draw base map

const promises = [ // load the airport and flight data together
  d3.csv(urls.airports, typeAirport),
  d3.csv(urls.flights,  typeFlight)
];

let charge = 3;
let link = 0.3;
let airports;
let flights;

Promise.all(promises).then(processData);

function processData(values) { // process airport and flight data
  airports = values[0];
  flights  = values[1];
  console.log("airports: " + airports.length);
  console.log("flights: " + flights.length);

  let ident = new Map(airports.map(node => [node.ident, node])); // convert airports array (pre filter) into map for fast lookup - lav lufthavn søgbar fra dens ident-name

  flights.forEach(function(link) {
    link.source = ident.get(link.ORIGIN);
    link.target = ident.get(link.DESTINATION);
    link.source.outgoing += link.count;
  });

  flights = flights.filter(flight => flight.DATE > '2018-01-05' && flight.DATE < '2018-01-10');
  
  drawAirports(airports);
  drawFlights(airports, flights, charge, link);
  drawPolygons(airports);
}

function drawMap(map) { // DRAW UNDERLYING MAP
  map.objects.states.geometries = map.objects.states.geometries.filter(isContinental);
  let land = topojson.merge(map, map.objects.states.geometries); // run topojson on remaining states and adjust projection

  let path = d3.geoPath(); // use null projection; data is already projected

  g.basemap.append("path") // draw base map
    .datum(land)
    .attr("class", "land")
    .attr("d", path);

  g.basemap.append("path") // draw interior borders
    .datum(topojson.mesh(map, map.objects.states, (a, b) => a !== b))
    .attr("class", "border interior")
    .attr("d", path);

  g.basemap.append("path") // draw exterior borders
    .datum(topojson.mesh(map, map.objects.states, (a, b) => a === b))
    .attr("class", "border exterior")
    .attr("d", path);
}

function drawAirports(airports) {
  g.airports.selectAll("path.flight").remove(); 
  g.airports.selectAll("circle.airport") // draw airport bubbles
    .data(airports, d => d.ident)
    .enter()
    .append("circle")
    .attr("r",  d => scales.airports(d.outgoing)/300)
    .attr("cx", d => d.x) // calculated on load
    .attr("cy", d => d.y) // calculated on load
    .attr("class", "airport")
    .each(function(d) {
      d.bubble = this; // adds the circle object to our airport, makes it fast to select airports on hover
    });
}

function typeAirport(airport) { //see airports.csv, convert gps coordinates to number and init degree
  airport.longitude_deg = parseFloat(airport.longitude_deg);
  airport.latitude_deg  = parseFloat(airport.latitude_deg);

  const coords = projection([airport.longitude_deg, airport.latitude_deg]); // use projection hard-coded to match topojson data
  airport.x = coords[0];
  airport.y = coords[1];

  airport.outgoing = 0;  // eventually tracks number of outgoing flights
  airport.flights = [];  // eventually tracks outgoing flights

  return airport;
}

function typeFlight(flight) { // see flights.csv, convert count to number
  flight.count = parseInt(flight.FLIGHTCOUNT);
  return flight;
}

function drawFlights(airports, flights, charge, link) {
 g.flights.selectAll("path.flight").remove(); 
  let bundle = generateSegments(airports, flights); // break each flight between airports into multiple segments

  let line = d3.line() // https://github.com/d3/d3-shape#curveBundle
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
      d[0].flights.push(this); // adds the path object to our source airport, makes it fast to select outgoing paths
    });

  let layout = d3.forceSimulation() // https://github.com/d3/d3-force
    .alphaDecay(0.5) // settle at a layout faster

    .force("charge", d3.forceManyBody() // nearby nodes attract each other
      .strength(charge) 
      .distanceMax(scales.airports.range()[1] * 3)
    )
  
    .force("link", d3.forceLink() // edges want to be as short as possible, prevents too much stretching
      .strength(link)
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

function generateSegments(nodes, links) {  // Turns a single edge into several segments that can be used for simple edge bundling.
  // generate separate graph for edge bundling
  // nodes: all nodes including control nodes
  // links: all individual segments (source to target)
  // paths: all segments combined into single path for drawing
  let bundle = {nodes: [], links: [], paths: []}; 

  bundle.nodes = nodes.map(function(d, i) { // make existing nodes fixed
    d.fx = d.x;
    d.fy = d.y;
    return d;
  });

  links.forEach(function(d, i) {
    let length = distance(d.source, d.target); // calculate the distance between the source and target

    let total = Math.round(scales.segments(length)); // calculate total number of inner nodes for this link

    let xscale = d3.scaleLinear() // create scales from source to target
      .domain([0, total + 1]) // source, inner nodes, target
      .range([d.source.x, d.target.x]);

    let yscale = d3.scaleLinear()
      .domain([0, total + 1])
      .range([d.source.y, d.target.y]);

    let source = d.source; // initialize source node
    let target = null;

    let local = [source]; // add all points to local path

    for (let j = 1; j <= total; j++) {
      target = { // calculate target node
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

    bundle.links.push({ // add last link to target node
      source: target,
      target: d.target
    });

    bundle.paths.push(local);
  });

  return bundle;
}

function distance(source, target) { // calculates the distance between two nodes
  const dx2 = Math.pow(target.x - source.x, 2);
  const dy2 = Math.pow(target.y - source.y, 2);

  return Math.sqrt(dx2 + dy2);

}

function drawPolygons(airports) {
  const geojson = airports.map(function(airport) { // convert array of airports into geojson format
    return {
      type: "Feature",
      properties: airport,
      geometry: {
        type: "Point",
        coordinates: [airport.longitude_deg, airport.latitude_deg]
      }
    };
  });

  const polygons = d3.geoVoronoi().polygons(geojson); // calculate voronoi polygons

  g.voronoi.selectAll("path")
    .data(polygons.features)
    .enter()
    .append("path")
    .attr("d", d3.geoPath(projection))
    .attr("class", "voronoi")
    .on("mouseover", function(d) {
      let airport = d.properties.site.properties;

      d3.select(airport.bubble)
        .classed("highlight", true);

      d3.selectAll(airport.flights)
        .classed("highlight", true)
        .raise();

      // make tooltip take up space but keep it invisible
      tooltip.style("display", null);
      tooltip.style("visibility", "hidden");

      // set default tooltip positioning
      tooltip.attr("text-anchor", "middle");
      tooltip.attr("dy", 5);
      tooltip.attr("x", airport.x);
      tooltip.attr("y", airport.y);

      // set the tooltip text
      tooltip.text(airport.name);

      // double check if the anchor needs to be changed
      let bbox = tooltip.node().getBBox();

      if (bbox.x <= 0) {
        tooltip.attr("text-anchor", "start");
      }
      else if (bbox.x + bbox.width >= width) {
        tooltip.attr("text-anchor", "end");
      }

      tooltip.style("visibility", "visible");
    })
    .on("mouseout", function(d) {
      let airport = d.properties.site.properties;

      d3.select(airport.bubble)
        .classed("highlight", false);

      d3.selectAll(airport.flights)
        .classed("highlight", false);

      d3.select("text#tooltip").style("visibility", "hidden");
    })
}

function isContinental(state) {
  const id = parseInt(state.id);
  return id < 60 && id !== 2 && id !== 15;
}