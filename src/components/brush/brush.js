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
            var brushHeight = 30;

            this.margin.bottom += brushHeight + 10;

        },
        render: function () {
            var xScale = this.messageCenter.xAxisScale[0];
            xScale = xScale.copy();
            var brush = d3.svg.brush()
                .x(xScale);
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
            var _this = this;
            var brush = this.brush;
            this.brush.on('brush',function(){
                var domain = brush.extent();
                _this.fire('brushChange',domain);
            });
        }
    });

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
                yFormat: utils.loop,
            }
        }
    }

}(xCharts, d3));