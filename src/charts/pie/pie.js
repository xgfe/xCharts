/**
 * @file 饼图
 * @author chenwubai.cx@gmail.com
 */
// TODO 把代码里的魔数尽量提出来作为配置项
(function(xCharts, d3) {
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
        // config是option的深拷贝的对象
        // series是config里的series的引用,修改series后config内部也会相应修改
        init: function(messageCenter, config, type, series) {
            // 提取饼图配置项(目前不支持多图,直接忽略其他图表配置项)
            for(var i=0, length=series.length;i<length;i++) {
                if(series[i].type === 'pie') {
                    this.pieConfig = utils.copy(series[i], true);
                    break;
                }
            }
            // 合并默认值, 转换百分比为数值等
            __correctConfig.apply(this);
            // 转化原始数据为画弧形需要的数据
            this.pieData = __getPieData(this.pieConfig.data);
            // 生成弧形路径计算函数
            this.arcFunc = __getArcFunc(this.pieConfig.radius);
            this.bigArcFunc = __getBigArcFunc(this.pieConfig.radius);
            this.textArcFunc = __getTextArcFunc(this.pieConfig.radius);
        },
        render: function(animationEase, animationTime) {
            // 添加饼图g容器
            this.pieWrapper = __renderPieWrapper.apply(this);
            // 添加弧形
            this.arcList = __renderArcs.apply(this, [animationEase, animationTime]);
            if(this.mobileMode) {
                this.mobileRender(animationEase, animationTime);
            } else if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                // 添加文字标签
                this.textList = __renderText.apply(this, [animationEase, animationTime]);
                // 添加连接弧形和文字标签的线条
                this.textLineList = __renderTextLine.apply(this, [animationEase, animationTime]);
            }
        },
        ready: function() {
            if(this.mobileMode) {
                this.mobileReady();
            } else {
                if(this.config.legend && this.config.legend.show) {
                    __legendReady.apply(this);
                }
                if(this.config.tooltip && this.config.tooltip.show) {
                    __tooltipReady.apply(this);
                }
            }
        },
        _reRenderArcs: function(nameList) {
            var animationConfig = this.config.animation;
            if(!nameList.length) {
                this.pieData.forEach(function(d) {
                    d.startAngle = 0;
                    d.endAngle = 0;
                    d.data.isShow = false;
                });
            } else {
                // 先把所有弧形的可见配置设为不可见
                this.pieConfig.data.forEach(function(d) {
                    d.isShow = false;
                    d.value = 0;
                });
                for(var i=0;i<nameList.length;i++) {
                    var name = nameList[i];
                    for(var k=0;k<this.pieConfig.data.length;k++) {
                        if(this.pieConfig.data[k].name == name) {
                            this.pieConfig.data[k].isShow = true;
                            this.pieConfig.data[k].value = this.pieConfig.data[k].initialValue;
                            break;
                        }
                    }
                }
                this.pieData = __getPieData(this.pieConfig.data);
            }
            __renderArcs.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
            if(this.pieConfig.labels && this.pieConfig.labels.enable) {
                if(this.mobileMode) {
                    this.__renderMobileText(animationConfig.animationEase, animationConfig.animationTime);
                    return;
                }
                __renderText.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
                __renderTextLine.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
            }
        },
        _defaultTooltipFormatter: function (name, value) {
            return "<div>" + name + '：' + value + "</div>";
        }
    });
    
    /**
     * @description 合并默认值,转换百分比,并添加一些属性
     */
    function __correctConfig() {
        // 合并默认值
        this.pieConfig = utils.merage(defaultConfig(), this.pieConfig);
        // 计算饼图原点
        var center = this.pieConfig.center;
        if(typeof center[0] === 'string') {
            center[0] = parseInt(center[0]) * 0.01 * this.width;
        }
        if(typeof center[1] === 'string') {
            center[1] = parseInt(center[1]) * 0.01 * this.height;
        }
        // 计算饼图半径
        var radius;
        if(this.mobileMode && this.pieConfig.mRadius.outerRadius) {
            radius = this.pieConfig.mRadius;
        } else {
            radius = this.pieConfig.radius;
        }
        if(typeof radius.innerRadius === 'string') {
            radius.innerRadius = parseInt(radius.innerRadius) * 0.01 * this.width;
        }
        if(typeof radius.outerRadius === 'string') {
            radius.outerRadius = parseInt(radius.outerRadius) * 0.01 * this.width;
        }
        this.pieConfig.radius = radius;
        // 添加对饼图大小的处理,如果半径太大,自动把半径保持在可控的最大值
        // 这里只考虑了原点在[50%, 50%]的位置,如果原点在其他位置该处理不能起到作用
        var minLength = this.width<this.height ? this.width : this.height;
        if(radius.outerRadius*2 > minLength) {
            radius.outerRadius = minLength/2;
        }
        // 添加一些属性供后面render和ready使用
        this.pieConfig.data.forEach(function(d) {
            d.isShow = true;
            d.initialValue = d.value;
        });
    }
    function __getPieData(data) {
        var pieFunc = d3.pie()
            .sort(null)
            .value(function(d, i) {
                return d.value;
            }),
            pieData = pieFunc(data);
        return pieData;
    }
    function __getArcFunc(radius) {
        var arcFunc = d3.arc()
            .innerRadius(radius.innerRadius)
            .outerRadius(radius.outerRadius);
        return arcFunc;
    }
    function __getBigArcFunc(radius) {
        var distance = 10;
        var bigArcFunc = d3.arc()
            .innerRadius(radius.innerRadius)
            .outerRadius(radius.outerRadius + distance);
        return bigArcFunc;
    }
    function __getTextArcFunc(radius) {
        var mulriple = 1.1;
        var textArcFunc = d3.arc()
            .innerRadius(radius.outerRadius * mulriple)
            .outerRadius(radius.outerRadius * mulriple);
        return textArcFunc;
    }
    function __renderPieWrapper() {
        var pieWrapper = this.main
            .selectAll('.xc-pie')
            .data([1]);
        pieWrapper = pieWrapper.enter()
            .append('g')
            .classed('xc-pie', true)
            .merge(pieWrapper);
        pieWrapper.attr('transform', 'translate(' + this.pieConfig.center[0] + ',' + this.pieConfig.center[1] + ')');
        return pieWrapper;
    }
    function __renderArcs(animationEase, animationTime) {
        var _self = this;
        // 这里selectAll和enter不要连续写
        // arcs = var.selectAll.enter.append
        // arcs = var.selectAll; arcs.enter.append
        // 上面两种方式得到的arcs是不一样的
        var arcs = this.pieWrapper
            .selectAll('.xc-pie-arcs')
            .data([1]);
        arcs = arcs.enter()
            .append('g')
            .classed('xc-pie-arcs', true)
            .merge(arcs);
        var arcList = arcs.selectAll('.xc-pie-arc')
            .data(this.pieData);
        // 如果不是初次加载,则enter这一步什么都不会做
        arcList = arcList.enter()
            .append('path')
            .classed('xc-pie-arc', true)
            .style('fill', function(d) {
                if(!d.data.color) {
                    d.data.color = _self.getColor(d.data.idx);
                }
                return d.data.color;
            })
            .merge(arcList);
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
    }
    function __renderText(animationEase, animationTime) {
        var _this = this;
        var texts = this.pieWrapper
            .selectAll('.xc-pie-texts')
            .data([1]);
        texts = texts.enter()
            .append('g')
            .classed('xc-pie-texts', true)
            .merge(texts);
        var textList = texts.selectAll('.xc-pie-text')
            .data(this.pieData);
        textList = textList.enter()
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
            })
            .merge(textList);
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
    }
    function __renderTextLine(animationEase, animationTime) {
        var _this = this;
        var arcFunc = d3.arc()
            .innerRadius(this.pieConfig.radius.outerRadius * 1.05)
            .outerRadius(this.pieConfig.radius.outerRadius * 1.05);
        var textLines = this.pieWrapper
            .selectAll('.xc-pie-textLines')
            .data([1]);
        textLines = textLines.enter()
            .append('g')
            .classed('xc-pie-textLines', true)
            .merge(textLines);
        var textLineList = textLines.selectAll('.xc-pie-textLine')
            .data(this.pieData);
        textLineList = textLineList.enter()
            .append('polyline')
            .classed('xc-pie-textLine', true)
            .attr('points', function(d) {
                return [arcFunc.centroid(d), arcFunc.centroid(d), arcFunc.centroid(d)];
            })
            .merge(textLineList);
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
    }
    function __legendReady() {
        // 绑定hover事件
        __legendMouseEnter.apply(this);
        __legendMouseLeave.apply(this);

        // 绑定click事件
        __legendClick.apply(this);
    }
    function __legendMouseEnter () {
        var _this = this;
        this.on('legendMouseenter.pie', function(name) {
            for(var i=0;i<_this.arcList._groups[0].length;i++) {
                var arcEle = d3.select(_this.arcList._groups[0][i]);
                if(arcEle.datum().data.name == name) {
                    arcEle.attr('d', function(d) {
                        return _this.bigArcFunc(d);
                    });
                    break;
                }
            }
        });
    }
    function __legendMouseLeave () {
        var _this = this;
        this.on('legendMouseleave.pie', function(name) {
            for(var i=0;i<_this.arcList._groups[0].length;i++) {
                var arcEle = d3.select(_this.arcList._groups[0][i]);
                if(arcEle.datum().data.name == name) {
                    arcEle.attr('d', function(d) {
                        return _this.arcFunc(d);
                    });
                    break;
                }
            }
        });
    }
    function __legendClick () {
        var _this = this;
        this.on('legendClick.pie', function(nameList) {
            _this._reRenderArcs(nameList);
        });
    }
    function __tooltipReady() {
        __tooltipMouseMove.apply(this);
        __tooltipMouseOut.apply(this);
    }
    function __tooltipMouseMove() {
        var _this = this;
        var tooltip = this.messageCenter.components.tooltip;
        this.arcList.on('mousemove.pie', function() {
            var bindData = d3.select(this).datum();
            var position = d3.mouse(_this.svg.node());
            position = [
                position[0] + 10,
                position[1] + 10
            ];
            var tooltipFormatter = tooltip.tooltipConfig.formatter,
                pieFormatter = _this.pieConfig.formatter;
            var formatter = pieFormatter || tooltipFormatter || _this._defaultTooltipFormatter;
            tooltip.setTooltipHtml(formatter(bindData.data.name, bindData.data.value));
            tooltip.showTooltip();
            tooltip.setPosition(position);

            d3.select(this).attr('d', function(d) {
                return _this.bigArcFunc(d);
            });
        });
    }
    function __tooltipMouseOut() {
        var _this = this;
        var tooltip = this.messageCenter.components.tooltip;
        this.arcList.on('mouseout.pie', function() {
            tooltip.hiddenTooltip();
            d3.select(this).attr('d', function(d) {
                return _this.arcFunc(d);
            });
        });
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
            mRadius: {
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
                formatter: defaultLabelFormatter,
                mobileFormatter: function (name, value, percentage) {
                    return name;
                }
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
                    // name: '',
                    /**
                     * @var value
                     * @type Number
                     * @description 弧形所代表的项的数据值
                     * @extends xCharts.series.pie.data
                     */
                    // value: 0
                }
            ]
        }
        return config;
    }
}(xCharts, d3));