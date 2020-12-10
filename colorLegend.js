class ColorLegend{

    constructor({
                    color,
                    title,
                    tickSize = 6,
                    width = 320,
                    height = 60 + tickSize,
                    marginTop = 18,
                    marginRight = 0,
                    marginBottom = 16 + tickSize,
                    marginLeft = 0,
                    ticks = width / 64,
                    tickFormat,
                    tickValues
                } = {}) {

        let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);

        d3.select("#legend-body").remove();

        const svg = d3.select(".legend").append("svg")
            .attr("id", "legend-body")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("overflow", "visible")
            .style("display", "block")
            .style("transform", "rotate(-90deg)")

        const n = Math.min(color.domain().length, color.range().length);

        let x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

        svg.append("image")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("preserveAspectRatio", "none")
            .attr("xlink:href", this.ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());

        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x)
                .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
                .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
                .tickSize(tickSize)
                .tickValues(tickValues))
            .call(tickAdjust)
            .call(g => g.select(".domain").remove())
            .call(g => g.append("text")
                .attr("x", -140)
                .attr("y", -340)//marginTop + marginBottom - height + 30)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .style("transform","rotate(90deg)")
                .text(title));

    }

    ramp = (color, n = 256) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext("2d");
        d3.select(canvas).attr("width", n)
            .attr("height", 1);
        for (let i = 0; i < n; ++i) {
            context.fillStyle = color(i / (n - 1));
            context.fillRect(i, 0, 1, 1);
        }
        return canvas;
    }
}




