var HistoricalBarChartPrivates = {
    showXAxis : true
    , showYAxis : true
    , tooltips : true
    , state : {}
    , defaultState : null
    , transitionDuration : 250
    , showLegend : true
    , _color : nv.utils.defaultColor()
    , _rightAlignYAxis : false
};

/**
 * A HistoricalBarChart
 */
function HistoricalBarChart(options){

    options = nv.utils.valueOrDefault(options, {
        margin: {top: 30, right: 90, bottom: 50, left: 90}
        , chartClass: 'historicalBarChart'
        , wrapClass: 'barsWrap'
    });

    Chart.call(this, options, ['tooltipShow', 'tooltipHide', 'stateChange', 'changeState']);

    this.historicalBar = nv.models.historicalBar();
    this.xScale = this.historicalBar.xScale;
    this.yScale = this.historicalBar.yScale;

    this.showTooltip = function(e, offsetElement) {
        // New addition to calculate position if SVG is scaled with viewBox, may move TODO: consider implementing everywhere else
        if (offsetElement) {
            var svg = d3.select(offsetElement).select('svg');
            var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
            if (viewBox) {
                viewBox = viewBox.split(' ');
                var ratio = parseInt(svg.style('width')) / viewBox[2];
                e.pos[0] = e.pos[0] * ratio;
                e.pos[1] = e.pos[1] * ratio;
            }
        }
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = this.xAxis().tickFormat()(this.historicalBar.x()(e.point, e.pointIndex)),
            y = this.yAxis().tickFormat()(this.historicalBar.y()(e.point, e.pointIndex)),
            content = this.tooltip()(e.series.key, x, y);
        nv.tooltip.show([left, top], content, null, null, offsetElement);
    };
}

nv.utils.create(HistoricalBarChart, Chart, HistoricalBarChartPrivates);

HistoricalBarChart.prototype.wrapper = function(data){
    Chart.prototype.wrapper.call(this, data);
};

HistoricalBarChart.prototype.draw = function(data){

    var that = this;

    this.historicalBar
        .width(this.available.width)
        .height(this.available.height)
        .color(
            d3.functor(
                data.map(function(d,i) { return d.color || that._color(d, i)}.bind(this))
                    .filter(function(d,i) { return !data[i].disabled })
            )
        );

    var barsWrap = this.g.select('.nv-barsWrap')
        .datum(data.filter(function(d) { return !d.disabled }))
        .transition()
        .call(this.historicalBar);

    Chart.prototype.draw.call(this, data);
};

HistoricalBarChart.prototype.attachEvents = function(){
    Chart.prototype.attachEvents.call(this);

    this.historicalBar.dispatch
        .on('elementMouseover.tooltip', function(e) {
            e.pos = [e.pos[0] +  this.margin().left, e.pos[1] + this.margin().top];
            this.dispatch.tooltipShow(e);
        }.bind(this))
        .on('elementMouseout.tooltip', function(e) {
            this.dispatch.tooltipHide(e);
        }.bind(this));

    this.legend.dispatch
        .on('legendClick', function(d) {
            d.disabled = !d.disabled;
            if (!data.filter(function(d) { return !d.disabled }).length) {
                data.map(function(d) {
                    d.disabled = false;
                    this.wrap.selectAll('.nv-series').classed('disabled', false);
                    return d;
                }.bind(this));
            }
            this.state.disabled = data.map(function(d) { return !!d.disabled });
            this.dispatch.stateChange(this.state);
            this.svg.transition().call(this.historicalBar);
        }.bind(this))
        .on('legendDblclick', function(d) {
            //Double clicking should always enable current series, and disabled all others.
            data.forEach(function(d) { d.disabled = true });
            d.disabled = false;
            this.state.disabled = data.map(function(d) { return !!d.disabled });
            this.dispatch.stateChange(this.state);
            this.update();
        }.bind(this));

    // add parentNode, override Charts' 'tooltipShow'
    this.dispatch.on('tooltipShow', function(e) {
        if (this.tooltips()) this.showTooltip(e, this.svg[0][0].parentNode);
    }.bind(this));
};

HistoricalBarChart.prototype.color = function(_) {
    if (!arguments.length) return this._color();
    this._color(nv.utils.getColor(_));
    this.legend.color(this._color());
    return this;
};

HistoricalBarChart.prototype.rightAlignYAxis = function(_) {
    if(!arguments.length) return this._rightAlignYAxis();
    this._rightAlignYAxis(_);
    this.yAxis().orient( (_) ? 'right' : 'left');
    return this;
};

HistoricalBarChart.prototype.tooltipContent = function(_) {
    if (!arguments.length) return this.tooltip();
    this.tooltip(_);
    return this;
};

/**
 * The historicalBarChart model returns a function wrapping an instance of a HistoricalBarChart.
 */
nv.models.historicalBarChart = function() {
    "use strict";

    var historicalBarChart = new HistoricalBarChart();

    function chart(selection) {
        historicalBarChart.render(selection);
        return chart;
    }

    chart.dispatch = historicalBarChart.dispatch;
    chart.historicalBar = historicalBarChart.historicalBar;

    d3.rebind(chart, historicalBarChart.historicalBar, 'defined', 'isArea', 'x', 'y', 'size', 'xScale', 'yScale',
        'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi',
        'id', 'interpolate','highlightPoint', 'clearHighlights', 'interactive');

    chart.options = nv.utils.optionsFunc.bind(chart);

    nv.utils.rebindp(chart, historicalBarChart, HistoricalBarChart.prototype,
        'margin', 'width', 'height', 'color', 'showLegend', 'showXAxis', 'showYAxis', 'rightAlignYAxis', 'tooltips',
        'tooltipContent', 'state', 'defaultState', 'noData', 'transitionDuration', 'xAxis', 'yAxis'
    );

    return chart;
};