/**
 *  scatter 散点图
 *  继承自 Chart
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;
    xCharts.charts.extend({scatter: scatter});
    utils.inherits(scatter, Chart);

    function scatter(messageCenter, config) {
        Chart.call(this, messageCenter, config, 'scatter');
    }

    scatter.prototype.extend = xCharts.extend;
    scatter.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _this = this;
            _this.xAxisScale = messageCenter.xAxisScale;
            _this.yAxisScale = messageCenter.yAxisScale;
            _this.series = parseSeries(series, _this.xAxisScale, _this.yAxisScale);
            _this.data = getData(_this.series);

        },
        render: function (animationEase, animationTime) {

            var _this = this;

            // 手机模式下动画卡
            if (_this.mobileMode) {
                animationTime = 0;
            }

            var scatterGroup = _this.main.selectAll('.xc-scatter-group')
                .data([1]);

            scatterGroup = scatterGroup.enter().append('g')
                .attr('class', 'xc-scatter-group')
                .merge(scatterGroup);

            var scatterItem = scatterGroup.selectAll('.xc-scatter-item')
                .data(_this.data);

            var transitionStr = "r " + animationTime + "ms linear,cx " + animationTime + "ms linear,cy " + animationTime + "ms linear";

            scatterItem = scatterItem.enter().append('circle').merge(scatterItem);
            scatterItem.exit().remove();

            scatterItem.style("transition", transitionStr)
                .attr('cx', function (d) {
                    return d._serie.xScale(d.data[0]);
                })
                .attr('cy', function (d) {
                    return d._serie.yScale(d.data[1]);
                })
                .attr('r', function (d) {
                    //这里如果是不显示的话，直接返回一个半径0
                    if (d._serie.show != false)
                        return d.radius;
                    else
                        return 0;
                })
                .attr('fill', function (d) {
                    return _this.getColor(d._serie.idx);
                })
                .attr('opacity', function (d) {
                    return d._serie.opacity;
                })
                .attr('class', function (d) {
                    var classStr = 'xc-scatter-item';
                    classStr += ' xc-scatter-group-' + d._serie.idx;
                    return classStr;
                });

            // scatterItem.transition()
            //     .duration(animationConfig.animationTime)
            //     .ease(animationConfig.animationEase)
            //     .attrTween('cx', function (d) {
            //         var cx = d._serie.xScale(d.data[0]);
            //         this.cxPosition = this.cxPosition === undefined ? cx : this.cxPosition;
            //         var interpolate = d3.interpolate(this.cxPosition, cx);
            //         this.cxPosition = cx;
            //         return function (t) {
            //             return interpolate(t);
            //         }
            //     })
            //     .attrTween('cy', function (d) {
            //         // return d._serie.yScale(d.data[1]);
            //         var cy = d._serie.yScale(d.data[1]);
            //         this.cyPosition = this.cyPosition === undefined ? cy : this.cyPosition;
            //         var interpolate = d3.interpolate(this.cyPosition, cy);
            //         this.cyPosition = cy;
            //         return function (t) {
            //             return interpolate(t);
            //         }
            //     })

            _this.scatterItem = scatterItem;//暴露出去，为了tooltip事件
        },
        ready: function () {
            this.__legendReady();
            this.__tooltipReady();
        },
        __legendReady: function () {
            var _this = this, selectGroup = null;
            var animationConfig = _this.config.animation;

            _this.on('legendMouseenter.scatter', function (name) {
                var serie = getSeriesByName(_this.series, name);
                selectGroup = _this.main.selectAll('.xc-scatter-group-' + serie.idx);
                selectGroup.attr('opacity', 1);
            });
            _this.on('legendMouseleave.scatter', function (name) {
                selectGroup.attr('opacity', function (d) {
                    return d._serie.opacity;
                });
            });
            this.on('legendClick.scatter', function (nameList) {
                var series = _this.config.series;
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render(animationConfig.animationEase, animationConfig.animationTime);
            });
        },
        __tooltipReady: function () {
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger == 'axis') return;//未开启tooltip
            var _this = this;
            var tooltip = _this.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;


            // TODO 这里修改为轴触发方式和点击共存
            // 移动端就不需要点击了
            if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                // _this.div.on('mousemove.scatter', assitLineTrigger(_this));

                _this.scatterItem.on('mouseenter.scatter', function (data) {

                    d3.select(this).attr('opacity', 1);
                    //设置tooltip
                    var event = d3.event;
                    var x = event.layerX || event.offsetX, y = event.layerY || event.offsetY;
                    var formatter = data._serie.formatter || tooltipFormatter || defaultFormatter;
                    tooltip.showTooltip();
                    tooltip.setTooltipHtml(formatter(data._serie.name, data.data[0], data.data[1]));
                    tooltip.setPosition([x, y]);
                })

                _this.scatterItem.on('mouseleave.scatter', function (data) {
                    d3.select(this).attr('opacity', function (d) {
                        return d._serie.opacity;
                    });
                    tooltip.hiddenTooltip();
                });
            }


        }
    });

    

    // function

    /**
     * 通过name找到对应的serie
     * @param series
     * @param name
     * @returns {*}
     */
    function getSeriesByName(series, name) {
        for (var i = 0, s; s = series[i++];)
            if (s.name == name) return s;
    }

    /**
     * 处理sereies
     * @param series 未处理的全部series
     * @param xScale xAxisScale
     * @param yScale yAxisScale
     * @returns {Array}
     */
    function parseSeries(series, xScale, yScale) {
        var scatterSeries = [];
        for (var i = 0, s; s = series[i++];) {
            //第一步，判断是否是type=scatter，不是，则直接跳过
            if (s.type != 'scatter') continue;

            //加入默认config
            s = utils.merage(defaultConfig(), s);
            var size = s.size;
            s.idx = s.idx == null ? i - 1 : s.idx;//分配一个idx，用来获取颜色
            s.xScale = xScale[s.xAxisIndex];
            s.yScale = yScale[s.yAxisIndex];
            //处理散点图的每个data,格式化成一个object对象，保存一些绘画数据
            s.data = s.data.map(function (d, idx) {
                var radius = typeof size == 'function' ? size(d) : size;
                var obj = {};
                obj.data = d;
                obj.radius = radius;
                obj._serie = s;
                return obj;
            })

            scatterSeries.push(s);
        }
        return scatterSeries;
    }

    /**
     * 将已经处理过的sereis里面data拿出来，合并按半径从大到小的顺序排序
     * @param series
     * @returns {Array} [object,object]
     */
    function getData(series) {
        var data = [];
        series.forEach(function (serie) {
            data = data.concat(serie.data);
        })
        data = data.sort(function (a, b) {
            //将每个点按半径从大到小的顺序排序，尽可能的避免小点被大点盖住，鼠标无法点击的情况
            return b.radius - a.radius;
        })
        return data;
    }

    /**
     * 默认散点图tooltip格式化函数
     * @param name series.name
     * @param x
     * @param y
     * @returns {string}
     */
    function defaultFormatter(name, x, y) {
        var html = "<p>" + name + "</p>";
        html += "<p>" + x + "," + y + "</p>";
        return html;
    }

    function defaultConfig() {
        /**
         * @var scatter
         * @type Object
         * @extends xCharts.series
         * @description 散点图(气泡图)配置项
         */
        var scatter = {
            /**
             * @var name
             * @type String
             * @extends xCharts.series.scatter
             * @description 散点图(气泡图)代表的名字
             */
            name: '业绩',
            /**
             * @var type
             * @type String
             * @extends xCharts.series.scatter
             * @description 散点图(气泡图)指定类型
             */
            type: 'scatter',
            /**
             * @var data
             * @type Array
             * @extends xCharts.series.scatter
             * @description 一个装有散点图(气泡图)数据的二维数组,第一个为x轴数据，第二个为y轴数据
             * @example
             *   [
             *      [161.2, 51.6], [167.5, 59.0], [159.5, 49.2], [157.0, 63.0], [155.8, 53.6],
             *      [170.0, 59.0], [159.1, 47.6], [166.0, 69.8], [176.2, 66.8], [160.2, 75.2],
             *      [172.5, 55.2], [170.9, 54.2], [172.9, 62.5], [153.4, 42.0], [160.0, 50.0]
             *   ]
             */
            data: [], //包含x，y值的数组,第一个为x，第二个为y
            /**
             * @var size
             * @type Number|Function
             * @extends xCharts.series.scatter
             * @description 散点图(气泡图)的大小，数字表示所有气泡运用同一个大小，函数需计算返回一个表示气泡大小的数值
             * @default 5
             * @example
             *  function(data){
             *      //data是一个二维数组，和传入的series.data的值对应
             *      return data[0];
             *  }
             */
            size: 5,
            /**
             * @var xAxisIndex
             * @type Number
             * @description 使用哪一个x轴，从0开始，对应xAxis中的坐标轴
             * @default 0
             * @extends xCharts.series.scatter
             */
            xAxisIndex: 0,
            /**
             * @var yAxisIndex
             * @type Number
             * @description 使用哪一个y轴，从0开始，对应yAxis中的坐标轴
             * @default 0
             * @extends xCharts.series.scatter
             */
            yAxisIndex: 0,
            /**
             * @var opacity
             * @type Number
             * @values 0-1
             * @description 散点（气泡）的透明程度
             * @default 0.6
             * @extends xCharts.series.scatter
             */
            opacity: 0.6,
            /**
             * @var formatter
             * @extends xCharts.series.scatter
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,x,y) {
             *      var html = "<p>"+name+"</p>";
             *      html+="<p>"+x+","+y+"</p>";
             *      return html;
             *  }
             */
            //formatter:

        }
        return scatter;
    }

}(xCharts, d3));