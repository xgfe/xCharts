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
        init: function (messageCenter, config) {
            // 先占位,等坐标轴完成后再绘制时间刷

            this.messageCenter.brush = true;

            this.brushConfig = utils.merage(defaultConfig(), config.brush);

            this.margin.bottom += this.brushConfig.brushHeight + 20;

            var messageCenter = this.messageCenter;
            this.width = messageCenter.originalWidth - messageCenter.margin.left - messageCenter.margin.right; //计算剩余容器宽
        },
        render: function () {

            var brush = d3.brushX();

            brush.extent(initExtent(this));

            // brush.handleSize(50)

            var translateX = 0;
            var translateY = this.messageCenter.originalHeight - this.margin.bottom;
            var width = this.messageCenter.originalWidth - this.margin.left - this.margin.right;
            var height = this.messageCenter.originalHeight - this.margin.top - this.margin.bottom;

            var group = this.main.selectAll('g.xc-brush').data([this]);
            group = group.enter().append('g')
                .attr('class', 'xc-brush')
                .merge(group);

            group.attr('transform', 'translate(' + translateX + ',' + translateY + ')')
                .call(brush);


            brush.move(group, initMove(this));
            // group.selectAll('rect.background')
            //     .style('visibility', 'visible')
            //     .attr('fill', '#e0e0e0')
            //     .attr('opacity', 0.5)
            //
            // group.selectAll('rect')
            //     .attr('height', 25)
            //     .attr('fill', '#e0e0e0');
            //
            // group.selectAll('.resize rect')
            //     .style('visibility', 'visible')
            //     .attr('fill', '#a2a2a2')
            //     .attr('width', 10);

            group.selectAll('rect.overlay')
                .attr('fill', '#e0e0e0')
                .attr('opacity', 0.5);

            group.selectAll('rect.handle')
                .attr('fill', '#777');

            this.brush = brush;

            //添加clipath路径
            var defGroup = this.svg.selectAll('defs').data([this]);
            defGroup = defGroup.enter().append('defs').merge(defGroup);

            var clip = defGroup.selectAll('clipPath#xc-clip-main-path').data([this]);
            clip = clip.enter().append("clipPath").attr('id', 'xc-clip-main-path').merge(clip);

            var rect = clip.selectAll('rect').data([this]);
            rect = rect.enter().append('rect').merge(rect);
            rect.attr('width', width)
                .attr('height', height);

        },
        ready: function () {
            var brush = this.brush;
            var brushChangeBind = brushChange(this);
            this.brush.on('brush', brushChangeBind);

            // TODO 这里有问题,需要监听两个axis事件,什么时候梳理一下
            this.on('xAxisRender.brush', function () {
                // 手动通知别人刷新一次
                this.fire('brushChange', this.initBrushSelection);
            }.bind(this));

            this.on('xAxisReady.brush', function () {
                // 手动通知别人刷新一次
                this.fire('brushChange', this.initBrushSelection);
            }.bind(this));
        },
        refresh:function(animationEase, animationTime){

            // 关闭显示的组件不进行刷新
            if (!this._show) return true;

            //当容器改变时，刷新当前组件
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
            this.ready();
        }
    });

    function initMove(ctx) {
        var min = parseFloat(ctx.brushConfig.domain[0]);
        var max = parseFloat(ctx.brushConfig.domain[1]);

        if (isNaN(min) || isNaN(max)) {
            console.warn('brush.domain is not percentage value', ctx.brushConfig.domain);
            return [0, 0];
        }

        var width = ctx.width;

        var initMove = [
            width * min / 100,
            width * max / 100
        ];

        ctx.initBrushSelection = [
            utils.toFixed(initMove[0] / width, 3),
            utils.toFixed(initMove[1] / width, 3)
        ];

        return initMove;
    }

    function brushChange(ctx) {
        var width = ctx.width;
        return function () {
            var domain = d3.event.selection;
            var min = utils.toFixed(domain[0] / width, 3);
            var max = utils.toFixed(domain[1] / width, 3);

            ctx.fire('brushChange', [min, max]);
        };

        // console.log(domain)

        // this.fire('brushChange',domain);
    }


    // 设置时间刷初始值
    function initExtent(ctx) {
        return [[0, 0], [ctx.width, ctx.brushConfig.brushHeight]]
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
            domain: ['90%', '100%'],
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