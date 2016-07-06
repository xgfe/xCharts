/**
 * Author mzefibp@163.com
 * Date 16/6/23
 * Describe 时间轴刷子
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(brush, Component);
    components.extend({brush: brush});

    function brush(messageCenter, config, type) {
        //show=false时不做显示处理
        // 不是坐标系不显示
        if (config.brush.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承Component的属性
        Component.call(this, messageCenter, config, type);
    }

    brush.prototype.extend = utils.extend;

    brush.prototype.extend({
        start: function () {
            var _this = this;
            this.init(this.messageCenter, this.config, this.type);
            this.on('xAxisReady.brush', function () {
                _this.render();
                _this.ready();
            });
        },
        init: function (messageCenter, config) {
            // 先占位,等坐标轴完成后再绘制时间刷

            this.brushConfig = utils.merage(defaultConfig(),config.brush);

            this.margin.bottom += this.brushConfig.brushHeight + 10;

        },
        render: function () {

            var xScale = this.messageCenter.xAxisScale[0];
            xScale = xScale.copy();
            var brush = d3.svg.brush()
                .x(xScale);

            brush.extent(initExtent(this,xScale.domain()));

            var translateX = 0;
            var translateY = this.messageCenter.originalHeight - this.margin.bottom;
            var width = this.messageCenter.originalWidth - this.margin.left - this.margin.right;
            var height = this.messageCenter.originalHeight - this.margin.top - this.margin.bottom;

            var group = this.main.selectAll('g.xc-brush').data([this]);
            group.enter().append('g')
                .attr('class', 'xc-brush');

            group.attr('transform', 'translate(' + translateX + ',' + translateY + ')')
                .call(brush)

            group.selectAll('rect.background')
                .style('visibility', 'visible')
                .attr('fill', '#e0e0e0')
                .attr('opacity', 0.5)

            group.selectAll('rect')
                .attr('height', 25)
                .attr('fill', '#e0e0e0');

            group.selectAll('.resize rect')
                .style('visibility', 'visible')
                .attr('fill', '#a2a2a2')
                .attr('width', 10);

            this.brush = brush;
            this.xScale = xScale;

            //添加clipath路径
            var defGroup = this.svg.selectAll('defs').data([this]);
            defGroup.enter().append('defs');

            var clip = defGroup.selectAll('clipPath#xc-clip-main-path').data([this]);
            clip.enter().append("clipPath").attr('id','xc-clip-main-path');

            var rect = clip.selectAll('rect').data([this]);
            rect.enter().append('rect');
            rect.attr('width',width)
                .attr('height',height);

        },
        ready: function () {
            var brush = this.brush;
            brushChange = brushChange.bind(this,brush);
            this.brush.on('brush',brushChange);
            // 手动通知别人刷新一次
            brushChange();
        }
    });

    function brushChange(brush){
        var domain = brush.extent();
        this.fire('brushChange',domain);
    }

    // 设置时间刷初始值
    function initExtent(ctx,domain) {
        var length = domain[1]-domain[0];
        var minDomain = parseFloat(ctx.brushConfig.domain[0]);
        var maxDomain = parseFloat(ctx.brushConfig.domain[1]);

        var minTime = domain[0].valueOf() + minDomain/100*length;
        var maxTime = domain[0].valueOf() + maxDomain/100*length;
        console.log([
            new Date(minTime),
            new Date(maxTime)
        ])
        return [
            new Date(minTime),
            new Date(maxTime)
        ]
    }

    function defaultConfig() {

        /**
         * brush配置项
         * @var brush
         * @type Object
         * @extends xCharts
         * @description 时间轴特有的时间刷
         */
        return {
            /**
             * @var show
             * @type Boolean
             * @extends xCharts.brush
             * @default true
             * @description 控制时间刷是否显示。注意时间刷只会在axis.type=time的情况下才会起作用
             */
            show: true,
            /**
             * @var domain
             * @type Array
             * @extends xCharts.brush
             * @default ['90%','100%']
             * @description 设置时间刷的初始值,只支持百分比的形式
             */
            domain:['90%','100%'],
            /**
             * @var brushHeight
             * @type Number
             * @extends xCharts.brush
             * @default 30
             * @description 设置时间刷的高
             */
            brushHeight: 30
        }
    }

}(xCharts, d3));