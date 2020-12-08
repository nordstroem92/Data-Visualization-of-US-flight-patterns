class DaVi {
    static urls = {
        map: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json",//"https://d3js.org/us-10m.v1.json",//"https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json", // source: https://github.com/topojson/us-atlas
        airports: "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/airport_locations.csv", // source: https://gist.github.com/mbostock/7608400
        population_data: "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_population_data.csv" //https://worldpopulationreview.com/state-rankings/state-densities
    };
    static width = 480;//960;
    static height = 300//600;
    static hypotenuse = Math.sqrt(DaVi.width * DaVi.width + DaVi.height * DaVi.height);
    static projection = d3.geoAlbers().scale(640).translate([240, 150]); // 480x300 must be hard-coded to match our topojson projection, source: https://github.com/topojson/us-atlas
    static scales = {
        airports: d3.scaleSqrt().range([4, 18]), // used to scale airport bubbles
        segments: d3.scaleLinear().domain([0, DaVi.hypotenuse]).range([1, 10]) // used to scale number of segments per line
    };
    static path = d3.geoPath();  //d3.geoPath()

    static updating = 0;

    constructor(svg_id, dataset) {
        this.svg = d3.select(svg_id);
        this.airports;

        this.g = { // have these already created for easier drawing
            basemap: this.svg.select(".basemap"),
            flights: this.svg.select(".flights"),
            airports: this.svg.select(".airports"),
            voronoi: this.svg.select(".voronoi")
        };
        this.tooltip = this.svg.select(".tooltip");

        this.promises = [
            d3.json(DaVi.urls.map),
            d3.csv(DaVi.urls.airports, typeAirport),
            d3.csv(DaVi.urls.population_data)
        ]
        Promise.all(this.promises).then(setup_values => this.initSetup(setup_values, dataset));
    }

    initSetup(setup_values, dataset) { // process airport and flight data
        this.map_data = typeMap(setup_values[0]);
        this.airports = setup_values[1];
        this.population_data = setup_values[2];
        this.updateMap(dataset);
    }

    updateMap(dataset) {
        this.flights_dataset = dataset[0];
        this.corona_dataset = dataset[1];

        this.flights = this.flights_dataset[0];
        this.corona = this.corona_dataset[0]

        console.log(this.corona);

        this.totalFlights = this.flights_dataset[1];
        this.maxFlightCount = this.flights_dataset[2];

        this.totalDeaths = this.corona_dataset[1];
        this.maxDeathCount = this.corona_dataset[2];

        this.strengths = d3.scaleLinear().domain([0, this.maxFlightCount]).range([0, 25 / 2]);
        this.links = d3.scaleLinear().domain([0, this.maxFlightCount]).range([0, 1]);

        this.flightColor = d3.scaleLinear()
            .domain([0, this.maxFlightCount])
            .range(['#08306b', '#08519c', '#2171b5', '#4292c6', '#6baed6', '#9ecae1', '#c6dbef', '#deebf7', '#f7fbff'])
            .interpolate(d3.interpolateHcl);

        this.coronaColor = d3.scaleLinear()
            .domain([0, this.maxDeathCount])
            .range(['#08306b', '#08519c', '#2171b5', '#4292c6', '#6baed6', '#9ecae1', '#c6dbef', '#deebf7', '#f7fbff'])
            .interpolate(d3.interpolateHcl);


        this.drawMap(this.corona);
        this.createLinks(this.flights);
        this.drawAirports();
        this.drawFlights(this.flights);
        //this.drawPolygons();
    }

    drawMap(covid_data) { // DRAW UNDERLYING MAP
        let map = this.map_data;
        let covid = covid_data;
        let population_data = this.population_data;

        map.objects.states.geometries = map.objects.states.geometries.filter(isContinental);
        let land = topojson.merge(map, map.objects.states.geometries); // run topojson on remaining states and adjust projection

        let basemap_fill = "none";

        if (covid.length) { //only draw choropleth map if it has covid data
            this.drawChroropleth(map, covid, population_data);
        } else {
            basemap_fill = "#F5F5F5";
        }

        this.g.basemap.append("path") // draw base map
            .datum(land)
            .attr("class", "land")
            .attr("d", DaVi.path)
            .attr("fill", basemap_fill);

        this.g.basemap.append("path") // draw interior borders
            .datum(topojson.mesh(map, map.objects.states, (a, b) => a !== b))
            .attr("class", "border interior")
            .attr("d", DaVi.path);

        this.g.basemap.append("path") // draw exterior borders
            .datum(topojson.mesh(map, map.objects.states, (a, b) => a === b))
            .attr("class", "border exterior")
            .attr("d", DaVi.path);
    }

    drawChroropleth(map, covid, population_data) {
        /*
        map.objects.states.geometries.forEach(obj => {
            obj.deaths = 0;
            obj.pop_density = 0;
            for (let i = 0; i < covid.length; i++) {
                if (obj.properties.name !== covid[i].STATE) continue;
                obj.deaths = +covid[i].DEATHS;
                break;
            }
            for (let i=0; i < population_data.length; i++){
                let val = population_data[i];
                if(obj.properties.name !== val.STATE) continue;
                obj.pop_density = parseFloat(val.DENSITY);
                break;
            }
        });
         */
        this.g.basemap.append("g")
            .attr("class", "land")
            .selectAll("path")
            .data(topojson.feature(map, map.objects.states).features)
            .enter().append("path")
            .attr("fill", feature => {
                let defaultColor = "rgba(150,150,150,1)";
                //console.log(feature.properties.name);
                for(let i=0; i< covid.length; i++){
                    let obj = covid[i];
                    //console.log(feature.properties.name, obj.STATE);
                    if(feature.properties.name !== obj.STATE) continue;
                    //let relative_deaths = obj.RELATIVE_DEATHS;
                    console.log(obj);
                    let color = this.coronaColor(relative_deaths);
                    //console.log(relative_deaths, color);
                    let res = color.split("(");
                    let res2 = res[1].split(")");
                    return "rgba(" + res2[0] + ",1)";
                }

                /*
                for(let i=0; i< map.objects.states.geometries.length; i++){
                    let obj = map.objects.states.geometries[i];
                    if(feature.id !== obj.id) continue;
                    let relative_deaths = obj.deaths/obj.pop_density;
                    let color = this.coronaColor(relative_deaths);
                    let res = color.split("(");
                    let res2 = res[1].split(")");
                    return "rgba(" + res2[0] + ",1)";
                }

                 */
                return defaultColor;
            })
            .attr("d", DaVi.path)
            .append("title")
            .text(d => d.rate + "%");
    }

    drawAirports() {
        let tooltip = this.tooltip;
        this.g.airports.selectAll("circle.airport").remove();
        this.g.airports.selectAll("circle.airport") // draw airport bubbles
            .data(this.airports, d => d.ident)
            .enter()
            .append("circle")
            .attr("r", 4)
            .attr("cx", d => d.x) // calculated on load
            .attr("cy", d => d.y) // calculated on load
            .attr("class", d => "airport " + d.ident)
            .each(function (d) {
                d.bubble = this; // adds the circle object to our airport, makes it fast to select airports on hover
            })
            .on("mouseover", function (d) {
                d3.select(this)
                    .classed("highlight", true);

                d3.selectAll(d.flights)
                    .classed("highlight", true)
                    .raise();

                // make tooltip take up space but keep it invisible
                tooltip.style("display", null);
                tooltip.style("visibility", "hidden");

                // set default tooltip positioning
                tooltip.attr("text-anchor", "middle");
                tooltip.attr("dy", -15);
                tooltip.attr("x", d.x);
                tooltip.attr("y", d.y);

                // set the tooltip text
                tooltip.text(d.name);

                // double check if the anchor needs to be changed
                let bbox = tooltip.node().getBBox();

                if (bbox.x <= 0) {
                    tooltip.attr("text-anchor", "start");
                } else if (bbox.x + bbox.width >= DaVi.width) {
                    tooltip.attr("text-anchor", "end");
                }

                tooltip.style("visibility", "visible");
            })
            .on("mouseout", function (d) {
                d3.select(this)
                    .classed("highlight", false);

                d3.selectAll(d.flights)
                    .classed("highlight", false);

                tooltip.style("visibility", "hidden");
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
            .attr("stroke-width", d => d[1].weight / this.maxFlightCount * 2.0) //d => d.length/3
            .attr("stroke", (d) => {
                let color = this.flightColor(d[1].weight);
                let res = color.split("(");
                let res2 = res[1].split(")");
                return "rgba(" + res2[0] + ",1)";
            })//d => "rgba(0,0,180,"+(d.length/2)+")")
            .each(function (d) {
                d[0].flights.push(this); // adds the path object to our source airport, makes it fast to select outgoing paths
            });

        let layout = d3.forceSimulation() // https://github.com/d3/d3-force
            .alphaDecay(0.6) // settle at a layout faster

            .force("charge", d3.forceManyBody() // nearby nodes attract each other
                .strength(d => this.strengths(d.outgoing))
                .distanceMax(1000)
            )
            .force("link", d3.forceLink() // edges want to be as short as possible, prevents too much stretching
                .strength(d => this.links(d.weight))
                .distance(0)
            )
            .on("tick", function (d) {
                links.attr("d", line);
            })
            .on("end", function (d) {
                DaVi.updating += 1;
                if (DaVi.updating >= 3) {
                    DaVi.updating = 0;
                    document.getElementById("loader").style.display = "none";
                }
                console.log("layout complete");
            });

        layout.nodes(bundle.nodes).force("link").links(bundle.links);
    }

    createLinks(flights) {
        let ident = new Map(this.airports.map(node => [node.ident, node]));
        this.airports.forEach(airport => airport.outgoing = 0);

        flights.forEach(function (link) {
            link.source = ident.get(link.ORIGIN);
            link.target = ident.get(link.DESTINATION);
            link.source.outgoing += parseInt(link.FLIGHTCOUNT);
        });
    }

    drawPolygons() {
        let tooltip = this.tooltip;
        // convert array of airports into geojson format
        const geojson = this.airports.map(function (airport) {
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
            .on("mouseover", function (d) {
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
                tooltip.attr("dy", -15);
                tooltip.attr("x", airport.x);
                tooltip.attr("y", airport.y);

                // set the tooltip text
                tooltip.text(airport.name);

                // double check if the anchor needs to be changed
                let bbox = tooltip.node().getBBox();

                if (bbox.x <= 0) {
                    tooltip.attr("text-anchor", "start");
                } else if (bbox.x + bbox.width >= DaVi.width) {
                    tooltip.attr("text-anchor", "end");
                }

                tooltip.style("visibility", "visible");
            })
            .on("mouseout", function (d) {
                let airport = d.properties.site.properties;

                d3.select(airport.bubble)
                    .classed("highlight", false);

                d3.selectAll(airport.flights)
                    .classed("highlight", false);

                tooltip.style("visibility", "hidden");
            })
    }

    generateSegments(nodes, links) { //this.airports, flights
        // generate separate graph for edge bundling
        // nodes: all nodes including control nodes
        // links: all individual segments (source to target)
        // paths: all segments combined into single path for drawing
        let bundle = {nodes: [], links: [], paths: []};

        // make existing nodes fixed
        bundle.nodes = nodes.map(function (d, i) {
            d.fx = d.x;
            d.fy = d.y;
            return d;
        });

        links.forEach(function (d) {
            // calculate the distance between the source and target
            let length = distance(d.source, d.target);

            // calculate total number of inner nodes for this link
            let total = Math.round(DaVi.scales.segments(length));

            let weight = +d.FLIGHTCOUNT;
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
                    y: yscale(j),
                    weight: weight
                };

                local.push(target);
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
    airport.latitude_deg = parseFloat(airport.latitude_deg);

    const coords = DaVi.projection([airport.longitude_deg, airport.latitude_deg]); // use projection hard-coded to match topojson data
    airport.x = coords[0];
    airport.y = coords[1];

    airport.outgoing = 0;  // eventually tracks number of outgoing flights
    airport.flights = [];  // eventually tracks outgoing flights

    return airport;
}

function typeMap(map) { //see airports.csv, convert gps coordinates to number and init degree
    map.transform.scale[0] = 0.00507599312;
    map.transform.scale[1] = 0.00296799503;

    map.transform.translate[0] = -30; //needs to be hardcoded
    map.transform.translate[1] = 11.5; //needs to be hardcoded

    return map;
}

function isContinental(state) {
    const id = parseInt(state.id);
    return id < 60 && id !== 2 && id !== 15;
}