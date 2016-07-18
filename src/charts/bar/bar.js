/**
 * @file 柱状图
 * @author chenwubai.cx@gmail.com
 */
(function(xCharts, d3) {
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
            var _self = this;
            if(!this.barSeries) {
                // 提出type为bar的series的子元素对象
                // 提出type为bar的series的子元素对象
                this.barSeries = [];
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'bar') {
                        this.barSeries.push(utils.copy(series[i], true));
                    }
                }
                // 给每种柱状添加颜色值
                this.barSeries.forEach(function(series) {
                    series.color = _self.getColor(series.idx);
                    series.isShow = true;
                });
            }

            __correctConfig.apply(this);
            // 用变量存储messageCenter里的一些信息，方便后面使用
            this.xAxisScale = messageCenter.xAxisScale;
            this.yAxisScale = messageCenter.yAxisScale;

            // TODO 这里暂时只考虑柱状图都在一个x轴和y轴上进行绘制，且x轴在下方
            for(var i=0;i<this.xAxisScale.length;i++) {
                // TODO 这个判断条件是否靠谱待调研
                if(this.xAxisScale[i].scaleType === 'barCategory') {
                    this.barXScale = this.xAxisScale[i];
                    break;
                };
            }
            this.barYScale = this.yAxisScale[0];

            // 获取每组矩形容器的左上角坐标以及其内的矩形左上角的坐标、宽度和高度
            this.rectsData = __getDefaultData.apply(this);
            // 如果有series的isShow为false，则重新计算每组矩形的坐标和宽高
            for(var i=0;i<this.barSeries.length;i++) {
                if(!this.barSeries[i].isShow) {
                    __changeRectsData.apply(this);
                    break;
                }
            }
        },
        render: function(animationEase, animationTime) {
            // 添加柱状图容器
            this.bar = __renderBarWrapper.apply(this);
            // 添加每组矩形的容器
            this.rectWrapperList = __renderRectWrapper.apply(this);
            // 添加柱状
            this.rectList = __renderRect.apply(this, [animationEase, animationTime]);
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
        getTooltipPosition: function (tickIndex) {
            var rangeBand = this.barXScale.bandwidth(),
                rangeBandNum = this.barXScale.domain().length,
                xRange = this.barXScale.range();
            var outPadding = (this.xRange - rangeBand*rangeBandNum)/2;
            return xRange[0] + outPadding + tickIndex*rangeBand + rangeBand/2;
        },
        _reRenderBars: function(nameList) {
            var animationConfig = this.config.animation;
            // 先把所有series的isShow属性设为false
            this.barSeries.forEach(function(series) {
                series.isShow = false;
            });
            // 根据nameList把其中对应的series的isShow属性设为true
            for(var i=0;i<nameList.length;i++) {
                for(var k=0;k<this.barSeries.length;k++) {
                    if(nameList[i] == this.barSeries[k].name) {
                        this.barSeries[k].isShow = true;
                        break;
                    }
                }
            }
            // 根据新的isShow配置进行计算
            __changeRectsData.apply(this);
            __renderRect.apply(this, [animationConfig.animationEase, animationConfig.animationTime]);
        },
        _tooltipSectionChange: function() {
            var _this = this;
            this.on('tooltipSectionChange.bar', function (sectionNumber, callback, format) {
                var htmlStr = '';
                _this.barSeries.forEach(function (series) {
                    if (!series.isShow) {
                        return;
                    } else {
                        var formatter = series.formatter || format || defaultFormatter;
                        htmlStr += formatter(series.name, series.data[sectionNumber]);
                    }
                })
                callback(htmlStr);
            });
        }
    });
    function __correctConfig() {
        // 合并默认值
        this.barSeries.forEach(function (item) {
            item = utils.merage(defaultConfig(), item);
        });
    }
    function __getDefaultData() {
        var rangeBand = this.barXScale.bandwidth(),
            rangeBandNum = this.barXScale.domain().length,
            xRange = this.barXScale.range(),
            yRange = this.barYScale.range();

        this.xRange = xRange[1] - xRange[0];
        this.yRange = yRange[0] - yRange[1];
        var outPadding = (this.xRange - rangeBand*rangeBandNum)/2;
        // 定义同组矩形之间的间距
        var rectMargin = 10;
        // 假设所有矩形均可见的情况下，计算矩形宽度
        var seriesLength = this.barSeries.length;
        var rectWidth = (rangeBand - (seriesLength+1)*rectMargin)/seriesLength;

        var rectGroupData = [],
            tempX = outPadding;
        for(var i=0;i<rangeBandNum;i++) {
            // 假设所有矩形均可见的情况，求得矩形的坐标和宽高
            var rectsData = [];
            var rectX = rectMargin;
            for(var k=0;k<seriesLength;k++) {
                var tempRect = {
                    x: rectX,
                    y: this.barYScale(this.barSeries[k].data[i]),
                    width: rectWidth > 0 ? rectWidth : 0,
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
    }
    function __changeRectsData() {
        var rangeBand = this.barXScale.bandwidth();
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
    }
    function __renderBarWrapper() {
        var bar = this.main
            .selectAll('.xc-bar')
            .data([1]);
        bar = bar.enter()
            .append('g')
            .classed('xc-bar', true)
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
        rectWrapperList.attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
        return rectWrapperList;
    }
    function __renderRect(animationEase, animationTime) {
        var rectList = this.rectWrapperList
            .selectAll('.xc-bar-rect')
            .data(function(d) {
                return d.rectsData;
            });
        rectList = rectList.enter()
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
            // 通过js设置rx和ry是因为
            .attr('rx', 5)
            .attr('ry', 5)
            .merge(rectList);
        rectList.transition()
            .duration(animationTime)
            .ease(animationEase)
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
        return rectList;
    }
    function __legendReady() {
        __legendMouseenter.apply(this);
        __legendMouseleave.apply(this);
        __legendClick.apply(this);
    }
    function __legendMouseenter() {
        var _this = this;
        this.on('legendMouseenter.bar', function(name) {
            // 取出对应rect的idx
            var idx = 0;
            for(var i=0;i<_this.barSeries.length;i++) {
                if(_this.barSeries[i].name == name) {
                    idx = _this.barSeries[i].idx;
                    break;
                }
            }
            // 把对应的矩形透明度设成0.5
            _this.rectList._groups.forEach(function(rectArr) {
                d3.select(rectArr[idx])
                    .attr('fill-opacity', 0.5);
            });
        });
    }
    function __legendMouseleave() {
        var _this = this;
        this.on('legendMouseleave.bar', function(name) {
            // 取出对应rect的idx
            var idx = 0;
            for(var i=0;i<_this.barSeries.length;i++) {
                if(_this.barSeries[i].name == name) {
                    idx = _this.barSeries[i].idx;
                    break;
                }
            }
            // 把对应的矩形透明度的属性去掉
            _this.rectList._groups.forEach(function(rectArr) {
                d3.select(rectArr[idx])
                    .attr('fill-opacity', null);
            });
        });
    }
    function __legendClick() {
        var _this = this;
        this.on('legendClick.bar', function(nameList) {
            _this._reRenderBars(nameList);
        });
    }
    function __tooltipReady() {
        if(this.config.tooltip.trigger == 'axis') {
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
            // formatter: function(name, value) {}
        }
        return config;
    }
}(xCharts, d3));