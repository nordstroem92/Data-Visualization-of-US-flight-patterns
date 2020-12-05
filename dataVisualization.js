class DaVi {
  static urls = {
    map: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json", // source: https://github.com/topojson/us-atlas
    airports: "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/airport_locations.csv", // source: https://gist.github.com/mbostock/7608400
  };
  static width  = 960;
  static height = 600;
  static hypotenuse = Math.sqrt(DaVi.width * DaVi.width + DaVi.height * DaVi.height);
  static projection = d3.geoAlbers().scale(1280).translate([480, 300]); // must be hard-coded to match our topojson projection, source: https://github.com/topojson/us-atlas
  static scales = {
    airports: d3.scaleSqrt().range([4, 18]), // used to scale airport bubbles
    segments: d3.scaleLinear().domain([0, DaVi.hypotenuse]).range([1, 10]), // used to scale number of segments per line
    strengths: d3.scaleLinear().domain([0, 60000]).range([0, 130]),
    links: d3.scaleLinear().domain([0, 16000]).range([0,1])
  };
  static tooltip = d3.select("text#tooltip");

  constructor(svg_id, flights_dataset){
    this.svg  = d3.select(svg_id);
    this.airports;
    this.flights = flights_dataset;

    this.g = { // have these already created for easier drawing
      basemap:  this.svg.select(".basemap"),
      flights:  this.svg.select(".flights"),
      airports: this.svg.select(".airports"),
      voronoi:  this.svg.select(".voronoi")
    };

    d3.json(DaVi.urls.map).then(data => this.drawMap(data, this.g.basemap));
    d3.csv(DaVi.urls.airports, typeAirport).then(data => this.initSetup(data, this.flights)) 
  }

  initSetup(airports, flight_data) { // process airport and flight data
    this.airports = airports;
    this.updateMap(flight_data);
  }

  updateMap(flights){
      console.log(flights);
    this.createLinks(flights);
    this.drawAirports();
    this.drawFlights(flights);
    //this.drawPolygons();
  }

  drawMap(map) { // DRAW UNDERLYING MAP
    map.objects.states.geometries = map.objects.states.geometries.filter(isContinental);
    let land = topojson.merge(map, map.objects.states.geometries); // run topojson on remaining states and adjust projection
  
    let path = d3.geoPath(); // use null projection; data is already projected
  
    this.g.basemap.append("path") // draw base map
      .datum(land)
      .attr("class", "land")
      .attr("d", path);
  
    this.g.basemap.append("path") // draw interior borders
      .datum(topojson.mesh(map, map.objects.states, (a, b) => a !== b))
      .attr("class", "border interior")
      .attr("d", path);
  
    this.g.basemap.append("path") // draw exterior borders
      .datum(topojson.mesh(map, map.objects.states, (a, b) => a === b))
      .attr("class", "border exterior")
      .attr("d", path);
  }
  
  drawAirports() {
    this.g.airports.selectAll("circle.airport").remove(); 
    this.g.airports.selectAll("circle.airport") // draw airport bubbles
      .data(this.airports, d => d.ident)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("cx", d => d.x) // calculated on load
      .attr("cy", d => d.y) // calculated on load
      .attr("class", d => "airport " + d.ident)
      .each(function(d) {
        d.bubble = this; // adds the circle object to our airport, makes it fast to select airports on hover
      })
      .on("mouseover", function (d) {

            d3.select(this)
                .classed("highlight", true);

          d3.selectAll(d.flights)
              .classed("highlight", true)
              .raise();

            // make tooltip take up space but keep it invisible
            DaVi.tooltip.style("display", null);
            DaVi.tooltip.style("visibility", "hidden");

            // set default tooltip positioning
            DaVi.tooltip.attr("text-anchor", "middle");
            DaVi.tooltip.attr("dy", -15);
            DaVi.tooltip.attr("x", d.x);
            DaVi.tooltip.attr("y", d.y);

            // set the tooltip text
            DaVi.tooltip.text(d.name);

            // double check if the anchor needs to be changed
            let bbox = DaVi.tooltip.node().getBBox();

            if (bbox.x <= 0) {
                DaVi.tooltip.attr("text-anchor", "start");
            }
            else if (bbox.x + bbox.width >= DaVi.width) {
                DaVi.tooltip.attr("text-anchor", "end");
            }

            DaVi.tooltip.style("visibility", "visible");
        })
      .on("mouseout", function(d) {
            d3.select(this)
                .classed("highlight", false);

          d3.selectAll(d.flights)
              .classed("highlight", false);

            d3.select("text#tooltip").style("visibility", "hidden");
        });
      setupOnClick();
  }

  drawFlights(flights) {
     this.g.flights.selectAll("path.flight").remove(); 
     let bundle = this.generateSegments(this.airports, flights); // break each flight between airports into multiple segments

     let line = d3.line() // https://github.com/d3/d3-shape#curveBundle
       .curve(d3.curveBundle)
       .x(airport => airport.x)
       .y(airport => airport.y);

      let links = this.g.flights.selectAll("path.flight")
       .data(bundle.paths)
       .enter()
       .append("path")
       .attr("d", line)
       .attr("class", "flight")
       .attr("stroke-width", "1.5px") //d => d.length/3
       .attr("stroke","rgba(20,20,180,0.95")//d => "rgba(0,0,180,"+(d.length/2)+")")
       .each(function(d) {
         d[0].flights.push(this); // adds the path object to our source airport, makes it fast to select outgoing paths
       });
   
     let layout = d3.forceSimulation() // https://github.com/d3/d3-force
       .alphaDecay(0.6) // settle at a layout faster
   
       .force("charge", d3.forceManyBody() // nearby nodes attract each other
         .strength(d => DaVi.scales.strengths(d.outgoing))
         .distanceMax(1000)
       )
       .force("link", d3.forceLink() // edges want to be as short as possible, prevents too much stretching
         .strength(d => DaVi.scales.links(d.weight))
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

   createLinks(flights){
    let ident = new Map(this.airports.map(node => [node.ident, node]));
    this.airports.forEach(airport => airport.outgoing = 0);

    flights.forEach(function(link) {
        link.source = ident.get(link.ORIGIN);
        link.target = ident.get(link.DESTINATION);
        link.source.outgoing += parseInt(link.FLIGHTCOUNT);
    }); 
   }

   drawPolygons() {
    // convert array of airports into geojson format
    const geojson = this.airports.map(function(airport) {
      return {
        type: "Feature",
        properties: airport,
        geometry: {
          type: "Point",
          coordinates: [airport.longitude_deg, airport.latitude_deg]
        }
      };
    });
  
    // calculate voronoi polygons
    const polygons = d3.geoVoronoi().polygons(geojson);
    this.g.voronoi.selectAll("path")
      .data(polygons.features)
      .enter()
      .append("path")
      .attr("d", d3.geoPath(DaVi.projection))
      .attr("class", "voronoi")
      .on("mouseover", function(d) {
        let airport = d.properties.site.properties;
  
        d3.select(airport.bubble)
          .classed("highlight", true);
  
        d3.selectAll(airport.flights)
          .classed("highlight", true)
          .raise();
  
        // make tooltip take up space but keep it invisible
        DaVi.tooltip.style("display", null);
        DaVi.tooltip.style("visibility", "hidden");
  
        // set default tooltip positioning
        DaVi.tooltip.attr("text-anchor", "middle");
        DaVi.tooltip.attr("dy", -15);
        DaVi.tooltip.attr("x", airport.x);
        DaVi.tooltip.attr("y", airport.y);
  
        // set the tooltip text
        DaVi.tooltip.text(airport.name);
  
        // double check if the anchor needs to be changed
        let bbox = DaVi.tooltip.node().getBBox();
  
        if (bbox.x <= 0) {
          DaVi.tooltip.attr("text-anchor", "start");
        }
        else if (bbox.x + bbox.width >= DaVi.width) {
          DaVi.tooltip.attr("text-anchor", "end");
        }
  
        DaVi.tooltip.style("visibility", "visible");
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
  generateSegments(nodes, links) { //this.airports, flights
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
  
    links.forEach(function(d) {
      // calculate the distance between the source and target
      let length = distance(d.source, d.target);
  
      // calculate total number of inner nodes for this link
      let total = Math.round(DaVi.scales.segments(length));
      
      let weight = d.FLIGHTCOUNT; 

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
          target: target,
          weight: weight
        });
  
        source = target;
      }
      local.push(d.target);
      
      // add last link to target node
      bundle.links.push({
        source: target,
        target: d.target,
        weight: weight
      });
  
      bundle.paths.push(local);
    });
    return bundle;
  }
}

function distance(source, target) { // calculates the distance between two nodes
  const dx2 = Math.pow(target.x - source.x, 2);
  const dy2 = Math.pow(target.y - source.y, 2);
  return Math.sqrt(dx2 + dy2);
}

function typeAirport(airport) { //see airports.csv, convert gps coordinates to number and init degree
  airport.longitude_deg = parseFloat(airport.longitude_deg);
  airport.latitude_deg  = parseFloat(airport.latitude_deg);

  const coords = DaVi.projection([airport.longitude_deg, airport.latitude_deg]); // use projection hard-coded to match topojson data
  airport.x = coords[0];
  airport.y = coords[1];

  airport.outgoing = 0;  // eventually tracks number of outgoing flights
  airport.flights = [];  // eventually tracks outgoing flights

  return airport;
}

function isContinental(state) {
  const id = parseInt(state.id);
  return id < 60 && id !== 2 && id !== 15;
}