/**
 * @file 柱状图
 * @author chenwubai.cx@gmail.com
 */
(function(window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建bar构造函数
    function bar(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'bar');
    }

    // 在xCharts中注册bar构造函数
    xCharts.charts.extend({ bar: bar });
    // 从父类Chart里继承一系列的方法
    utils.inherits(bar, Chart);

    bar.prototype.extend = xCharts.extend;
    bar.prototype.extend({
        init: function(messageCenter, config, type, series) {
            // 提出type为bar的series的子元素对象
            this.barSeries = new Array();
            for(var i=0;i<series.length;i++) {
                if(series[i].type == 'bar') {
                    this.barSeries.push(series[i]);
                }
            }
            // 用变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.margin = messageCenter.margin;
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

            var _self = this;
            // 给每种柱状添加idx，并获取颜色
            this.barSeries.forEach(function(series, i) {
                series.idx = i;
                series.color = _self.getColor(i);
                series.isShow = true;
            });

            this.xAxisScale = messageCenter.xAxisScale;
            this.yAxisScale = messageCenter.yAxisScale;

            // TODO 这里暂时只考虑柱状图都在一个x轴和y轴上进行绘制，且x轴在下方
            for(var i=0;i<this.xAxisScale.length;i++) {
                // TODO 这个判断条件是否靠谱待调研
                if(typeof this.xAxisScale[i].rangeBand == 'function') {
                    this.barXScale = this.xAxisScale[i];
                    break;
                };
            }
            this.barYScale = this.yAxisScale[0];

            // 获取每组矩形容器的左上角坐标以及其内的矩形左上角的坐标、宽度和高度
            this.rectsData = this.__getDefaultData();
            // 如果有series的isShow为false，则重新计算每组矩形的坐标和宽高
            for(var i=0;i<this.barSeries.length;i++) {
                if(!this.barSeries[i].isShow) {
                    this.__changeRectsData();
                    break;
                }
            }
        },
        render: function(ease, durationTime) {
            // 添加柱状图容器
            this.bar = this.__renderBarWrapper();
            // 添加每组矩形的容器
            this.rectWrapperList = this.__renderRectWrapper();
            // 添加柱状
            this.rectList = this.__renderRect();
        },
        ready: function() {
            this.__legendReady();
            this.__tooltipReady();
        },
        __getDefaultData: function() {
            var rangeBand = this.barXScale.rangeBand(),
                rangeBandNum = this.barXScale.domain().length,
                xRange = this.barXScale.rangeExtent(),
                yRange = this.barYScale.range();
            this.xRange = xRange[1] - xRange[0];
            this.yRange = yRange[0] - yRange[1];
            var outPadding = (this.xRange - rangeBand*rangeBandNum)/2;
            // 定义同组矩形之间的间距
            var rectMargin = 10;
            // 假设所有矩形均可见的情况下，计算矩形宽度
            var seriesLength = this.barSeries.length;
            var rectWidth = (rangeBand - (seriesLength+1)*rectMargin)/seriesLength;

            var rectGroupData = new Array(),
                tempX = outPadding;
            for(var i=0;i<rangeBandNum;i++) {
                // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
                var rectsData = new Array();
                var rectX = rectMargin;
                for(var k=0;k<seriesLength;k++) {
                    var tempRect = {
                        x: rectX,
                        y: this.barYScale(this.barSeries[k].data[i]),
                        width: rectWidth,
                        height: this.yRange - this.barYScale(this.barSeries[k].data[i]),
                        color: this.barSeries[k].color
                    };
                    rectsData.push(tempRect);
                    rectX += rectWidth + rectMargin;
                }
                // 每组矩形容器的坐标以及每组矩形的坐标和宽高
                var tempData = {
                    x: tempX,
                    y: 0,
                    rectsData: rectsData
                };
                rectGroupData.push(tempData);
                tempX += rangeBand;
            }
            return rectGroupData;
        },
        __changeRectsData: function() {
            var rangeBand = this.barXScale.rangeBand();
            // 定义同组矩形之间的间距
            var rectMargin = 10;

            // 根据矩形是否可见，求出实际的矩形宽度
            var visibleSeriesLength = 0;
            for(var i=0;i<this.barSeries.length;i++) {
                if(this.barSeries[i].isShow) {
                    visibleSeriesLength++;
                }
            }
            var realRectWidth = (rangeBand - (visibleSeriesLength+1)*rectMargin)/visibleSeriesLength;

            for(var i=0;i<this.rectsData.length;i++) {
                // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
                var tempRect = this.rectsData[i].rectsData;
                var rectX = rectMargin;
                for(var k=0;k<tempRect.length;k++) {
                    // 根据矩形是否显示重新对一些矩形的坐标和宽高进行计算并赋值
                    if(this.barSeries[k].isShow) {
                        tempRect[k].x = rectX;
                        tempRect[k].y = this.barYScale(this.barSeries[k].data[i]);
                        tempRect[k].width = realRectWidth;
                        tempRect[k].height = this.yRange - this.barYScale(this.barSeries[k].data[i]);
                        rectX += realRectWidth + rectMargin;
                    } else {
                        tempRect[k].y = this.yRange;
                        tempRect[k].height = 0;
                    }
                }
            }
        },
        __renderBarWrapper: function() {
            var bar = this.main.append('g')
                .classed('xc-bar', true);
            return bar;
        },
        __renderRectWrapper: function() {
            var rectWrapperList = this.bar.selectAll('.xc-bar-rectWrapper')
                .data(this.rectsData)
                .enter()
                .append('g')
                .classed('xc-bar-rectWrapper', true)
                .attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                });
            return rectWrapperList;
        },
        __renderRect: function() {
            var rectList = this.rectWrapperList
                .selectAll('.xc-bar-rect')
                .data(function(d) {
                    return d.rectsData;
                })
                .enter()
                .append('rect')
                .classed('xc-bar-rect', true)
                .attr('x', function(d) {
                    return d.x;
                })
                .attr('y', this.yRange)
                .attr('width', function(d) {
                    return d.width;
                })
                .attr('height', 0)
                .attr('fill', function(d) {
                    return d.color;
                })
                .transition()
                .duration(500)
                .attr('y', function(d) {
                    return d.y;
                })
                .attr('height', function(d) {
                    return d.height;
                });
            return rectList;
        },
        __changeRect: function() {
            for(var i=0;i<this.rectList.length;i++) {
                var rectArr = this.rectList[i];
                for(var k=0;k<rectArr.length;k++) {
                    d3.select(rectArr[k])
                        .transition()
                        .duration(500)
                        .attr('x', function(d) {
                            return d.x;
                        })
                        .attr('y', function(d) {
                            return d.y;
                        })
                        .attr('width', function(d) {
                            return d.width;
                        })
                        .attr('height', function(d) {
                            return d.height;
                        });
                }
            }
        },
        __legendReady: function() {
            var _self = this;
            this.on('legendMouseenter.bar', function(name) {
                // 取出对应rect的idx
                var idx = 0;
                for(var i=0;i<_self.barSeries.length;i++) {
                    if(_self.barSeries[i].name == name) {
                        idx = _self.barSeries[i].idx;
                        break;
                    }
                }
                // 把对应的矩形透明度设成0.5
                _self.rectList.forEach(function(rectArr) {
                     d3.select(rectArr[idx])
                         .attr('fill-opacity', 0.5);
                });
            });
            this.on('legendMouseleave.bar', function(name) {
                // 取出对应rect的idx
                var idx = 0;
                for(var i=0;i<_self.barSeries.length;i++) {
                    if(_self.barSeries[i].name == name) {
                        idx = _self.barSeries[i].idx;
                        break;
                    }
                }
                // 把对应的矩形透明度的属性去掉
                _self.rectList.forEach(function(rectArr) {
                    d3.select(rectArr[idx])
                        .attr('fill-opacity', null);
                });
            });
            this.on('legendClick.bar', function(nameList) {
                // 先把所有series的isShow属性设为false
                _self.barSeries.forEach(function(series) {
                    series.isShow = false;
                });
                // 根据nameList把其中对应的series的isShow属性设为true
                for(var i=0;i<nameList.length;i++) {
                    for(var k=0;k<_self.barSeries.length;k++) {
                        if(nameList[i] == _self.barSeries[k].name) {
                            _self.barSeries[k].isShow = true;
                            break;
                        }
                    }
                }
                // 根据新的isShow配置进行计算
                _self.__changeRectsData();
                _self.__changeRect();
            });
        },
        __tooltipReady: function() {
            var _self = this;
            if(this.config.tooltip.trigger == 'axis') {
                this.on('tooltipSectionChange.bar', function (sectionNumber, callback, format) {
                    var htmlStr = '';
                    _self.barSeries.forEach(function (series) {
                        if (!series.isShow) {
                            return;
                        } else {
                            var formatter = series.formatter || format || defaultFormatter;
                            htmlStr += formatter(series.name, series.data[sectionNumber]);
                        }
                    })
                    callback(htmlStr);
                });
            } else {
                //TODO 待添加trigger为 'item'时的tooltip事件
            }
        }
    });
    function defaultFormatter(name, value) {
        var htmlStr = '';
        htmlStr += "<div>" + name + "：" + value + "</div>";
        return htmlStr;
    }
}(window))