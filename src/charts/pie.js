/**
 * @file 饼图
 * @author chenwubai.cx@gmail.com
 */
// TODO 把代码里的魔数尽量提出来作为配置项
(function(window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建pie构造函数
    function pie(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'pie');
    }

    // 在xCharts中注册pie构造函数
    xCharts.charts.extend({ pie: pie });
    // 从父类Chart里继承一系列的方法
    utils.inherits(pie, Chart);

    pie.prototype.extend = xCharts.extend;
    pie.prototype.extend({
        init: function(messageCenter, config, type, series) {
            // 提出type为pie的series的子元素对象
            if(!this.pieConfig) {
                this.pieConfig = {};
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'pie') {
                        this.pieConfig = utils.copy(series[i], true);
                        break;
                    }
                }
            } else {
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'pie') {
                        // 这一步是为了重绘时重新计算圆心和半径
                        this.pieConfig.center = utils.copy(series[i].center, true);
                        this.pieConfig.radius = utils.copy(series[i].radius, true);
                        break;
                    }
                }
            }

            // 计算饼图原点、半径等属性值
            this.__correctConfig();
            // 转化原始数据为画弧形需要的数据
            this.pieData = this.__getPieData();
            // 生成弧形路径计算函数
            this.arcFunc = this.__getArcFunc();
            this.bigArcFunc = this.__getBigArcFunc();
            this.textArcFunc = this.__getTextArcFunc();
        },
        render: function(animationEase, animationTime) {
            // 添加饼图g容器
            this.pieWrapper = this.__renderPieWrapper();
            // 添加弧形
            this.arcList = this.__renderArcs(animationEase, animationTime);
            if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                // 添加文字标签
                this.textList = this.__renderText(animationEase, animationTime);
                // 添加连接弧形和文字标签的线条
                this.textLineList = this.__renderTextLine(animationEase, animationTime);
            }
        },
        ready: function() {
            this.__legendReady();
            this.__tooltipReady();
        },
        /*refresh: function() {

        },*/
        __correctConfig: function() {
            // 把一些百分比的设置计算出实际值并添加一些属性方便后面计算

            // 计算饼图原点
            var center = this.pieConfig.center;
            if(typeof center[0] == 'string') {
                center[0] = parseInt(center[0]) * 0.01 * this.width;
            }
            if(typeof center[1] == 'string') {
                center[1] = parseInt(center[1]) * 0.01 * this.height;
            }
            // 计算饼图半径
            var radius = this.pieConfig.radius;
            if(!radius.innerRadius) {
                radius.innerRadius = 0;
            } else if(typeof radius.innerRadius == 'string') {
                radius.innerRadius = parseInt(radius.innerRadius) * 0.01 * this.width;
            }
            if(typeof radius.outerRadius == 'string') {
                radius.outerRadius = parseInt(radius.outerRadius) * 0.01 * this.width;
            }

            // 添加对饼图大小的处理,如果半径太大,自动把半径保持在可控的最大值
            var minLength = this.width<this.height ? this.width : this.height;
            if(radius.outerRadius*2 > minLength) {
                radius.outerRadius = minLength/2;
            }

            this.pieConfig.data.forEach(function(d) {
                d.isShow = true;
                d.initialValue = d.value;
            });
        },
        __getPieData: function() {
            var pieFunc = d3.layout.pie()
                    .sort(null)
                    //.padAngle(0.005)
                    .value(function(d, i) {
                        return d.value;
                    }),
                pieData = pieFunc(this.pieConfig.data);
            return pieData;
        },
        __getArcFunc: function() {
            var arcFunc = d3.svg.arc()
                .innerRadius(this.pieConfig.radius.innerRadius)
                .outerRadius(this.pieConfig.radius.outerRadius);
            return arcFunc;
        },
        __getBigArcFunc: function() {
            var bigArcFunc = d3.svg.arc()
                .innerRadius(this.pieConfig.radius.innerRadius)
                .outerRadius(this.pieConfig.radius.outerRadius + 10);
            return bigArcFunc;
        },
        __getTextArcFunc: function() {
            var textArcFunc = d3.svg.arc()
                .innerRadius(this.pieConfig.radius.outerRadius * 1.1)
                .outerRadius(this.pieConfig.radius.outerRadius * 1.1);
            return textArcFunc;
        },
        __renderPieWrapper: function() {
            var pieWrapper = this.main
                .selectAll('.xc-pie')
                .data([1]);
            pieWrapper.enter()
                .append('g')
                .classed('xc-pie', true);
            pieWrapper.attr('transform', 'translate(' + this.pieConfig.center[0] + ',' + this.pieConfig.center[1] + ')');
            return pieWrapper;
        },
        __renderArcs: function(animationEase, animationTime) {
            var _self = this;
            // 这里selectAll和enter不要连续写
            // arcs = var.selectAll.enter.append
            // arcs = var.selectAll; arcs.enter.append
            // 上面两种方式得到的arcs是不一样的
            var arcs = this.pieWrapper
                .selectAll('.xc-pie-arcs')
                .data([1]);
            arcs.enter()
                .append('g')
                .classed('xc-pie-arcs', true);
            var arcList = arcs.selectAll('.xc-pie-arc')
                .data(this.pieData);
            // 如果不是初次加载,则enter这一步什么都不会做
            arcList.enter()
                .append('path')
                .classed('xc-pie-arc', true)
                .style('fill', function(d) {
                    if(!d.data.color) {
                        d.data.color = _self.getColor(d.data.idx);
                    }
                    return d.data.color;
                });
            arcList.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween('d', function(d) {
                    this._current = this._current || {startAngle: 0, endAngle: 0};
                    var interpolate = d3.interpolate(this._current, d);
                    this._current = interpolate(1);
                    return function (t) {
                        return _self.arcFunc(interpolate(t));
                    }
                });
            return arcList;
        },
        __renderText: function(animationEase, animationTime) {
            var _this = this;
            var texts = this.pieWrapper
                .selectAll('.xc-pie-texts')
                .data([1]);
            texts.enter()
                .append('g')
                .classed('xc-pie-texts', true);
            var textList = texts.selectAll('.xc-pie-text')
                .data(this.pieData);
            textList.enter()
                .append('text')
                .classed('xc-pie-text', true)
                // TODO 后面考虑是否把这个提成配置项
                .attr('dy', '0.35em')
                .attr('fill', function(d) {
                    return d.data.color;
                })
                .text(function(d) {
                    var formatter = _this.pieConfig.labels.formatter || defaultLabelFormatter;
                    return formatter(d.data.name, d.data.value);
                });
            textList.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attr('transform', function(d) {
                    // 找出外弧形的中心点
                    var pos = _this.textArcFunc.centroid(d);
                    // 适当改变文字标签的x坐标
                    pos[0] = _this.pieConfig.radius.outerRadius * (midAngel(d)<Math.PI ? 1.2 : -1.2);
                    return 'translate(' + pos + ')';
                })
                .style('display', function(d) {
                    return d.data.isShow ? null : 'none';
                })
                .style('text-anchor', function(d) {
                    return midAngel(d)<Math.PI ? 'start' : 'end';
                });
        },
        __renderTextLine: function(animationEase, animationTime) {
            var _this = this;
            var arcFunc = d3.svg.arc()
                .innerRadius(this.pieConfig.radius.outerRadius * 1.05)
                .outerRadius(this.pieConfig.radius.outerRadius * 1.05);
            var textLines = this.pieWrapper
                .selectAll('.xc-pie-textLines')
                .data([1]);
            textLines.enter()
                .append('g')
                .classed('xc-pie-textLines', true);
            var textLineList = textLines.selectAll('.xc-pie-textLine')
                .data(this.pieData);
            textLineList.enter()
                .append('polyline')
                .classed('xc-pie-textLine', true)
                .attr('points', function(d) {
                    return [arcFunc.centroid(d), arcFunc.centroid(d), arcFunc.centroid(d)];
                });
            textLineList.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attr('points', function(d) {
                    // 找出外弧形的中心点
                    var pos = _this.textArcFunc.centroid(d);
                    // 适当改变文字标签的x坐标
                    pos[0] = _this.pieConfig.radius.outerRadius * (midAngel(d)<Math.PI ? 1.2 : -1.2);
                    return [arcFunc.centroid(d), _this.textArcFunc.centroid(d), pos];
                })
                .style('display', function(d) {
                    return d.data.isShow ? null : 'none';
                });
        },
        __legendReady: function() {
            var _self = this;
            this.on('legendMouseenter.pie', function(name) {
                for(var i=0;i<_self.arcList[0].length;i++) {
                    var arcEle = d3.select(_self.arcList[0][i]);
                    if(arcEle.datum().data.name == name) {
                        arcEle.attr('d', function(d) {
                            return _self.bigArcFunc(d);
                        });
                        break;
                    }
                }
            });
            this.on('legendMouseleave.pie', function(name) {
                for(var i=0;i<_self.arcList[0].length;i++) {
                    var arcEle = d3.select(_self.arcList[0][i]);
                    if(arcEle.datum().data.name == name) {
                        arcEle.attr('d', function(d) {
                            return _self.arcFunc(d);
                        });
                        break;
                    }
                }
            });
            this.on('legendClick.pie', function(nameList) {
                var animationConfig = _self.config.animation;
                if(!nameList.length) {
                    _self.pieData.forEach(function(d) {
                        d.startAngle = 0;
                        d.endAngle = 0;
                        d.data.isShow = false;
                    });
                } else {
                    // 先把所有弧形的可见配置设为不可见
                    _self.pieConfig.data.forEach(function(d) {
                        d.isShow = false;
                        d.value = 0;
                    });
                    for(var i=0;i<nameList.length;i++) {
                        var name = nameList[i];
                        for(var k=0;k<_self.pieConfig.data.length;k++) {
                            if(_self.pieConfig.data[k].name == name) {
                                _self.pieConfig.data[k].isShow = true;
                                _self.pieConfig.data[k].value = _self.pieConfig.data[k].initialValue;
                                break;
                            }
                        }
                    }
                    _self.pieData = _self.__getPieData();
                }
                _self.__renderArcs(animationConfig.animationEase, animationConfig.animationTime);
                if(_self.pieConfig.labels && _self.pieConfig.labels.enable) {
                    _self.__renderText(animationConfig.animationEase, animationConfig.animationTime);
                    _self.__renderTextLine(animationConfig.animationEase, animationConfig.animationTime);
                }
            });
        },
        __tooltipReady: function() {
            var _self = this;
            // 如果没有对tooltip进行配置或设置tooltip不显示,则不绑定事件监听
            if(!this.config.tooltip || !this.config.tooltip.show) {
                return;
            }
            var tooltip = _self.messageCenter.components.tooltip;
            this.arcList.on('mousemove.pie', function() {
                var bindData = d3.select(this).datum();
                var event = d3.event;
                var x = event.layerX || event.offsetX,
                    y = event.layerY || event.offsetY;
                var tooltipFormatter = tooltip.tooltipConfig.formatter,
                    pieFormatter = _self.pieConfig.formatter;
                var formatter = pieFormatter || tooltipFormatter || defaultTooltipFormatter;
                tooltip.setTooltipHtml(formatter(bindData.data.name, bindData.data.value));
                tooltip.setPosition([x,y], 10, 10);
                tooltip.showTooltip();

                d3.select(this).attr('d', function(d) {
                    return _self.bigArcFunc(d);
                });
            });
            this.arcList.on('mouseout.pie', function() {
                tooltip.hiddenTooltip();
                d3.select(this).attr('d', function(d) {
                    return _self.arcFunc(d);
                });
            });
        }
    });
    function defaultTooltipFormatter(name, value) {
        return "<div>" + name + '：' + value + "</div>";
    }
    function defaultLabelFormatter(name) {
        return name;
    }
    function midAngel(d) {
        return d.startAngle + (d.endAngle - d.startAngle)/2;
    }
    function defaultConfig() {
        /**
         * @var pie
         * @type Object
         * @extends xCharts.series
         * @description 饼图配置项
         */
        var config = {
            /**
             * 定义图表类型是饼图
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'pie'
             * @extends xCharts.series.pie
             */
            type: 'pie',
            /**
             * @var center
             * @type Array
             * @description 饼图圆心位置，可为百分比或数值。若为百分比则center[0]（圆心x坐标）参照容器宽度，center[1]（圆心y坐标）参照容器高度。
             * @default ['50%','50%']
             * @extends xCharts.series.pie
             */
            center: ['50%', '50%'],
            /**
             * @var radius
             * @type Object
             * @description 定义饼图的内半径和外半径
             * @extends xCharts.series.pie
             */
            radius: {
                /**
                 * @var outerRadius
                 * @type String|Number
                 * @description 定义饼图的外半径，可取百分比或数值，若为百分比则参照容器宽度进行计算。
                 * @default '30%'
                 * @extends xCharts.series.pie.radius
                 */
                outerRadius: '30%',
                /**
                 * @var innerRadius
                 * @type String|Number
                 * @description 定义饼图的内半径，可取百分比或数值，若为百分比，则参照容器宽度进行计算。
                 * @default 0
                 * @extends xCharts.series.pie.radius
                 */
                innerRadius: 0
            },
            /**
             * @var labels
             * @type Object
             * @description 定义饼图弧形的文字标签
             * @extends xCharts.series.pie
             */
            labels: {
                /**
                 * @var enable
                 * @type Boolean
                 * @description 定义是否绘制弧形的文字标签
                 * @default false
                 * @extends xCharts.series.pie.labels
                 */
                enable: false,
                /**
                 * @var formatter
                 * @type Function
                 * @description 定义弧形的文字标签的显示格式
                 * @default 返回弧形的名称
                 * @extends xCharts.series.pie.labels
                 */
                formatter: defaultLabelFormatter
            },
            /**
             * @var data
             * @type Array
             * @description 饼图数据
             * @extends xCharts.series.pie
             */
            data: [
                {
                    /**
                     * @var name
                     * @type String
                     * @description 弧形名称
                     * @extends xCharts.series.pie.data
                     */
                    name: '',
                    /**
                     * @var value
                     * @type Number
                     * @description 弧形所代表的项的数据值
                     * @extends xCharts.series.pie.data
                     */
                    value: 0
                }
            ]
        }
        return config;
    }
}(window));