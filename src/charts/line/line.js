/**
 * Created by liuyang on 15/10/27.
 * 折线图
 *
 * TODO 动画效果
 * TODO 折线图鼠标hover影藏点出现
 */
(function (xCharts, d3) {
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

            // 处理折线图数据
            this.series = parseSeries(this, series, config);

            // 判断是否是时间轴
            this.timeModel = config.xAxis[0].type == 'time';
        },
        render: function (animationEase, animationTime) {

            this.__renderArea(animationEase, animationTime);
            this.__renderLine(animationEase, animationTime);
            if (!this.timeModel) this.__renderCircle(animationEase, animationTime);
            if (this.config.peekPoints.enable) this.__renderPeek(animationEase, animationTime);
            if (this.timeModel) this._brushRender();
        },
        __renderLine: function (animationEase, animationTime) {
            var id = this.id, _this = this;

            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";

            var lineGroup = this.main.selectAll('.xc-line-group').data([_this]);
            lineGroup = lineGroup.enter().append('g').attr('class', 'xc-line-group')
                .merge(lineGroup)

                // .exit().remove().merage(lineGroup);
            var lineScale = d3.line()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                });
            var linePath = lineGroup.selectAll('.xc-line-path').data(_this.series);
            linePath = linePath.enter().append('path').attr('class', 'xc-line-path').attr('fill', 'none').merge(linePath);
            linePath.exit().remove();
            linePath.attr('stroke', function (d) {
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
                .style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (d.show === false) {
                        return 0;
                    } else {
                        return 0.7;
                    }
                });

            linePath.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween("d", function (serie) {

                    var ctx = this;
                    if (serie.show === false) return function () {
                        return ctx.linePath;
                    };

                    var transitionData = serie.data.map(function (dataItem) {
                        return {
                            x: dataItem.adjustedX ? dataItem.adjustedX : serie.xScale(dataItem.x),
                            y: serie.yScale(dataItem.y)
                        }
                    });

                    if (this.transitionData === undefined) {
                        var minValue = serie.yScale.range()[1];
                        this.transitionData = serie.data.map(function (dataItem) {
                            return {
                                x: dataItem.adjustedX ? dataItem.adjustedX : serie.xScale(dataItem.x),
                                y: serie.yScale(minValue)
                            }
                        });
                        // serie.data.map(function (dataItem) {
                        //     return {
                        //         x: serie.xScale(dataItem.x),
                        //         y: serie.yScale(minValue)
                        //     }
                        // })
                    }

                    var interpolate = d3.interpolate(this.transitionData, transitionData);
                    this.transitionData = transitionData;

                    return function (t) {
                        var interpolateData = interpolate(t);
                        var invalidIdxList = [], validDataList = [];
                        serie.data.forEach(function (d, i) {
                            if (d.justCircle) {
                                invalidIdxList.push(i);
                            }
                        });
                        if (invalidIdxList.length > 0) {
                            var preIndex = 0;
                            invalidIdxList.push(interpolateData.length);
                            for (var index = 0; index < invalidIdxList.length; index++) {
                                var curIndex = invalidIdxList[index];
                                if (curIndex - preIndex > 0) {
                                    validDataList.push(interpolateData.slice(preIndex, curIndex));
                                }
                                preIndex = curIndex + 1;
                            }
                        } else {
                            validDataList = [interpolateData];
                        }
                        lineScale.curve(serie.interpolate === 'linear' ? d3.curveLinear : d3.curveMonotoneX);
                        var path = '';
                        validDataList.forEach(function (lineData) {
                            path += lineScale(lineData);
                        });
                        if (t == 1) {
                            ctx.linePath = path;
                            _this.fire('lineAnimationEnd');
                        }
                        return path;
                    }
                });

            this.lineGroup = lineGroup;
        },
        __renderArea: function (animationEase, animationTime) {
            //面积
            // DONE 不用d3.svg.area，重写一个以满足需求
            var id = this.id, _this = this;
            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";
            var areaGroup = _this.main.selectAll('.xc-area-group').data([_this]);
            areaGroup = areaGroup.enter().append('g').attr('class', 'xc-area-group').merge(areaGroup);
            areaGroup.exit().remove();
            var areaPath = areaGroup.selectAll('.xc-line-area-path').data(_this.series);
            areaPath = areaPath.enter().append('path').attr('class', 'xc-line-area-path').attr('stroke', 'none').merge(areaPath);
            areaPath.exit().remove();
            areaPath.attr('fill', function (d) {
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
                .attr('id', function (d) {
                    return 'xc-line-area-path-id' + id + "-" + d.idx;
                })
                .style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (d.show === false) {
                        return 0;
                    } else {
                        return d.areaStyle.opacity;
                    }
                });


            // 动画
            areaPath.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween("d", function (serie) {
                    var ctx = this;

                    if (serie.show === false) {
                        return function () {
                            return ctx.areaPath == null ? "" : ctx.areaPath;
                        }
                    }

                    if (serie.areaStyle.show === false) {
                        return function () {
                            return "";
                        }
                    }


                    var areaData = serie.data.map(function (dataItem) {
                        return {
                            x: dataItem.adjustedX ? dataItem.adjustedX : serie.xScale(dataItem.x),
                            y: serie.yScale(dataItem.y),
                            y0: serie.yScale(dataItem.y0)
                        }
                    });

                    if (ctx.areaData === undefined) {
                        ctx.areaData = serie.data.map(function (dataItem) {
                            return {
                                x: serie.xScale(dataItem.x),
                                y: serie.yScale(dataItem.y0),
                                y0: serie.yScale(dataItem.y0)
                            }
                        });
                    }

                    // ctx.areaData = ctx.areaData == undefined ? areaData : ctx.areaData;
                    var interpolate = d3.interpolate(this.areaData, areaData);
                    ctx.areaData = areaData;

                    return function (t) {
                        var data = interpolate(t);
                        var invalidIdxList = [], validDataList = [];
                        serie.data.forEach(function (d, i) {
                            if (d.justCircle) {
                                invalidIdxList.push(i);
                            }
                        });
                        if (invalidIdxList.length > 0) {
                            var preIndex = 0;
                            invalidIdxList.push(data.length);
                            for (var index = 0; index <= invalidIdxList.length; index++) {
                                var curIndex = invalidIdxList[index];
                                if (curIndex - preIndex > 0) {
                                    validDataList.push(data.slice(preIndex, curIndex));
                                }
                                preIndex = curIndex + 1;
                            }
                        } else {
                            validDataList = [data];
                        }
                        var areaPath = '';
                        validDataList.forEach(function (areaData) {
                            areaPath += area(areaData, serie);
                        });
                        if (t == 1) {
                            ctx.areaPath = areaPath;
                        }
                        return areaPath;
                    }
                });
        },
        __renderCircle: function (animationEase, animationTime) {
            //画点
            //最后画点，防止面积遮盖
            var id = this.id, _this = this;
            var showDataList = _this.messageCenter.showDomainList[0];
            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";
            var circleGroup = _this.main.selectAll('.xc-circle-group').data(_this.series);
            circleGroup = circleGroup.enter().append('g').attr('class', function (serie) {
                return 'xc-circle-group';
            }).merge(circleGroup);
            circleGroup .attr('id', function (d) {
                circleGroup.exit().remove();
                return 'xc-circle-group-id' + id + '-' + d.idx;
            }).attr('fill', function (serie) {
                    if (serie.lineStyle.color != 'auto')
                        return serie.lineStyle.color;
                    return _this.getColor(serie.idx);
                });
            var circle = circleGroup.selectAll('circle').data(function (d) {
                return d.data;
            });
            circle = circle.enter().append('circle').attr('class', function (d, i) {
                return 'xc-point xc-point-' + i;
            }).merge(circle);
            circle.exit().remove();

            circle.style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (typeof d !== 'object') {
                        return 0;
                    } else {
                        return 0.7;
                    }
                })
                .style("display", function (d, idx) {
                    if (showDataList[idx] !== true) {
                        this.circleDisplay = false;
                        return "none";
                    }
                    this.circleDisplay = true;
                    return "block";
                })
                .attr('r', function (d) {
                    if (typeof d === 'object') {
                        this.circleRadius = d._serie.lineStyle.radius;
                    }
                    return this.circleRadius;
                });
            // .attr('cx', function (data) {
            //     var ctx = this;
            //     if (typeof data !== 'object') {
            //         return ctx.circleCX;
            //     }
            //     ctx.circleCX = data._serie.xScale(data.x);
            //     return ctx.circleCX;
            // })
            // .attr('cy', function (data) {
            //     var ctx = this;
            //     if (typeof data !== 'object') {
            //         return ctx.circleCY;
            //     }
            //     ctx.circleCY = data._serie.yScale(data.y);
            //     return ctx.circleCY;
            // })

            //动画
            circle.transition()
                .duration(animationTime)
                .ease(animationEase)
                .attrTween("cx", function (d) {
                    var ctx = this;
                    if (typeof d !== 'object') {
                        return function () {
                            return ctx.circleCX
                        }
                    }
                    var circleCX = d.adjustedX ? d.adjustedX : d._serie.xScale(d.x);
                    ctx.circleCX = ctx.circleCX == undefined ? circleCX : ctx.circleCX;
                    var interpolate = d3.interpolate(ctx.circleCX, circleCX);
                    ctx.circleCX = circleCX;
                    return function (t) {
                        return interpolate(t);
                    }
                })
                .attrTween("cy", function (d) {
                    var ctx = this;

                    if (typeof d !== 'object') {
                        return function () {
                            return ctx.circleCY;
                        }
                    }
                    var circleCY = d._serie.yScale(d.y);
                    if (ctx.circleCY === undefined) {
                        var minValue = d._serie.yScale.range()[1];
                        ctx.circleCY = d._serie.yScale(minValue);
                    }
                    ctx.circleCY = ctx.circleCY == undefined ? circleCY : ctx.circleCY;
                    var interpolate = d3.interpolate(ctx.circleCY, circleCY);
                    ctx.circleCY = circleCY;
                    return function (t) {
                        return interpolate(t);
                    }
                });

            _this.circle = circle;
            _this.circleGroup = circleGroup;
        },
        __renderPeek: function (animationEase, animationTime) {

            // 绘制峰值点
            var id = this.id, _this = this;
            var showDataList = _this.messageCenter.showDomainList[0];
            var transitionStr = "opacity " + (animationTime / 2) + "ms linear";
            var peekGroup = _this.main.selectAll('xc-peek-group').data(_this.series);
            peekGroup = peekGroup.enter().append('g').attr('class', 'xc-peek-group').merge(peekGroup);
            peekGroup.exit().remove();
            peekGroup.attr('id', function (d) {
                return 'xc-peek-group-id' + id + d.idx;
            }).attr('fill', function (serie) {
                if (serie.lineStyle.color != 'auto')
                    return serie.lineStyle.color;
                return _this.getColor(serie.idx);
            });
            var peekPoints = peekGroup.selectAll('path').data(function (d) {
                return d.peekPoints;
            });
            peekPoints = peekPoints.enter().append('path').merge(peekPoints)
                .attr('class', function (d, i) {
                    return 'xc-peek-point xc-peek-point-' + i;
                }).attr('d', function (d) {
                    var startX = d.adjustedX ? d.adjustedX : d._serie.xScale(d.x);
                    var startY = d._serie.yScale(d.y);
                    return utils.peekPointOfDrop(startX, startY);
                });
            peekPoints.exit().remove();
            peekPoints.style("transition", transitionStr)
                .style("opacity", function (d) {
                    if (typeof d !== 'object') {
                        return 0;
                    } else {
                        return 0.7;
                    }
                })
                .style("display", function (d, idx) {
                    if (showDataList[idx] !== true) {
                        this.circleDisplay = false;
                        return "none";
                    }
                    this.circleDisplay = true;
                    return "block";
                });

            // 添加峰值点文字
            var peekText = peekGroup.selectAll('text').data(function (d) {
                return d.peekPoints;
            });
            peekText = peekText.enter().append('text').merge(peekText)
                .text(function (d) {
                    return d.y;
                })
                .attr('fill', '#fff')
                .attr('class', function (d, i) {
                    return 'xc-peek-text xc-peek-text-' + i;
                })
                .attr('x', function (d) {
                    return d.adjustedX ? d.adjustedX : d._serie.xScale(d.x);
                })
                .attr('y', function (d) {
                    return d._serie.yScale(d.y) - 21;
                })
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '0.5em');
            peekText.exit().remove();
        },
        _brushRender: function () {
            this.lineGroup.attr('clip-path', 'url(#xc-clip-main-path)');
        },
        ready: function () {
            if (this.mobileMode) {
                this.mobileReady();
            } else {
                if (this.config.legend && this.config.legend.show) {
                    this.__legendReady();
                }
                if (this.config.tooltip && this.config.tooltip.show) {
                    this.__tooltipReady();
                }
            }
            this._brushReady();
        },
        __legendReady: function () {
            var lineUse, areaUse, circleUse, _this = this, id = _this.id;
            this.on('legendMouseenter.line', function (name) {
                lineUse = _this.main.selectAll('.xc-line-use').data([_this]);
                areaUse = _this.main.selectAll('.xc-line-area-use').data([_this]);
                circleUse = _this.main.selectAll('.xc-circle-use').data([_this]);
                lineUse.enter().append('use').attr('class', "xc-line-use").attr('clip-path', 'url(#xc-clip-main-path)');
                areaUse.enter().append('use').attr('class', "xc-line-area-use").attr('clip-path', 'url(#xc-clip-main-path)');
                circleUse.enter().append('use').attr('class', "xc-circle-use").attr('clip-path', 'url(#xc-clip-main-path)');

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
            });

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
            });


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
                var animationConfig = _this.config.animation;
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render(animationConfig.animationEase, animationConfig.animationTime);
                // _this.render(d3.easeLinear, animationConfig.animationTime);
            });
        },
        __tooltipReady: function () {
            var _this = this;

            if (!this.config.tooltip || this.config.tooltip.show === false) return;//未开启tooltip

            if (this.config.tooltip.trigger === 'axis' || this.config.tooltip.trigger === undefined) {

                this.on('tooltipSectionChange.line', function (sectionNumber, callback, format) {

                    var html = "", series = _this.series;

                    if (_this.timeModel) {
                        //时间轴时，鼠标地方会出现圆点
                        _this.main.selectAll('.xc-tooltip-circle').remove();//清理上个区间的圆点
                        _this.series.forEach(function (serie) {

                            var data = serie.data[sectionNumber];
                            _this.main.append('circle').datum(data)
                                .attr('class', "xc-tooltip-circle")
                                .attr('r', function (d) {
                                    return d._serie.lineStyle.radius;
                                })
                                .attr('cx', function (d) {
                                    return d._serie.xScale(d.x);
                                })
                                .attr('cy', function (d) {
                                    return d._serie.yScale(d.y);
                                })
                                .attr('fill', function (d) {
                                    return d._serie.color;
                                })
                        });

                    } else {
                        // 首先将不显示的圆点全部隐藏
                        _this.circle.style('display', function () {
                            if (!this.circleDisplay) {
                                return 'none';
                            }
                        })
                            .classed('xc-tooltip-circle', false);

                        // 将其他circle都变小
                        _this.circle.attr('r', function () {
                            return this.circleRadius;
                        });

                        // 判断如果是 display:none; 显示为display:block;
                        var circle = _this.circleGroup.selectAll('circle:nth-child(' + (sectionNumber + 1) + ')');
                        circle.style('display', function () {
                            if (!this.circleDisplay) {
                                return 'block';
                            }
                        })
                            .classed('xc-tooltip-circle', true)
                            .attr('r', function () {
                                return this.circleRadius * 1.8;
                            });
                    }

                    series.forEach(function (serie) {
                        if (serie.show === false) return;
                        var data = serie.data[sectionNumber] === undefined ? "" : serie.data[sectionNumber].value;

                        var serieFormat = serie.formatter || format || defaultFormatter;
                        html += serieFormat(serie.name, data);
                    });

                    callback(html);
                });

                this.on('tooltipHidden', function () {
                    //当tooltip滑出区域时，需要清理圆点
                    if (_this.timeModel) {
                        _this.main.selectAll('.xc-tooltip-circle').remove();//清理上个区间的圆点
                    } else {
                        _this.circle.style('display', function () {
                            if (!this.circleDisplay) {
                                return 'none';
                            }
                        })
                            .classed('xc-tooltip-circle', false);
                    }
                })
            } else if (_this.mobileMode) {
                _this.mobileReady();
            } else {
                //trigger='item'
                var tooltip = _this.messageCenter.components['tooltip'];

                _this.circle.on('mouseenter', tooltipTriggerItem(_this));
                _this.circle.on('mouseleave', function () {
                    _this.circle.attr('r', function () {
                        return this.circleRadius;
                    });
                    tooltip.hiddenTooltip();
                });

            }

        },
        _brushReady: function () {
            this.on('brushChange.line', function (domain) {
                // scale.domain(domain);
                this.render(d3.easeLinear, 0);
            }.bind(this));
        }

    });

    line.tooltipTriggerItem = tooltipTriggerItem;


    function tooltipTriggerItem(ctx) {

        return function () {
            var tooltip = ctx.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;
            var axisConfig = ctx.messageCenter.components['xAxis'].axisConfig;

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
            tooltip.showTooltip();
            tooltip.setTooltipHtml(title + html);

            var position = d3.mouse(ctx.svg.node());

            tooltip.setPosition(position);

            // 处理圆变大

            if (ctx.mobileMode) {
                ctx.circle.attr('r', function () {
                    return this.circleRadius;
                });
            }


            d3.select(this).attr('r', function () {
                return this.circleRadius * 1.8;
            });
        }
    }

    function parseSeries(ctx, series, config) {
        //先剔除不属于line的serie
        var stacks = {}, idx = 0, lineSeries = [];
        series.forEach(function (serie) {
            if (serie.type == 'line') {
                serie = utils.merage(defaultConfig(), serie);//与默认参数合并
                serie.idx = serie.idx == null ? idx++ : serie.idx;
                if (!serie.stack) {
                    lineSeries.push(serie);
                    return;
                }
                stacks[serie.stack] || ( stacks[serie.stack] = []);
                stacks[serie.stack].push(serie);
            }
        });
        //处理堆积情况
        var stackSeries = parseStacksSeries(ctx, stacks, config);
        //非堆积情况
        lineSeries = parseNormalSeries(ctx, lineSeries, config);
        return lineSeries.concat(stackSeries);//反转一下是为了解决堆积面积图时会产生重叠覆盖问题
    }

    /**
     *
     * 处理堆积状态下的series
     * @param _this
     * @param stacks
     * @param config
     * @returns {Array}
     */
    function parseStacksSeries(ctx, stacksSeries, config) {
        var stackSeries = [];
        for (var k in stacksSeries) {
            if (stacksSeries.hasOwnProperty(k)) {
                var oldData = null, oldInterpolate = 'linear';
                stacksSeries[k].forEach(function (serie) {
                    if (serie.show !== false) {
                        var xAxisIndex = serie.xAxisIndex,
                            yAxisIndex = serie.yAxisIndex;
                        var xConfig = config['xAxis'][xAxisIndex];
                        var yConfig = config['yAxis'][yAxisIndex];
                        var xScale = ctx.xAxisScale[xAxisIndex];
                        var yScale = ctx.yAxisScale[yAxisIndex];
                        var serieIdx = serie.idx;
                        serie.interpolate = serie.smooth ? 'monotone' : 'linear';
                        serie.y0Interpolate = oldInterpolate;
                        serie.xScale = xScale;
                        serie.yScale = yScale;
                        oldInterpolate = serie.interpolate;
                        if (serie.xScale.domain().length === 0) {
                            serie.data = [];
                        }
                        serie.data = serie.data.map(function (dataValue, idx) {
                            var data = {}, isStackPoint = true;

                            // TODO 这里好像只能满足category
                            if (xConfig.type != 'value') {
                                data.x = xConfig.data[idx];
                                if (data.x === undefined) {
                                    console.error('The length of xAxis.data and series.data is not match!', idx);
                                }
                                var maxY = yScale.domain()[1];
                                var minY = yScale.domain()[0];
                                if (!oldData) {
                                    data.y0 = minY;
                                    data.y = parseFloat(dataValue);
                                } else {
                                    isStackPoint = oldData[idx] && !oldData[idx].justCircle;
                                    data.y0 = isStackPoint ? oldData[idx].y : minY;
                                    data.y = parseFloat(dataValue) + (isStackPoint ? oldData[idx].y : 0);
                                }
                                data.isStackPoint = isStackPoint;
                                if (data.y > maxY) {
                                    data.y = maxY;
                                }
                                if (data.y < minY) {
                                    data.y = minY;
                                }
                                if (typeof data.y === 'number' && data.y !== data.y) {
                                    data.justCircle = true;
                                    dataValue = '-';
                                    data.y = maxY;
                                }
                                data.x = xConfig.data[idx];
                            }

                            data.value = dataValue;
                            data.idx = serieIdx;
                            data._serie = serie;
                            if (config.xAxis.middleBand) {
                                var rangeBand = xScale.bandwidth();
                                data.adjustedX = xScale(data.x) + idx * rangeBand / 2;
                            }
                            return data;
                        });
                        oldData = serie.data;
                    }
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
    function parseNormalSeries(_this, lineSeries, config) {
        var invalidPoints = 0;
        lineSeries = lineSeries.map(function (serie) {
            if (serie.show !== false) {

                var xAxisIndex = serie.xAxisIndex,
                    yAxisIndex = serie.yAxisIndex;

                var xConfig = config['xAxis'][xAxisIndex];
                var yConfig = config['yAxis'][yAxisIndex];
                var xScale = _this.xAxisScale[xAxisIndex];
                var yScale = _this.yAxisScale[yAxisIndex];
                var serieIdx = serie.idx;
                serie.interpolate = serie.smooth ? 'monotone' : 'linear';
                serie.y0Interpolate = 'linear';
                serie.xScale = xScale;
                serie.yScale = yScale;
                if (serie.xScale.domain().length === 0) {
                    console.error('xAxis.data is empty!');
                    serie.data = [];
                }
                serie.data = serie.data.map(function (dataValue, idx) {
                    var data = {};
                    if (xConfig.type != 'value') {
                        data.x = xConfig.data[idx];
                        if (data.x === undefined) {
                            console.error('The length of xAxis.data and series.data is not match!', idx);
                        }
                        var maxY = yScale.domain()[1];
                        var minY = yScale.domain()[0];
                        data.y = parseFloat(dataValue);
                        if (data.y > maxY) {
                            data.y = maxY;
                        }
                        if (data.y < minY) {
                            data.y = minY;
                        }
                        if (typeof data.y === 'number' && data.y !== data.y) {
                            data.justCircle = true;
                            dataValue = '-';
                            data.y = maxY;
                        }
                        data.y0 = minY;
                    }

                    data.value = dataValue;
                    data.idx = serieIdx;
                    data._serie = serie;
                    if (xConfig.middleBand) {
                        var rangeBand = xScale.bandwidth();
                        data.adjustedX = xScale(data.x) + rangeBand / 2;
                    }
                    return data;
                });
                if (config.peekPoints.enable) {
                    var sortedData = utils.copy(serie.data);
                    sortedData.sort(function (pre, cur) {
                        if (pre.y < cur.y) {
                            return -1;
                        } else if (pre.y === cur.y) {
                            return 0;
                        } else {
                            return 1;
                        }
                    });
                    serie.peekPoints = [sortedData[0], sortedData[sortedData.length - 1]];
                }
            }
            return serie;
        }).filter(function (item) {
            return item.data.length > 0;
        });
        return lineSeries;
    }

    /**
     * 替换d3.svg.area函数
     * @param data
     */
    function area(data, serie) {
        var lineScale = d3.line()
            .x(function (d) {
                return d.x;
            })
            .y(function (d) {
                return d.y;
            });
        var line0Scale = d3.line()
            .x(function (d) {
                return d.x;
            })
            .y(function (d) {
                return d.y0;
            });


        lineScale.curve(serie.interpolate === 'linear' ? d3.curveLinear : d3.curveMonotoneX);
        var path = lineScale(data);
        // line0Scale.interpolate(serie.line0Scale);
        line0Scale.curve(serie.y0Interpolate === 'linear' ? d3.curveLinear : d3.curveMonotoneX);
        var stackIdxList = [], stackDataList = [];
        serie.data.forEach(function (d, i) {
            if (!d.isStackPoint) {
                stackIdxList.push(i);
            }
        });
        if (stackIdxList.length > 0) {
            var preIndex = 0;
            stackIdxList.push(data.length);
            for (var index = 0; index < stackIdxList.length; index++) {
                var curIndex = stackIdxList[index];
                if (curIndex - preIndex > 0) {
                    stackDataList.push(data.slice(preIndex, curIndex));
                }
                preIndex = curIndex + 1;
            }
        } else {
            stackDataList = [data];
        }
        var path0 = '';
        stackDataList.forEach(function (data) {
            path0 += line0Scale(data.reverse());
        });
        // var path0 = line0Scale(data.reverse());
        data.reverse()//再次翻转，恢复原状
        return joinPath(path, path0, data);
    }

    /**
     * 将path和path0拼接成一个areaPath
     * @param serie
     */
    function joinPath(path, path0, data) {
        var firstData = data[0], lastData = data[data.length - 1];
        var leftTop = [firstData.x, firstData.y],
            rightBottom = [lastData.x, lastData.y0];

        return path + 'L' + rightBottom + path0 + 'L' + leftTop;
    }

    /**
     * 折线图tooltip默认格式化函数
     * @param name x轴值
     * @param value y轴值
     * @returns {string} 一段html文本
     */
    function defaultFormatter(name, value) {
        if (value !== '') {
            return '<p>' + name + ':&nbsp;' + value + '</p>';
        }
        return '';
    }

    function defaultConfig() {
        /**
         * @var line
         * @type Object
         * @extends xCharts.series
         * @description 折线图配置项
         */
        var config = {
            /**
             * @var name
             * @type String
             * @description 线条名字
             * @extends xCharts.series.line
             */
            name: '',
            /**
             * 定义图表类型是折线图
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'line'
             * @extends xCharts.series.line
             */
            type: 'line',
            xAxisIndex: 0,
            /**
             * @var yAxisIndex
             * @type Number
             * @description 使用哪一个y轴，从0开始，对应yAxis中的坐标轴
             * @default 0
             * @extends xCharts.series.line
             */
            yAxisIndex: 0,
            /**
             * @var smooth
             * @type Boolean
             * @description 折线是否开启平滑曲线,默认开启
             * @default true
             * @extends xCharts.series.line
             */
            smooth: true,
            /**
             * @var lineStyle
             * @type Object
             * @description 线条样式控制
             * @extends xCharts.series.line
             */
            lineStyle: {
                /**
                 * @var color
                 * @type String
                 * @description 折线颜色控制，不设或者设置为'auto',则由系统默认分配一个颜色
                 * @default 'auto'
                 * @values 'auto'|css颜色值
                 * @extends xCharts.series.line.lineStyle
                 */
                color: 'auto',
                /**
                 * @var width
                 * @type Number
                 * @description 折线宽度控制，数字越大折线越粗，不允许负值
                 * @default 2
                 * @extends xCharts.series.line.lineStyle
                 */
                width: 2,
                /**
                 * @var radius
                 * @type Number
                 * @description 折线上圆点的大小，数字越大，圆点越大
                 * @default 3
                 * @extends xCharts.series.line.lineStyle
                 */
                radius: 3
            },
            /**
             * @var areaStyle
             * @type Object
             * @description 面积图样式控制
             * @extends xCharts.series.line
             */
            areaStyle: {
                /**
                 * @var show
                 * @type Boolean
                 * @description 开启面积图，默认不开启
                 * @default false
                 * @extends xCharts.series.line.areaStyle
                 */
                show: false,
                /**
                 * @var color
                 * @type String
                 * @description 面积图颜色值,不设或者设置为'auto'，颜色和折线一致
                 * @default 'auto'
                 * @values 'auto'|css颜色值
                 * @extends xCharts.series.line.areaStyle
                 */
                color: 'auto',
                /**
                 * @var opacity
                 * @type Number
                 * @description 面积图颜色透明度控制
                 * @default 0.3
                 * @values 0-1
                 * @extends xCharts.series.line.areaStyle
                 */
                opacity: 0.3
            },
            /**
             * @var data
             * @type Array
             * @description 折线图数据，提供给type=value的坐标轴使用
             * @extends xCharts.series.line
             * @example
             * data: ['11%', 11, 15, 70, 12, 40, 60]
             * //这里最终会通过parseFloat转化，字符串和数字都无所谓，不过单位会丢失，如果需要单位需要配置units选项
             */
            data: [],
            /**
             * @var units
             * @type String
             * @description 补全数据的单位配合data使用，提供给tooltip使用,也可以在tooltip里的formatter里自己配置格式化结果
             * @extends xCharts.series.line
             * @example
             * units: '%'
             */
            units: ''
            /**
             * @var formatter
             * @extends xCharts.series.line
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,data) {
                 *   return '<p>'+name + ':&nbsp;' + data+'</p>';
                 *  }
             */
            //formatter:function(name,value){
            //    return name+':&nbsp;'+data;
            //}
        };
        return config;
    }

}(xCharts, d3));