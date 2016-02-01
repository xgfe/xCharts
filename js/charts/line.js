/**
 * Created by liuyang on 15/10/27.
 * 折线图
 *
 * TODO 动画效果
 */
(function (window) {
        var xCharts = window.xCharts;
        var utils = xCharts.utils;
        var Chart = xCharts.charts.Chart;

        xCharts.charts.extend({line: line});
        utils.inherits(line, Chart);
        function line(messageCenter, config) {
            Chart.call(this, messageCenter, config, 'line');
        }

        line.prototype.extend = xCharts.extend;
        line.prototype.extend({
            init: function (messageCenter, config, type, series) {
                this.xAxisScale = messageCenter.xAxisScale;
                this.yAxisScale = messageCenter.yAxisScale;
                this.series = this.__parseSeries(series, config);
                this.timeModel = config.xAxis[0].type=='time';//时间轴模式
            },

            __parseSeries: function (series, config) {
                //先剔除不属于line的serie
                var _this = this, stacks = {}, idx = 0, lineSeries = [];
                series.map(function (serie) {
                    if (serie.type == 'line') {
                        serie = utils.merage(defaultConfig(), serie);//与默认参数合并
                        serie.idx = serie.idx == null ? idx++ : serie.idx;
                        if (!serie.stack) {
                            lineSeries.push(serie);
                            return;
                        }
                        stacks[serie.stack] || ( stacks[serie.stack] = [])
                        stacks[serie.stack].push(serie);
                    }
                });
                //处理堆积情况
                var stackSeries = parseStacksSeries(_this, stacks, config);
                //非堆积情况
                lineSeries = parseNoramlSeries(_this, lineSeries, config);
                return lineSeries.concat(stackSeries);//反转一下是为了解决堆积面积图时会产生重叠覆盖问题
            },
            render: function (ease, durationTime) {
                this.__renderArea(ease, durationTime);
                this.__renderLine(ease, durationTime);
                if(!this.timeModel) this.__renderCircle(ease, durationTime);
            },
            __renderLine: function (ease, time) {
                var id = this.id, _this = this;
                var lineGroup = this.main.selectAll('.xc-line-group').data([_this]);
                lineGroup.enter().append('g').attr('class', 'xc-line-group');
                lineGroup.exit().remove();
                var lineScale = d3.svg.line()
                    .x(function (d) {
                        return d.xScale(d.x);
                    })
                    .y(function (d) {
                        return d.yScale(d.y);
                    });
                var linePath = lineGroup.selectAll('.xc-line-path').data(_this.series)
                linePath.enter().append('path').attr('class', 'xc-line-path').attr('fill', 'none');
                linePath.exit().remove();
                linePath.attr('d', function (d) {
                    if (d.show === false) return "";
                    lineScale.interpolate(d.interpolate);
                    return lineScale(d.data);
                })
                    .attr('stroke', function (d, i) {
                        if (d.lineStyle.color != 'auto')
                            return d.lineStyle.color;
                        return _this.getColor(d.idx);
                    })
                    .attr('stroke-width', function (d) {
                        return d.lineStyle.width;
                    })
                    .attr('id', function (d) {
                        return 'xc-line-path-id' + id + "-" + d.idx;
                    })
            },
            __renderArea: function (ease, time) {
                //面积
                // DONE 不用d3.svg.area，重写一个以满足需求
                // FIXME 当y轴=category时，无法满足
                var id = this.id, _this = this;

                area(_this.series);//计算面积path路径

                var areaGroup = _this.main.selectAll('.xc-area-group').data([_this]);
                areaGroup.enter().append('g').attr('class', 'xc-area-group');
                areaGroup.exit().remove();
                var areaPath = areaGroup.selectAll('.xc-line-area-path').data(_this.series);
                areaPath.enter().append('path').attr('class', 'xc-line-area-path').attr('stroke', 'none');
                areaPath.exit().remove();
                areaPath.attr('d', function (d) {
                    if (d.areaStyle.show === false) return;
                    return d.areaPath;
                })
                    .attr('fill', function (d) {
                        if (d.areaStyle.color == 'auto') {
                            //当面积的颜色为auto时，和折线保持一致
                            if (d.lineStyle.color == 'auto')
                                return _this.getColor(d.idx);
                            else
                                return d.lineStyle.color
                        }
                        else
                            return d.areaStyle.color;
                    })
                    .attr('opacity', function (d) {
                        return d.areaStyle.opacity
                    })
                    .attr('id', function (d) {
                        return 'xc-line-area-path-id' + id + "-" + d.idx;
                    })
            },
            __renderCircle: function (ease, time) {
                //画点
                //最后画点，防止面积遮盖
                var id = this.id, _this = this;
                var circleGroup = _this.main.selectAll('.xc-circle-group').data(_this.series);
                circleGroup.enter().append('g').attr('class', function (serie) {
                    return 'xc-circle-group'
                });
                circleGroup.exit().remove();

                circleGroup.attr('id', function (d) {
                    return 'xc-circle-group-id' + id + '-' + d.idx;
                })
                    .attr('fill', function (serie) {
                        if (serie.lineStyle.color != 'auto')
                            return serie.lineStyle.color;
                        return _this.getColor(serie.idx);
                    })

                var circle = circleGroup.selectAll('circle').data(function (d) {
                    return d.show === false ? "" : d.data
                });
                circle.enter().append('circle').attr('class', function (d, i) {
                    return 'xc-point xc-point-' + i;
                });
                circle.exit().remove();
                circle.attr('r', function (d) {
                    return d._serie.lineStyle.radius;
                })
                    .attr('cx', function (d) {
                        return d.xScale(d.x);
                    })
                    .attr('cy', function (d) {
                        return d.yScale(d.y);
                    })
                _this.circleGroup = circle;
            },
            ready: function () {
                this.__legendReady();
                this.__tooltipReady();
            },
            __legendReady: function () {
                var lineUse, areaUse, circleUse, _this = this, id = _this.id;
                this.on('legendMouseenter.line', function (name) {
                    lineUse = _this.main.selectAll('.xc-line-use').data([_this]);
                    areaUse = _this.main.selectAll('.xc-line-area-use').data([_this]);
                    circleUse = _this.main.selectAll('.xc-circle-use').data([_this]);
                    lineUse.enter().append('use').attr('class', "xc-line-use");
                    areaUse.enter().append('use').attr('class', "xc-line-area-use");
                    circleUse.enter().append('use').attr('class', "xc-circle-use");

                    var serie = getSeries(name);
                    if (!serie) return;
                    var lineId = "#xc-line-path-id" + id + "-" + serie.idx,
                        areaId = "#xc-line-area-path-id" + id + "-" + serie.idx,
                        circleId = "#xc-circle-group-id" + id + "-" + serie.idx;

                    lineUse.attr('xlink:href', lineId);
                    areaUse.attr('xlink:href', areaId);
                    circleUse.attr('xlink:href', circleId);
                    d3.select(lineId).attr('stroke-width', serie.lineStyle.width + 1);
                    //d3.select(circleId).attr('fill', 'yellow');
                })

                this.on('legendMouseleave.line', function (name) {

                    var serie = getSeries(name);
                    if (!serie) return;
                    var lineId = "#xc-line-path-id" + id + "-" + serie.idx,
                        areaId = "#xc-line-area-path-id" + id + "-" + serie.idx,
                        circleId = "#xc-circle-group-id" + id + "-" + serie.idx;

                    lineUse.attr('xlink:href', "");
                    areaUse.attr('xlink:href', "");
                    circleUse.attr('xlink:href', "");
                    d3.select(lineId).attr('stroke', serie.color).attr('stroke-width', serie.lineStyle.width);
                    d3.select(circleId).attr('fill', serie.color);
                })


                /**
                 * 根据name 取得对应的serie
                 * @param name
                 * @returns {*}
                 */
                function getSeries(name) {
                    var series = _this.series;
                    for (var i = 0, s; s = series[i++];)
                        if (s.name == name) return s;
                }

                this.on('legendClick.line', function (nameList) {
                    var series = _this.config.series;

                    _this.init(_this.messageCenter, _this.config, _this.type, series);
                    _this.render('linear', 0);
                });
            },
            __tooltipReady: function () {
                var _this = this;

                if (!this.config.tooltip || !this.config.tooltip.show) return;//未开启tooltip

                if (this.config.tooltip.trigger == 'axis') {

                    this.on('tooltipSectionChange.line', function (sectionNumber, callback, format) {

                        var html = "", series = _this.series;

                        if(_this.timeModel){
                            //时间轴时，鼠标地方会出现圆点
                            _this.main.selectAll('.xc-tooltip-circle').remove();//清理上个区间的圆点
                            _this.series.forEach(function(serie){

                                var data = serie.data[sectionNumber];
                                _this.main.append('circle').datum(data)
                                    .attr('class',"xc-tooltip-circle")
                                    .attr('r', function (d) {
                                        return d._serie.lineStyle.radius;
                                    })
                                    .attr('cx', function (d) {
                                        return d.xScale(d.x);
                                    })
                                    .attr('cy', function (d) {
                                        return d.yScale(d.y);
                                    })
                                    .attr('fill',function(d){
                                        return d._serie.color;
                                    })
                            })

                        }

                        series.forEach(function (serie) {
                            if (serie.show === false) return;
                            var data = serie.data[sectionNumber]===undefined?"":serie.data[sectionNumber].value;

                            var serieFormat = serie.formatter || format ||defaultFormatter;
                            html += serieFormat(serie.name, data);
                        })
                        callback(html);
                    });

                    this.on('tooltipHidden',function(){
                        //当tooltip滑出区域时，需要清理圆点
                        _this.main.selectAll('.xc-tooltip-circle').remove();//清理上个区间的圆点
                    })
                } else {
                    //trigger='item'
                    var tooltip = _this.messageCenter.components['tooltip'];
                    var tooltipFormatter = tooltip.tooltipConfig.formatter;
                    var axisConfig = _this.messageCenter.components['xAxis'].axisConfig;
                    _this.circleGroup.on('mouseenter', function (data) {
                        var target = d3.event.srcElement || d3.event.target;
                        target = d3.select(target);
                        var data = target.data()[0];
                        var value = data.value;
                        var name = data._serie.name;
                        var serieFormatter = data._serie.formatter || tooltipFormatter || defaultFormatter;
                        var html = serieFormatter(name, value);

                        var xData = data.x;
                        xData = axisConfig[data._serie.xAxisIndex].tickFormat(xData);
                        var title = "<p>" + xData + "</p>";
                        tooltip.show();
                        tooltip.html(title + html);
                        var event = d3.event;
                        var x = event.layerX || event.offsetX, y = event.layerY || event.offsetY;
                        tooltip.setPosition([x, y]);

                    })
                    _this.circleGroup.on('mouseleave', function () {
                        tooltip.hidden();
                    })

                }

            }

        });

        /**
         * todo 干掉这两个神似的函数
         * 处理堆积状态下的series
         * @param _this
         * @param stacks
         * @param config
         * @returns {Array}
         */
        function parseStacksSeries(_this, stacks, config) {
            var stackSeries = [];
            for (var k in stacks) {
                if (stacks.hasOwnProperty(k)) {
                    var oldData = null, oldInterpolate = 'linear';
                    stacks[k].forEach(function (serie) {
                        if (serie.show !== false) {
                            var _serie = serie;
                            var xConfig = config['xAxis'][serie.xAxisIndex];
                            var yConfig = config['yAxis'][serie.yAxisIndex];
                            var xScale = _this.xAxisScale[serie.xAxisIndex];
                            var yScale = _this.yAxisScale[serie.yAxisIndex];
                            var serieIdx = serie.idx;
                            serie.interpolate = serie.smooth ? 'monotone' : 'linear';
                            serie.y0Interpolate = oldInterpolate;
                            oldInterpolate = serie.interpolate;
                            serie.data = serie.data.map(function (d, idx) {
                                var data = {};
                                if (xConfig.type != 'value') {
                                    data.x = xConfig.data[idx];
                                    data.y0 = oldData ? oldData[idx].y : yScale.domain()[0];
                                    data.y = parseFloat(d) + (oldData ? oldData[idx].y : 0);
                                    data.value = d;
                                }
                                // TODO 改下这些繁琐的东东 通过_series引用就行了

                                data.idx = serieIdx;
                                data.xScale = xScale;
                                data.yScale = yScale;
                                data._serie = _serie;
                                return data;
                            })
                            oldData = serie.data;
                        }
                        ;
                        stackSeries.push(serie);
                    });

                }
            }
            return stackSeries;
        }

        /**
         * 处理非堆积状态的series
         * @param _this
         * @param lineSeries
         * @param config
         * @returns {*}
         */
        function parseNoramlSeries(_this, lineSeries, config) {
            var oldData = null;
            lineSeries = lineSeries.map(function (serie) {
                if (serie.show !== false) {
                    var xConfig = config['xAxis'][serie.xAxisIndex];
                    var yConfig = config['yAxis'][serie.yAxisIndex];
                    var xScale = _this.xAxisScale[serie.xAxisIndex];
                    var yScale = _this.yAxisScale[serie.yAxisIndex];
                    var serieIdx = serie.idx;
                    serie.interpolate = serie.smooth ? 'monotone' : 'linear';
                    serie.y0Interpolate = 'linear';
                    var _serie = serie;
                    serie.data = serie.data.map(function (d, idx) {

                        var data = {};
                        if (xConfig.type != 'value') {
                            data.x = xConfig.data[idx];
                            data.y = parseFloat(d);
                            data.y0 = yScale.domain()[0];
                            data.value = d;
                        }
                        else {
                            data.y = yConfig.data[idx];
                            data.x0 = xScale.domain()[0];
                            data.x = parseFloat(d);
                        }
                        data.xScale = xScale;
                        data.yScale = yScale;
                        oldData = serie.data;
                        data.idx = serieIdx;
                        data._serie = _serie;
                        return data;
                    })
                }
                return serie;
            });
            return lineSeries
        }

        /**
         * 替换d3.svg.area函数
         * @param data
         */
        function area(series) {
            var lineScale = d3.svg.line()
                .x(function (d) {
                    return d.xScale(d.x);
                })
                .y(function (d) {
                    return d.yScale(d.y);
                });
            var line0Scale = d3.svg.line()
                .x(function (d) {
                    return d.xScale(d.x);
                })
                .y(function (d) {
                    return d.yScale(d.y0);
                })

            series.forEach(function (serie) {
                if (serie.show === false) return;
                lineScale.interpolate(serie.interpolate);
                serie.path = lineScale(serie.data);
                line0Scale.interpolate(serie.y0Interpolate);
                serie.path0 = line0Scale(serie.data.reverse());
                serie.data.reverse()//再次翻转，恢复原状
                serie.areaPath = joinPath(serie);
            });
            /**
             * 将path和path0拼接成一个areaPath
             * @param serie
             */
            function joinPath(serie) {
                var path = serie.path,
                    path0 = serie.path0,
                    firstData = serie.data[0], lastData = serie.data[serie.data.length - 1];
                var leftTop = [firstData.xScale(firstData.x), firstData.yScale(firstData.y)],
                    rightBottom = [lastData.xScale(lastData.x), lastData.yScale(lastData.y0)];

                return path + 'L' + rightBottom + path0 + 'L' + leftTop;
            }
        }

        /**
         * 折线图tooltip默认格式化函数
         * @param name x轴值
         * @param value y轴值
         * @returns {string} 一段html文本
         */
        function defaultFormatter(name, value) {
            return '<p>'+name + ':&nbsp;' + value+'</p>';
        }

        function defaultConfig() {
            /**
             * @var line
             * @type Object
             * @extends xCharts.series
             * @describtion 折线图配置项
             */
            var config = {
                /**
                 * @var name
                 * @type String
                 * @describtion 线条名字
                 * @extends xCharts.series.line
                 */
                name: '',
                /**
                 * 定义图表类型是折线图
                 * @var type
                 * @type String
                 * @describtion 指定图表类型
                 * @values 'line'
                 * @extends xCharts.series.line
                 */
                type: 'line',
                /**
                 * @var xAxisIndex
                 * @type Number
                 * @describtion 使用哪一个x轴，从0开始，对应xAxis中的坐标轴
                 * @default 0
                 * @extends xCharts.series.line
                 */
                xAxisIndex: 0,
                /**
                 * @var yAxisIndex
                 * @type Number
                 * @describtion 使用哪一个y轴，从0开始，对应yAxis中的坐标轴
                 * @default 0
                 * @extends xCharts.series.line
                 */
                yAxisIndex: 0,
                /**
                 * @var smooth
                 * @type Boolean
                 * @describtion 折线是否开启平滑曲线,默认开启
                 * @default true
                 * @extends xCharts.series.line
                 */
                smooth: true,
                /**
                 * @var lineStyle
                 * @type Object
                 * @describtion 线条样式控制
                 * @extends xCharts.series.line
                 */
                lineStyle: {
                    /**
                     * @var color
                     * @type String
                     * @describtion 折线颜色控制，不设或者设置为'auto',则由系统默认分配一个颜色
                     * @default 'auto'
                     * @values 'auto'|css颜色值
                     * @extends xCharts.series.line.lineStyle
                     */
                    color: 'auto',
                    /**
                     * @var width
                     * @type Number
                     * @describtion 折线宽度控制，数字越大折线越粗，不允许负值
                     * @default 2
                     * @extends xCharts.series.line.lineStyle
                     */
                    width: 2,
                    /**
                     * @var radius
                     * @type Number
                     * @describtion 折线上圆点的大小，数字越大，圆点越大
                     * @default 5
                     * @extends xCharts.series.line.lineStyle
                     */
                    radius: 5
                },
                /**
                 * @var areaStyle
                 * @type Object
                 * @describtion 面积图样式控制
                 * @extends xCharts.series.line
                 */
                areaStyle: {
                    /**
                     * @var show
                     * @type Boolean
                     * @describtion 开启面积图，默认不开启
                     * @default false
                     * @extends xCharts.series.line.areaStyle
                     */
                    show: false,
                    /**
                     * @var color
                     * @type String
                     * @describtion 面积图颜色值,不设或者设置为'auto'，颜色和折线一致
                     * @default 'auto'
                     * @values 'auto'|css颜色值
                     * @extends xCharts.series.line.areaStyle
                     */
                    color: 'auto',
                    /**
                     * @var opacity
                     * @type Number
                     * @describtion 面积图颜色透明度控制
                     * @default 0.3
                     * @values 0-1
                     * @extends xCharts.series.line.areaStyle
                     */
                    opacity: 0.3
                },
                /**
                 * @var data
                 * @type Array
                 * @describtion 折线图数据，提供给type=value的坐标轴使用
                 * @extends xCharts.series.line
                 * @example
                 * data: ['11%', 11, 15, 70, 12, 40, 60]
                 * //这里最终会通过parseFloat转化，字符串和数字都无所谓，不过单位会丢失，如果需要单位需要配置units选项
                 */
                data: [],
                /**
                 * @var units
                 * @type String
                 * @describtion 补全数据的单位配合data使用，提供给tooltip使用,也可以在tooltip里的formatter里自己配置格式化结果
                 * @extends xCharts.series.line
                 * @example
                 * units: '%'
                 */
                units: '',
                /**
                 * @var formatter
                 * @extends xCharts.series.line
                 * @type Function
                 * @describtion 可以单独定义格式化函数来覆盖tooltip里面的函数
                 * @example
                 *  formatter: function (name,data) {
                 *   return '<p>'+name + ':&nbsp;' + data+'</p>';
                 *  }
                 */
                //formatter:function(name,value){
                //    return name+':&nbsp;'+data;
                //}
            }
            return config;
        }

    }
    (window)
)