/**
 * @file 柱状图
 * @author chenwubai.cx@gmail.com
 */

(function (xCharts, d3) {
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建bar构造函数
    function bar(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'bar');
    }

    // 在xCharts中注册bar构造函数
    xCharts.charts.extend({bar: bar});
    // 从父类Chart里继承一系列的方法
    utils.inherits(bar, Chart);

    bar.prototype.extend = xCharts.extend;
    bar.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _self = this;
            if (!this.barSeries) {
                // 提出type为bar的series的子元素对象

                // 按stack分类,没有stack的话默认

                // bar的全局配置
                var globalBarConfig = utils.merage(barDefaultConfig(), this.config.bar);
                this.globalBarConfig = globalBarConfig;

                var barSeries = {};
                var xAxisData = this.config.xAxis[0].data;
                // 保存未分类的值
                var seriesList = [];
                for (var i = 0; i < series.length; i++) {
                    if (series[i].type == 'bar') {
                        var serie = __correctConfig(series[i], globalBarConfig);
                        var stack = serie.stack || ('%bar' + i);
                        serie.isShow = serie.legendShow === false ? false : true;
                        // 转化为列表
                        serie.labelList = labelToArray(xAxisData, serie.label);

                        // 为了让没有stack有默认值
                        serie.stack = stack;

                        barSeries[stack] = barSeries[stack] || [];
                        barSeries[stack].push(serie);

                        // 添加颜色值
                        serie.color = this.getColor(serie.idx);
                        seriesList.push(serie);
                    }
                }
                // 给每种柱状添加颜色值
                // this.barSeries.forEach(function (series) {
                //     series.color = _self.getColor(series.idx);
                //     series.isShow = true;
                // });

                this.barSeries = barSeries;
                this.seriesList = seriesList;
            }


            // 用变量存储messageCenter里的一些信息，方便后面使用
            this.xAxisScale = messageCenter.xAxisScale;
            this.yAxisScale = messageCenter.yAxisScale;

            // TODO 这里暂时只考虑柱状图都在一个x轴和y轴上进行绘制，且x轴在下方
            for (var i = 0; i < this.xAxisScale.length; i++) {
                // TODO 这个判断条件是否靠谱待调研
                if (this.xAxisScale[i].scaleType === 'barCategory') {
                    this.barXScale = this.xAxisScale[i];
                    break;
                }
            }


            this.barYScale = this.yAxisScale[0];

            // 获取每组矩形容器的左上角坐标以及其内的矩形左上角的坐标、宽度和高度
            this.rectsData = __getDefaultData.apply(this);
            // 如果有series的isShow为false，则重新计算每组矩形的坐标和宽高
            for (var i = 0; i < this.seriesList.length; i++) {
                if (!this.seriesList[i].isShow) {
                    __changeRectsData.apply(this);
                    break;
                }
            }
        },
        render: function (animationEase, animationTime) {

            // 添加柱状图容器
            this.bar = __renderBarWrapper.apply(this);

            // 添加背景对比
            this.bgRect = __renderBgRect.apply(this);


            // 添加每组矩形的容器
            this.rectWrapperList = __renderRectWrapper.apply(this);
            // 添加柱状
            this.rectList = __renderRect.apply(this, [animationEase, animationTime]);

            // 添加label,业务相关
            this.labelList = __renderLabel.apply(this);

            // 添加文字
            this.textList = __renderText.apply(this);


        },
        ready: function () {
            if (this.mobileMode) {
                this.mobileReady();
            } else {
                if (this.config.legend && this.config.legend.show) {
                    __legendReady.apply(this);
                }
                if (this.config.tooltip && this.config.tooltip.show) {
                    __tooltipReady.apply(this);
                }
            }
        },
        _reRenderBars: function (nameList) {
            var animationConfig = this.config.animation;
            // 先把所有series的isShow属性设为false
            this.barYScale = this.messageCenter.yAxisScale[0];
            var keys = Object.keys(this.barSeries);

            for (var i = 0; i < keys.length; i++) {
                var series = this.barSeries[keys[i]];
                series.forEach(function (series) {
                    series.isShow = false;
                });
            }

            // 根据nameList把其中对应的series的isShow属性设为true
            for (var i = 0; i < nameList.length; i++) {
                for (var k = 0; k < this.seriesList.length; k++) {
                    if (nameList[i] == this.seriesList[k].name) {
                        this.seriesList[k].isShow = true;
                        break;
                    }
                }
            }
            // 根据新的isShow配置进行计算
            __changeRectsData.apply(this);
            __renderRect.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
            __renderLabel.apply(this);
            __renderText.apply(this);
        },
        _tooltipSectionChange: function () {
            var _this = this;
            this.on('tooltipSectionChange.bar', function (sectionNumber, callback, format) {
                var htmlStr = '';
                _this.seriesList.forEach(function (series) {
                    if (!series.isShow) {
                        return;
                    } else {
                        var formatter = series.formatter || format || defaultFormatter;
                        htmlStr += formatter(series.name, series.data[sectionNumber]);
                    }
                });
                callback(htmlStr);
            });
        }
    });

    function __renderBgRect() {
        var that = this;
        var bgRect = this.bar
            .selectAll('.xc-bar-bg-rect')
            .data(function () {
                return that.backgroundRectList;
            });
        bgRect = bgRect.enter('rect')
            .append('rect')
            .classed('xc-bar-bg-rect', true)
            .merge(bgRect);

        bgRect.attr('x', function (d) {
            return d.x;
        })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', function (d) {
                return d.height;
            })
            .attr('fill', function (d) {
                return d.fill;
            })
            .attr('opacity', function (d) {
                return d.opacity;
            })

    }

    function __renderText() {
        var textList = this.rectWrapperList
            .selectAll('.xc-bar-text')
            .data(function (d) {
                return d.rectsData
            });
        textList = textList.enter()
            .append('text')
            .classed('xc-bar-text', true)
            .merge(textList);

        textList.attr('x', function (d) {
            return d.text.x;
        })
            .attr('y', function (d) {
                return d.text.y;
            })
            .attr('text-anchor', 'middle')
            .attr('fill', function (d) {
                return d.text.color;
            })
            .attr('font-size', function (d) {
                return d.text.fontSize;
            })
            .attr('opacity', function (d) {
                if (d.text.show === false) {
                    return 0;
                }

                return 1;
            })
            .text('');
        this.on('drawBarEnd.barText', function () {
            textList.text(function (d) {

                // 不显示情况 空串即可
                if (d.text.show === false) {
                    return '';
                }

                return d.text.value;
            })
        });

        return textList;

    }

    function __correctConfig(serie, globalConfig) {

        var defaultCon = utils.merage(defaultConfig(), globalConfig);

        // 合并默认值
        return utils.merage(defaultCon, serie);
    }

    function __getDefaultData() {
        var paddingOuter = this.globalBarConfig.paddingOuter;
        var paddingInner = this.globalBarConfig.paddingInner;

        this.barXScale.paddingOuter(paddingOuter);
        this.barXScale.paddingInner(paddingInner);
        var rangeBand = this.barXScale.bandwidth(),
            rangeBandNum = this.barXScale.domain().length,
            xRange = this.barXScale.range(),
            yRange = this.barYScale.range();

        var stackGap = 2;

        this.xRange = xRange[1] - xRange[0];
        this.yRange = yRange[0] - yRange[1];
        var bgWidth = this.barXScale.step();
        var outWidth = bgWidth * paddingOuter;
        this.outWidth = outWidth;
        var outPadding = (this.xRange - rangeBand * rangeBandNum) / 21;
        // 定义同组矩形之间的间距
        var rectMargin = this.globalBarConfig.barGap;
        // 假设所有矩形均可见的情况下，计算矩形宽度
        var seriesKeys = Object.keys(this.barSeries);
        var seriesLength = seriesKeys.length;
        var rectWidth = (rangeBand - (seriesLength + 1) * rectMargin) / seriesLength;
        var rectGroupData = [],
            tempX = outPadding;
        var backgroundRectList = [];
        var bgX = 0;

        for (var i = 0; i < rangeBandNum; i++) {
            // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
            var rectsData = [];
            var labelData = [];
            var rectX = rectMargin;

            backgroundRectList.push({
                x: bgX,
                y: 0,
                height: this.yRange,
                width: bgWidth,
                opacity: i % 2 === 0 ? this.globalBarConfig.background.oddOpacity : this.globalBarConfig.background.evenOpacity,
                fill: i % 2 === 0 ? this.globalBarConfig.background.oddColor : this.globalBarConfig.background.evenColor
            });

            if (i === 0) {
                backgroundRectList[i].width += outWidth;
                backgroundRectList[i].x -= outWidth;
            }

            if (i === rangeBandNum - 1) {
                backgroundRectList[i].width += outWidth;
            }

            bgX += bgWidth;

            for (var k = 0; k < seriesLength; k++) {

                // 处理每一个柱子的x,y坐标和宽度高度
                var key = seriesKeys[k];
                var series = this.barSeries[key];
                var rects = [];
                var bottomY = this.yRange;
                var bottomRect = true;
                for (var l = 0; l < series.length; l++) {
                    var serie = series[l];
                    var labelObj = serie.labelList[i];
                    var parsedData = parseFloat(serie.data[i]);
                    if (parsedData !== parsedData) {
                        parsedData = 0;
                    }
                    var tempRect = {
                        x: rectX,
                        width: rectWidth > 0 ? rectWidth : 0,
                        height: this.yRange - this.barYScale(parsedData),
                        color: serie.color,
                        idx: serie.idx
                    };

                    // 如果label存在,最小高度不能小于5
                    if (labelObj && tempRect.height < 5) {
                        tempRect.height = 5;
                    }

                    tempRect.y = bottomY - tempRect.height;

                    if (tempRect.y < 0) {

                        tempRect.height += tempRect.y;

                        tempRect.y = 0;
                    }

                    if (tempRect.height > 0 && bottomRect === false) {
                        // 最底层的柱子不需要修正高度
                        tempRect.height -= stackGap;
                    } else if (tempRect.height > 0) {
                        bottomRect = false;
                    }


                    // 中心显示文字
                    tempRect.text = {
                        x: tempRect.x + tempRect.width / 2,
                        y: tempRect.y + tempRect.height / 2 + serie.textStyle.fontSize / 2,
                        value: serie.textFormat(serie.data[i]),
                        color: serie.textStyle.color,
                        fontSize: serie.textStyle.fontSize,
                        show: true
                    };

                    tempRect.text.show = serie.textShow;

                    if (tempRect.text.fontSize + 2 >= tempRect.height) {
                        tempRect.text.show = false;
                    }

                    // 特殊处理高度为0的且不堆积的情况,将0显示出来
                    if (tempRect.height === 0 && series.length === 1) {
                        tempRect.text.show = true;
                        tempRect.text.y -= tempRect.text.fontSize/1.5;
                    }

                    if (labelObj) {

                        // 最小显示高度5
                        var minHeight = 5;
                        var labelHeight = 14;
                        var fontSzie = 12;
                        var labelWidth = labelObj.value.length * fontSzie + 10;


                        var label = {
                            x: tempRect.x,
                            y: tempRect.y,
                            height: labelHeight,
                            width: labelWidth,
                            color: labelObj.color,
                            text: {
                                value: labelObj.value,
                                x: tempRect.x + labelWidth / 2,
                                y: tempRect.y + labelHeight / 2 + fontSzie / 2 - 2,
                                fontSize: fontSzie
                            }
                        };

                        if (tempRect.height / 2 < (tempRect.text.fontSize / 2 + label.height)) {

                            // 这种情况是已经没有什么位置给label显示了
                            label.showValue = false;
                            label.height = minHeight;
                        } else {
                            label.showValue = true;
                        }

                        if (labelWidth > tempRect.width) {
                            label.showValue = false;
                            label.width = tempRect.width / 2;
                        }

                        labelData.push(label);
                    }


                    bottomY = tempRect.y;
                    rects.push(tempRect);
                }


                rectsData = rectsData.concat(rects);
                rectX += rectWidth + rectMargin;
            }
            // 每组矩形容器的坐标以及每组矩形的坐标和宽高
            var tempData = {
                x: tempX,
                y: 0,
                rectsData: rectsData,
                labelData: labelData
            };
            rectGroupData.push(tempData);
            tempX += rangeBand;
        }
        this.backgroundRectList = backgroundRectList;
        return rectGroupData;
    }

    function __changeRectsData() {
        var rangeBand = this.barXScale.bandwidth();
        // 定义同组矩形之间的间距
        var rectMargin = this.globalBarConfig.barGap;
        var stackGap = 2;

        // 根据矩形是否可见，求出实际的矩形宽度
        var visibleStack = {};
        var visibleSeriesLength = 0;
        for (var i = 0; i < this.seriesList.length; i++) {
            if (this.seriesList[i].isShow) {
                visibleStack[this.seriesList[i].stack] = true;
            }
        }

        visibleSeriesLength = Object.keys(visibleStack).length;

        var realRectWidth = (rangeBand - (visibleSeriesLength + 1) * rectMargin) / visibleSeriesLength;

        for (var i = 0; i < this.rectsData.length; i++) {
            // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
            // var tempRect = this.rectsData[i].rectsData;
            var rectX = rectMargin;
            var labelData = [];
            var stackKeys = Object.keys(this.barSeries);
            var rectsList = [];
            for (var k = 0; k < stackKeys.length; k++) {
                // 根据矩形是否显示重新对一些矩形的坐标和宽高进行计算并赋值

                var series = this.barSeries[stackKeys[k]];
                var rects = [];
                var bottomY = this.yRange;
                var bottomRect = true;
                for (var l = 0; l < series.length; l++) {
                    var serie = series[l];
                    var labelObj = serie.labelList[i];
                    var parsedData = parseFloat(serie.data[i]);
                    if (parsedData !== parsedData) {
                        parsedData = 0;
                    }

                    if (serie.isShow) {
                        // tempRect[k].x = rectX;
                        // tempRect[k].y = this.barYScale(this.barSeries[k].data[i]);
                        // tempRect[k].width = realRectWidth;
                        // tempRect[k].height = this.yRange - this.barYScale(this.barSeries[k].data[i]);
                        // rectX += realRectWidth + rectMargin;

                        var tempRect = {
                            x: rectX,
                            width: realRectWidth,
                            height: this.yRange - this.barYScale(parsedData),
                            color: serie.color,
                            idx: serie.idx
                        };

                        // 如果label存在,最小高度不能小于5
                        if (labelObj && tempRect.height < 5) {
                            tempRect.height = 5;
                        }

                        tempRect.y = bottomY - tempRect.height;

                        if (tempRect.y < 0) {

                            tempRect.height += tempRect.y;

                            tempRect.y = 0;
                        }

                        if (tempRect.height > 0 && bottomRect === false) {
                            // 最底层的柱子不需要修正高度
                            tempRect.height -= stackGap;
                        } else if (tempRect.height > 0) {
                            bottomRect = false;
                        }

                        tempRect.text = {
                            x: tempRect.x + tempRect.width / 2,
                            y: tempRect.y + tempRect.height / 2 + serie.textStyle.fontSize / 2,
                            value: serie.textFormat(serie.data[i]),
                            color: serie.textStyle.color,
                            fontSize: serie.textStyle.fontSize,
                            show: true
                        };

                        // 中心显示文字
                        tempRect.text = {
                            x: tempRect.x + tempRect.width / 2,
                            y: tempRect.y + tempRect.height / 2 + serie.textStyle.fontSize / 2,
                            value: serie.textFormat(serie.data[i]),
                            color: serie.textStyle.color,
                            fontSize: serie.textStyle.fontSize,
                            show: true
                        };
                        tempRect.text.show = serie.textShow;
                        if (tempRect.text.fontSize + 2 >= tempRect.height) {
                            tempRect.text.show = false;
                        }

                        // 特殊处理高度为0的且不堆积的情况,将0显示出来
                        if (tempRect.height === 0 && series.length === 1) {
                            tempRect.text.show = true;
                            tempRect.text.y -= tempRect.text.fontSize/1.5;
                        }


                        if (labelObj) {

                            // 最小显示高度5
                            var minHeight = 5;
                            var labelHeight = 14;
                            var fontSzie = 12;
                            var labelWidth = labelObj.value.length * fontSzie + 10;


                            var label = {
                                x: tempRect.x,
                                y: tempRect.y,
                                height: labelHeight,
                                width: labelWidth,
                                color: labelObj.color,
                                text: {
                                    value: labelObj.value,
                                    x: tempRect.x + labelWidth / 2,
                                    y: tempRect.y + labelHeight / 2 + fontSzie / 2 - 2,
                                    fontSize: fontSzie
                                }
                            };

                            if (tempRect.height / 2 < (tempRect.text.fontSize / 2 + label.height)) {

                                // 这种情况是已经没有什么位置给label显示了
                                label.showValue = false;
                                label.height = minHeight;
                            } else {
                                label.showValue = true;
                            }

                            if (labelWidth > tempRect.width) {
                                label.showValue = false;
                                label.width = tempRect.width / 2;
                            }

                            labelData.push(label);
                        }


                        bottomY = tempRect.y;
                        rects.push(tempRect);
                    } else {
                        // tempRect[k].y = this.yRange;
                        // tempRect[k].height = 0;

                        var tempRect = {
                            x: rectX,
                            width: 0,
                            height: 0,
                            color: serie.color,
                            idx: serie.idx
                        };

                        tempRect.text = {
                            x: 0,
                            y: 0,
                            value: 0,
                            color: serie.textStyle.color,
                            fontSize: 0,
                            show: false
                        };

                        tempRect.y = bottomY;
                        rects.push(tempRect);

                    }

                }

                var maxWidth = 0;
                var maxMargin = 0;
                for (var index = 0; index < rects.length; index++) {
                    if (rects[index].width > 0) {
                        maxWidth = rects[index].width;
                        maxMargin = rectMargin;
                        break;
                    }
                }

                rectX += maxWidth + maxMargin;
                rectsList = rectsList.concat(rects);

            }

            this.rectsData[i].rectsData = rectsList;
            this.rectsData[i].labelData = labelData;
        }
    }

    function __renderLabel() {

        // 添加rect
        var labelList = this.rectWrapperList.selectAll('.xc-bar-label-rect')
            .data(function (d) {
                return d.labelData;
            });

        labelList.exit().remove();
        labelList = labelList.enter()
            .append('rect')
            .classed('xc-bar-label-rect', true)
            .merge(labelList);


        labelList.attr('x', function (d) {
            return d.x;
        })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', function (d) {
                return d.height;
            })
            .attr('fill', 'transparent');


        // 添加text
        var textList = this.rectWrapperList.selectAll('.xc-bar-label-text')
            .data(function (d) {
                return d.labelData;
            });
        textList.exit().remove();
        textList = textList.enter()
            .append('text')
            .classed('xc-bar-label-text', true)
            .merge(textList);


        textList.attr('x', function (d) {
            return d.text.x;
        })
            .attr('y', function (d) {
                return d.text.y;
            })
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', function (d) {
                return d.text.fontSize;
            })
            .text('');

        this.on('drawBarEnd.barLabel', function () {
            textList.text(function (d) {

                if (d.showValue === false) {
                    return '';
                }

                return d.text.value;
            });
            labelList.attr('fill', function (d) {
                return d.color;
            });
        });


    }

    function __renderBarWrapper() {
        var that = this;
        var bar = this.main
            .selectAll('.xc-bar')
            .data([1]);
        bar = bar.enter()
            .append('g')
            .classed('xc-bar', true)
            .attr('transform', function () {
                return 'translate(' + that.outWidth + ',0)';
            })
            .merge(bar);
        return bar;
    }

    function __renderRectWrapper() {
        var rectWrapperList = this.bar.selectAll('.xc-bar-rectWrapper')
            .data(this.rectsData);
        rectWrapperList = rectWrapperList.enter()
            .append('g')
            .classed('xc-bar-rectWrapper', true)
            .merge(rectWrapperList);
        rectWrapperList.attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
        return rectWrapperList;
    }

    function __renderRect(animationEase, animationTime) {
        var that = this;
        var rectList = this.rectWrapperList
            .selectAll('.xc-bar-rect')
            .data(function (d) {
                return d.rectsData;
            });
        rectList = rectList.enter()
            .append('rect')
            .classed('xc-bar-rect', true)
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', this.yRange)
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', 0)
            .attr('fill', function (d) {
                return d.color;
            })
            .attr('data-index', function (d) {
                return d.idx;
            })
            // 没办法只控制rect的某一个角,暂时不用rx,ry,后期可以考虑用path来画
            // 通过js设置rx和ry是因为
            // .attr('rx', 5)
            // .attr('ry', 5)
            .merge(rectList);
        var transition = rectList.transition()
            .duration(animationTime)
            .ease(animationEase)
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('width', function (d) {
                return d.width;
            })
            .attr('height', function (d) {
                return d.height;
            });
        var flag = false;
        transition.on('end.bar', function () {
            if (flag === false) {
                that.fire('drawBarEnd')
            } else {
                flag = true;
            }
        });
        return rectList;
    }

    function __legendReady() {
        __legendMouseenter.apply(this);
        __legendMouseleave.apply(this);
        __legendClick.apply(this);
    }

    function __legendMouseenter() {
        var _this = this;
        this.on('legendMouseenter.bar', function (name) {
            // 取出对应rect的idx
            var idx = 0;
            for (var i = 0; i < _this.seriesList.length; i++) {
                if (_this.seriesList[i].name == name) {
                    idx = _this.seriesList[i].idx;
                    break;
                }
            }
            // 把对应的矩形透明度设成0.5
            _this.rectList._groups.forEach(function (rectArr) {

                rectArr.forEach(function (rect) {
                    if (rect.__data__.idx === idx) {
                        d3.select(rect)
                            .attr('fill-opacity', 0.5);
                    }
                });

            });
        });
    }

    function __legendMouseleave() {
        var _this = this;
        this.on('legendMouseleave.bar', function (name) {
            // 取出对应rect的idx
            var idx = 0;
            for (var i = 0; i < _this.seriesList.length; i++) {
                if (_this.seriesList[i].name == name) {
                    idx = _this.seriesList[i].idx;
                    break;
                }
            }
            // 把对应的矩形透明度的属性去掉
            _this.rectList._groups.forEach(function (rectArr) {

                rectArr.forEach(function (rect) {
                    if (rect.__data__.idx === idx) {
                        d3.select(rect)
                            .attr('fill-opacity', null);
                    }
                });


            });
        });
    }

    function __legendClick() {
        var _this = this;
        this.on('legendClick.bar', function (nameList) {
            _this._reRenderBars(nameList);
        });
    }

    function __tooltipReady() {
        if (this.config.tooltip.trigger == 'axis') {
            this._tooltipSectionChange();
        } else {
            //TODO 待添加trigger为 'item'时的tooltip事件
        }
    }

    function defaultFormatter(name, value) {
        var htmlStr = '';
        htmlStr += "<div>" + name + "：" + value + "</div>";
        return htmlStr;
    }


    /**
     * label对象转化为数据,和xAxis.data一一对应
     * @param data
     * @param label
     */
    function labelToArray(data, label) {
        label = label || {};
        var list = [];
        var keys = Object.keys(label);
        for (var i = 0; i < data.length; i++) {
            list[i] = null;
            for (var j = 0; j < keys.length; j++) {
                var obj = label[keys[j]];
                if (obj.xAxis == data[i]) {
                    list[i] = obj;
                    break;
                }
            }
        }
        return list;
    }

    function defaultConfig() {
        /**
         * @var bar
         * @type Object
         * @extends xCharts.series
         * @description 柱状图配置项
         */
        var config = {
            /**
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'bar'
             * @extends xCharts.series.bar
             */
            type: 'bar',
            /**
             * @var name
             * @type String
             * @description 数据项名称
             * @extends xCharts.series.bar
             */
            // name: '',
            /**
             * @var data
             * @type Array
             * @description 柱状图数据项对应的各项指标的值的集合
             * @extends xCharts.series.bar
             */
            // data: [],
            /**
             * @var formatter
             * @type function
             * @description 数据项信息展示文本的格式化函数
             * @extends xCharts.series.bar
             */
            // formatter: function(name, value) {},
            /**
             * @var
             * @type Number|String
             * @description 堆栈柱状图使用,相同stack会被堆叠为一个柱子
             * @extends xCharts.series.bar
             */
            // stack: 'one',
            /**
             * @var label
             * @type Array
             * @description 添加左上角label
             * @extends xCharts.series.bar
             * @example
             *  [{
             *      xAxis: '语文',
             *      value:'下降',
             *       color:'#344c09'
             *  }]
             */
            // label: [{
            /**
             * @var xAxis
             * @type String
             * @description 与xAxis.data值对应
             * @extends xCharts.series.bar.label
             */
            // xAxis: '语文',
            /**
             * @var value
             * @type String
             * @description label的显示文本
             * @extends xCharts.series.bar.label
             */
            // value: '语文',
            /**
             * @var color
             * @type String
             * @description 文本的颜色
             * @extends xCharts.series.bar.label
             */
            // color: '#fff',
            // }]
        };
        return config;
    }

    // TODO 设置全局的bar变量,控制间隔啊之类的
    function barDefaultConfig() {
        /**
         * @var bar
         * @type Object
         * @extends xCharts
         * @description 柱状图通用配置项
         */
        var config = {
            /**
             * @var textShow
             * @type Boolean
             * @extends xCharts.bar
             * @description 是否在柱状图中心显示文字
             * @default false
             */
            textShow: false,
            /**
             * @var textFormat
             * @type Function
             * @extends xCharts.bar
             * @description 格式化文字
             * @example
             *  function (data, index) {
             *       return value;
             *   },
             */
            textFormat: function (data, index) {
                return data;
            },
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.bar
             * @description 文字样式
             */
            textStyle: {
                /**
                 * @var fontSize
                 * @type Number
                 * @extends xCharts.bar.textStyle
                 * @description 文字大小
                 * @default 14
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @type String
                 * @extends xCharts.bar.textStyle
                 * @description 文字颜色
                 * @default #fff
                 */
                color: '#fff'
            },
            /**
             * @var hoverOpacity
             * @type Number
             * @extends xCharts.bar
             * @description 鼠标响应legend透明度
             * @default 0.5
             */
            hoverOpacity: 0.5,
            /**
             * @var label
             * @type Array
             * @extends xCharts.bar
             * @description 类似于小tip
             */
            // label:[{
            /**
             * @var xAxis
             * @type Any
             * @extends xCharts.bar.label
             * @description 和xAxis轴上的data对应
             */
            // xAxis: 1,
            /**
             * @var value
             * @type Any
             * @extends xCharts.bar.label
             * @description 显示文字
             */
            // value: 1,
            /**
             * @var color
             * @type Any
             * @extends xCharts.bar.label
             * @description 背景色
             */
            // color: #fff,
            // }],
            /**
             * @var barGap
             * @type Number
             * @extends xCharts.bar
             * @description 组内每个bar之间的间隔
             * @default 10
             */
            barGap: 10,
            /**
             * @var legendShow
             * @type Boolean
             * @extends xCharts.bar
             * @description 控制legend默认显示情况,false 默认不显示
             * @default true
             */
            legendShow: true,
            /**
             * @var paddingOut
             * @type Number
             * @extends xCharts.bar
             * @description 柱状图最左边和最右边距离Y坐标的间距,越大空白越大
             * @default 0.05
             * @value 0-1
             */
            paddingOuter: 0.05,
            /**
             * @var paddingInner
             * @type Number
             * @extends xCharts.bar
             * @description 柱状图每组柱子与柱子之间的间距,越大距离越大,如果想控制组内柱子的间距请使用barGap
             * @default 0
             * @value 0-1
             */
            paddingInner: 0,
            /**
             * @var background
             * @type Object
             * @extends xCharts.bar
             * @description 每一组柱子的背景
             */
            background: {
                /**
                 * @var enable
                 * @type Boolean
                 * @extends xCharts.bar.background
                 * @description 是否显示背景区分
                 * @default true
                 */
                enable: true,
                /**
                 * @var oddOpacity
                 * @type Number
                 * @extends xCharts.bar.background
                 * @description 奇数列颜色透明度
                 * @default 0.8
                 */
                oddOpacity: 0.8,
                /**
                 * @var oddColor
                 * @type String
                 * @extends xCharts.bar.background
                 * @description 奇数列颜色
                 * @default #eee
                 */
                oddColor: '#eee',
                /**
                 * @var evenOpacity
                 * @type Number
                 * @extends xCharts.bar.background
                 * @description 偶数列颜色透明度
                 * @default 0.4
                 */
                evenOpacity: 0.4,
                /**
                 * @var evenColor
                 * @type String
                 * @extends xCharts.bar.background
                 * @description 偶数列颜色
                 * @default #eee
                 */
                evenColor: '#eee'
            }
        };

        return config;
    }

}(xCharts, d3));