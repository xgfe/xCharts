/**
 * Author mzefibp@163.com
 * Date 16/6/21
 * Describe 坐标系里的辅助线
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(guides, Component);
    components.extend({guides: guides});

    function guides(messageCenter, config, type) {
        //show=false时不做显示处理
        // 不是坐标系不显示
        if (config.guides.show === false || messageCenter.xAxisScale===undefined || messageCenter.yAxisScale===undefined) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承Component的属性
        Component.call(this, messageCenter, config, type);
    }

    guides.prototype.extend = utils.extend;

    guides.prototype.extend({
        init: function () {
            this.guidesConfig = utils.merage(defaultConfig(), this.config.guides);
        },
        render: function () {
            __renderLine.call(this);
            __renderBox.call(this);
        },
        ready: function () {
            if (this.mobileMode) {
                this.mobileReady();
            } else {
                // 绑定到div上
                this.div.on('mousemove.scatter', assitLineTrigger(this));
            }
        }
    });

    /**
     * 绘出xy线
     * @private
     */
    function __renderLine() {
        var guidesConfig = this.guidesConfig;
        var xLine = this.svg.selectAll('line.xc-scatter-line-x').data([this]);
        xLine = xLine.enter().append('line')
            .attr('class', 'xc-scatter-line-x')
            .style('pointer-events', 'none')
            .attr('stroke-width',guidesConfig.lineStyle.width)
            .attr('stroke',guidesConfig.lineStyle.color)
            .attr('stroke-dasharray',guidesConfig.lineStyle.dasharray)
            .merge(xLine);

        var yLine = this.svg.selectAll('line.xc-scatter-line-y').data([this])
        yLine = yLine.enter().append('line')
            .attr('class', 'xc-scatter-line-y')
            .style('pointer-events', 'none')
            .attr('stroke-width',guidesConfig.lineStyle.width)
            .attr('stroke',guidesConfig.lineStyle.color)
            .attr('stroke-dasharray',guidesConfig.lineStyle.dasharray)
            .merge(yLine)


        this.width = this.messageCenter.originalWidth - this.margin.left - this.margin.right;
        this.height = this.messageCenter.originalHeight - this.margin.top - this.margin.bottom;

        var x1 = this.margin.left;
        var x2 = this.margin.left + this.width;
        var y1 = this.margin.top;
        var y2 = this.height + y1;
        xLine.attr('x1', x1)
            .attr('x2', x1)
            .attr('y1', y1)
            .attr('y2', y2)
            .style('display', 'none')

        yLine.attr('x1', x1)
            .attr('x2', x2)
            .attr('y1', y1)
            .attr('y2', y1)
            .style('display', 'none')

        this.xLine = xLine;
        this.yLine = yLine;
    }

    /**
     * 插入文字容器
     * @private
     */
    function __renderBox() {
        var guidesConfig = this.guidesConfig;
        var textBox = this.svg.selectAll('text.xc-scatter-assitline')
            .data([this])
            .enter()
            .append('text')
            .attr('class', 'xc-scatter-assitline')
            .attr('text-anchor', 'left');
        var textSpan = textBox.selectAll('tspan.xc-span').data([this]).enter().append('tspan')
            .attr('class', 'xc-span')
            .attr('fill',guidesConfig.textStyle.color)
            .attr('font-size',guidesConfig.textStyle.fontSize)

        this.textBox = textBox;
        this.textSpan = textSpan;
    }

    guides.assitLineTrigger = assitLineTrigger;

    function assitLineTrigger(ctx) {
        var textSpan = ctx.textSpan;
        var textBox = ctx.textBox;
        var margin = ctx.margin;
        var yScale = ctx.messageCenter.yAxisScale[0];
        var xScale = ctx.messageCenter.xAxisScale[0];
        var xLine = ctx.xLine;
        var yLine = ctx.yLine;
        var xFormat = ctx.guidesConfig.textStyle.xFormat;
        var yFormat = ctx.guidesConfig.textStyle.yFormat;
        return function () {
            
            if(xScale.scaleType !== 'value' || yScale.scaleType !== 'value'){
                // 辅助线必须在坐标轴都是value的情况下生效
                return;
            }
            
            var position = d3.mouse(ctx.svg.node());
            if (!judgeOutBoundary(ctx, position)) {
                xLine.style('display', 'none');
                yLine.style('display', 'none');
                textBox.style('display', 'none');
                return false;
            }
            var x = position[0] - margin.left;
            var y = position[1] - margin.top;

            var xValue = xScale.invert(x).toFixed(2);
            var yValue = yScale.invert(y).toFixed(2);

            textBox.style('display', 'block');
            textSpan.text(xFormat(xValue) + ',' + yFormat(yValue));

            xLine.attr('x1', position[0])
                .attr('x2', position[0])
                .style('display', 'block');
            yLine.attr('y1', position[1])
                .attr('y2', position[1])
                .style('display', 'block');

            // 文字向上偏移
            position[1] -= 10;
            position[0] += 10;
            textBox.attr('transform', 'translate(' + position.join(',') + ')');
        }
    }

    /**
     * 判断超出边界,边界以坐标轴为准
     * @param ctx 上下文this
     * @param position 当前鼠标坐标
     * @return {boolean} true:未超出边界,false超出边界
     */
    function judgeOutBoundary(ctx, position) {
        var x1 = ctx.margin.left;
        var x2 = ctx.margin.left + ctx.width;
        if (position[0] <= x1 || position[0] >= x2) {
            return false;
        }

        var y1 = ctx.margin.top;
        var y2 = ctx.margin.top + ctx.height;

        if (position[1] <= y1 || position[1] >= y2) {
            return false;
        }

        return true;
    }

    function defaultConfig() {
        /**
         * guides配置项
         * @var guides
         * @type Object
         * @extends xCharts
         * @description 辅助线配置项,注意只有在坐标系存在的情况下才存在
         */
        return {
            /**
             * @var show
             * @type Boolean
             * @extends xCharts.guides
             * @default true
             * @description 控制辅助线是否显示
             */
            show: true,
            /**
             * @var lineStyle
             * @type Object
             * @extends xCharts.guides
             * @description 两条直线样式控制
             */
            lineStyle: {
                /**
                 * @var color
                 * @type String
                 * @extends xCharts.guides.lineStyle
                 * @default '#a2a2a2'
                 * @description 辅助线颜色
                 */
                color: '#a2a2a2',
                /**
                 * @var width
                 * @type Number
                 * @extends xCharts.guides.lineStyle
                 * @default '#a2a2a2'
                 * @description 辅助线宽度
                 */
                width: 1,
                /**
                 * @var dasharray
                 * @type Number
                 * @extends xCharts.guides.lineStyle
                 * @default 5
                 * @description 数字越大,虚线越长
                 */
                dasharray: 5
            },
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.guides
             * @description 文字样式控制
             */
            textStyle: {
                /**
                 * @var color
                 * @type String
                 * @extends xCharts.guides.textStyle
                 * @default '#a2a2a2'
                 * @description 文字颜色
                 */
                color: '#a2a2a2',
                /**
                 * @var fontSize
                 * @type Number
                 * @extends xCharts.guides.textStyle
                 * @default 14
                 * @description 文字大小
                 */
                fontSize: 14,
                /**
                 * @var xFormat
                 * @type Function
                 * @extends xCharts.guides.textStyle
                 * @default Loop
                 * @description x轴文字格式化
                 */
                xFormat: utils.loop,
                /**
                 * @var yFormat
                 * @type Function
                 * @extends xCharts.guides.textStyle
                 * @default Loop
                 * @description y轴文字格式化
                 */
                yFormat:  utils.loop,
            }
        }
    }

}(xCharts, d3));