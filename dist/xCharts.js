(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by liuyang on 15/10/27.
 * chars的基类
 */
(function(window){

    /**
     * @var series
     * @extends xCharts
     * @type Array
     * @description 包含图表数据
     */

    var xCharts=window.xCharts;
    var utils=xCharts.utils;
    var Component=xCharts.components.Component;
    function Chart(messageCenter,config,type){
        this.width = messageCenter.width;
        this.height = messageCenter.height;
        this.id = messageCenter.id;
        this.getColor = messageCenter.getColor;
        Component.call(this,messageCenter,config,type);
    }

    utils.inherits(Chart,Component);

    Chart.prototype.extend = xCharts.extend;//添加extends函数

    Chart.prototype.extend({
        refresh: function (animationEase, animationTime) {

            //当容器改变时，刷新当前图表
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth;
            this.width = this.messageCenter.width;
            this.height = this.messageCenter.height;
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
        }
    })

    xCharts.charts.extend({Chart:Chart});

}(window))
},{}],2:[function(require,module,exports){
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
            var _self = this;
            if(!this.barSeries) {
                // 提出type为bar的series的子元素对象
                // 提出type为bar的series的子元素对象
                this.barSeries = new Array();
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'bar') {
                        this.barSeries.push(series[i]);
                    }
                }
                // 给每种柱状添加idx，并获取颜色
                this.barSeries.forEach(function(series, i) {
                    series.idx = i;
                    series.color = _self.getColor(i);
                    series.isShow = true;
                });
            }


            // 用变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.margin = messageCenter.margin;
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

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
        render: function(animationEase, animationTime) {
            // 添加柱状图容器
            this.bar = this.__renderBarWrapper();
            // 添加每组矩形的容器
            this.rectWrapperList = this.__renderRectWrapper();
            // 添加柱状
            this.rectList = this.__renderRect(animationEase, animationTime);
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
            var bar;
            if(!this.main.select('.xc-bar').node()) {
                // 初始化加载
                bar = this.main.append('g')
                    .classed('xc-bar', true);
            } else {
                bar = this.main.select('.xc-bar');
            }
            return bar;
        },
        __renderRectWrapper: function() {
            var rectWrapperList;
            if(!this.bar.select('.xc-bar-rectWrapper').node()) {
                rectWrapperList = this.bar.selectAll('.xc-bar-rectWrapper')
                    .data(this.rectsData)
                    .enter()
                    .append('g')
                    .classed('xc-bar-rectWrapper', true)
                    .attr('transform', function(d) {
                        return 'translate(' + d.x + ',' + d.y + ')';
                    });
            } else {
                rectWrapperList = this.bar.selectAll('.xc-bar-rectWrapper')
                    .data(this.rectsData)
                    .attr('transform', function(d) {
                        return 'translate(' + d.x + ',' + d.y + ')';
                    });
            }
            return rectWrapperList;
        },
        __renderRect: function(animationEase, animationTime) {
            var rectList;
            if(!this.rectWrapperList.select('.xc-bar-rect').node()) {
                rectList = this.rectWrapperList
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
                    .duration(animationTime)
                    .ease(animationEase)
                    .attr('y', function(d) {
                        return d.y;
                    })
                    .attr('height', function(d) {
                        return d.height;
                    });
                return rectList;
            } else {
                this.rectWrapperList
                    .selectAll('.xc-bar-rect')
                    .data(function(d) {
                        return d.rectsData;
                    });
                return this.__changeRect(animationEase, animationTime);
            }
        },
        __changeRect: function(animationEase, animationTime) {
            for(var i=0;i<this.rectList.length;i++) {
                var rectArr = this.rectList[i];
                for(var k=0;k<rectArr.length;k++) {
                    d3.select(rectArr[k])
                        .transition()
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
                }
            }
            return this.rectList;
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
                var animationConfig = _self.config.animation;
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
                _self.__changeRect(animationConfig.animationEase, animationConfig.animationTime);
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
        },
        getTooltipPosition: function(tickIndex) {
            var rangeBand = this.barXScale.rangeBand(),
                rangeBandNum = this.barXScale.domain().length,
                xRange = this.barXScale.rangeExtent();
            var outPadding = (this.xRange - rangeBand*rangeBandNum)/2;
            return xRange[0] + outPadding + tickIndex*rangeBand + rangeBand/2;
        }
    });
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
            name: '',
            /**
             * @var data
             * @type Array
             * @description 柱状图数据项对应的各项指标的值的集合
             * @extends xCharts.series.bar
             */
            data: [],
            /**
             * @var formatter
             * @type function
             * @description 数据项信息展示文本的格式化函数
             * @extends xCharts.series.bar
             */
            formatter: function(name, value) {}
        }
        return config;
    }
}(window))
},{}],3:[function(require,module,exports){
/**
 * 漏斗图
 */
(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;
    var d3 = window.d3;
    xCharts.charts.extend({funnel: funnel});
    utils.inherits(funnel, Chart);

    function funnel(messageCenter, config) {
        Chart.call(this, messageCenter, config, 'funnel');
    }

    funnel.prototype.extend = xCharts.extend;
    funnel.prototype.extend({
        init: function (messageCenter, config, type, series) {
            var _this = this;
            _this.series = parseSeries(series, _this);
        },
        render: function (animationEase, animationTime) {
            //注意一个serie就是一个图
            var _this = this;
            var animationConfig = _this.config.animation;

            var funnelGroup = _this.main.selectAll('.xc-funnel-group')
                .data(_this.series);

            funnelGroup.enter().append('g')
                .attr('class', 'xc-funnel-group');
            funnelGroup.exit().remove();//updateSeries时，删除多余的组

            funnelGroup.attr('transform', function (serie) {
                return 'translate(' + serie.xOffset + ',' + serie.yOffset + ')';
            })
            //画区块
            var funnelSection = funnelGroup.selectAll('.xc-funnel-section').data(function (serie) {
                return serie.data;
            });
            funnelSection.enter().append('path')
                .attr('class','xc-funnel-section');

            funnelSection.attr('fill', function (d) {
                    return _this.getColor(d.idx);
                })
                .transition()
                .ease(animationEase)
                .duration(animationTime)
                .attrTween('d', function (d) {
                    this.pathArr = this.pathArr === undefined ? d.pathArr : this.pathArr;
                    var interpolate = d3.interpolate(this.pathArr, d.pathArr);
                    this.pathArr = d.pathArr;
                    return function(t){
                        return buildFunnelPath(interpolate(t));
                    }
                });

            //画label
            var funnelLabel = funnelGroup.selectAll('.xc-funnel-label')
                .data(function (serie) {
                    return serie.data;
                });

            var transitionStr = "opacity "+animationConfig.animationTime+"ms linear";

            funnelLabel.enter().append('g')
                .attr('class', 'xc-funnel-label')
                .style("transition",transitionStr);

            funnelLabel.exit().remove();
            funnelLabel.attr('opacity',function(d){
                    if(d.show==false)
                        return 0;
                    else
                        return 1;
                })
                .transition()
                .ease(animationEase)
                .duration(animationTime)
                .attrTween('transform', function (d) {
                    this.labelPosition = this.labelPosition===undefined? d.labelPosition : this.labelPosition;
                    var interpolate = d3.interpolate(this.labelPosition, d.labelPosition);
                    this.labelPosition = d.labelPosition;
                    return function(t){
                        return 'translate(' + interpolate(t) + ')';
                    }

                })

            var labelLine = funnelLabel.selectAll('.xc-funnel-label-line')
                .data(function (d) {
                    if(d.show!=false)
                        return [d]
                    else
                        return [];
                });

            labelLine.enter().append('path')
                .attr('class', 'xc-funnel-label-line');
            labelLine.attr('d', function (d) {
                    return 'M0,0 L' + d.labelWidth + ',0';
                })
                .attr('stroke', function (d) {
                    return _this.getColor(d.idx);
                });

            var labelText = funnelLabel.selectAll('.xc-funnel-label-text')
                .data(function (d) {
                    if(d.show!=false)
                        return [d]
                    else
                        return [];
                });

            labelText.enter().append('text')
                .attr('class', 'xc-funnel-label-text');
            labelText.text(function (d) {
                    return d.name
                })
                .attr('font-size', 14)
                .attr('x', function (d) {
                    return d.labelWidth + 5;
                })
                .attr('y', '0.2em');

            _this.funnelSection = funnelSection;
        },
        ready: function () {
            this.__legendReady();
            this.__tooltipReady();
        },
        __legendReady: function () {
            var _this = this;
            _this.on('legendMouseenter.funnel', function (name) {
                _this.funnelSection.attr('opacity', function (d) {
                    var op = 1;
                    if (d.name == name) op = d._serie.itemStyle.opacity
                    return op;
                });
            });
            _this.on('legendMouseleave.funnel', function () {
                _this.funnelSection.attr('opacity',1);
            });
            _this.on('legendClick.funnel', function (nameList) {
                var series=legendClickSeries(_this.config.series,nameList);
                var animationConfig = _this.config.animation;
                _this.init(_this.series,_this.config,_this.type,series);
                _this.render(animationConfig.animationEase,animationConfig.animationTime);
            });
        },
        __tooltipReady:function(){
            if (!this.config.tooltip || this.config.tooltip.show===false || this.config.tooltip.trigger=='axis') return;//未开启tooltip
            var _this=this;
            var tooltip = _this.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;
            _this.funnelSection.on('mousemove.funnel',function(data){
                var event=d3.event;
                var x = event.layerX || event.offsetX, y = event.layerY || event.offsetY;
                var formatter = data._serie.formatter||tooltipFormatter||defaultFormatter;

                var title="<p>"+data._serie.name+"</p>";
                tooltip.setTooltipHtml(title+formatter(data.name,data.value, (data.percentage*100).toFixed(1) ));
                tooltip.setPosition([x, y]);

            })
            _this.funnelSection.on('mouseenter.funnel',function(data){
                d3.select(this).attr('opacity',data._serie.itemStyle.opacity);
                tooltip.showTooltip();
            })
            _this.funnelSection.on('mouseleave.funnel',function(){
                d3.select(this).attr('opacity',1);
                tooltip.hiddenTooltip();
            })
        }

    });

    function legendClickSeries(series,nameList){
        series.forEach(function(serie){

            if(serie.type!='funnel') return;

            serie.data.forEach(function(d){
                if(inNameList(d.name,nameList)) d.show=true;
                else d.show=false;
            })
        })
        return series;
    }
    function inNameList(name,nameList){
        for(var i= 0,n;n=nameList[i++];){
            if(name==n)
                return true;
        }
        return false;
    }

    function buildFunnelPath(pathArr) {
        var dStr = 'M';
        dStr += pathArr[0];
        dStr += 'L' + pathArr[1];
        dStr += 'L' + pathArr[2];
        dStr += 'L' + pathArr[3];
        return dStr;
    }

    function parseSeries(series, that) {
        var funnelSeries = []
        for (var i = 0, s; s = series[i++];) {
            //第一步判断是否是漏斗图
            if (s.type != 'funnel') return;
            s = utils.merage(defaultConfig(), s);
            calcWidth(s, that);
            calcPosition(s, that);
            s.funnelPath = funnelPath(s);
            s.data.forEach(function (d, idx) {
                d.idx = d.idx == null ? idx : d.idx;
                d._serie = s;
                d.pathArr = s.funnelPath(idx);

                //计算label的位置
                var labelX = (d.pathArr[0][0] + d.pathArr[1][0]) / 2;
                var labelY = (d.pathArr[0][1] + d.pathArr[2][1]) / 2;
                d.labelPosition = [labelX, labelY];
                //计算label线的长度
                d.labelWidth = d.sectionWidth / 2 + 30;//30是突出多少
            });

            funnelSeries.push(s);
        }
        return funnelSeries;
    }


    function funnelPath(serie) {
        var width = serie.width, height = serie.height, data = serie.data, sort = serie.sort;
        //塔尖向下，从大到小排序，塔尖向上，从小到大排序
        data.sort(function (a, b) {
            var ret = a.value - b.value;
            if (sort == 'top') {
                return ret;
            } else {
                return -ret;
            }
        });
        //计算还有多少区块需要显示
        var length = data.length, maxValue = -Infinity;
        data.forEach(function (d) {
            if (d.show == false) length--;
            maxValue = d3.max([maxValue, parseFloat(d.value)])
        });
        var sectionHeight = height / length;//每个区块的高度
        //计算每个data对应的起点和终点
        var index = sort == 'top' ? 1 : 0,//如果是塔尖向上，则第一个变量的y坐标不是0，而是一个sectionHeigth的高度,该变量是用来计算区块y坐标
            position = [];
        data.forEach(function (d, i) {
            d.maxValue=maxValue;
            d.percentage= parseFloat(d.value) / maxValue;
            if (d.show == false){
                position[i]=undefined;
                return
            };
            var sectionWidth = d.percentage  * width;
            d.sectionWidth = sectionWidth;
            var xOffset = (width - sectionWidth) / 2;
            position[i] = [];
            position[i][0] = [xOffset, sectionHeight * index];
            position[i][1] = [xOffset + sectionWidth, sectionHeight * index];
            index++;
        });

        //保证每个区块是由四个点组成，所以塔尖需要两个重复的点
        if (sort == 'top') {
            var topP = [width / 2, 0];
            position.unshift([topP, topP]);
        } else {
            var bottomP = [width / 2, sectionHeight * index];
            position.push([bottomP, bottomP]);
        }
        //在第一次计算区块坐标时会导致show=false的position位置为undefined，这里根据塔尖方向的不同进行补全
        //主要是为了动画效果,show=false的时候，只是区块高度为0，并不代表没有这个区块
        for (var i = 0, len = position.length; i < len; i++) {
            var p = position[i];
            if (p != undefined) continue;
            var j=1;
            //防止偏移后还是undefined
            while(position[i] === undefined){
                if (sort == 'top')
                    position[i] = position[i - j];
                else
                    position[i] = position[i + j];

                j++;
            }

        }
        return function (idx) {
            //传入一个区块index，获取区块的4个点，依次是左上，又上，右下，左下
            if (idx < 0 || idx >= data.length) {
                console.error('内部代码错误,漏斗图获取区块%d，最大值为%d', idx, data.length);
            }
            var pathPoints = [];
            pathPoints[0] = position[idx][0], pathPoints[1] = position[idx][1];
            pathPoints[2] = position[idx + 1][1], pathPoints[3] = position[idx + 1][0];
            return pathPoints;
        }
    }

    /**
     * 计算每个漏斗图的宽高
     * @param serie
     * @param that
     */
    function calcWidth(serie, that) {
        var width = that.width, heigth = that.height, size = serie.size;
        var fw = size[0];
        if (typeof fw == 'string') {
            if (fw.substr(-1) === '%') {
                var percent = parseFloat(fw) / 100;
                fw = percent * width;
            } else if (fw.substr(-2) == 'px') {
                fw = parseFloat(fw);
            } else {
                fw = parseFloat(fw);
                if (isNaN(fw)) console.error("name:" + serie.name + " size[0] not support");
            }
        } else if (typeof  fw != 'number') {
            console.error("name:" + serie.name + " size[0] not support");
        }

        var fh = size[1];

        if (typeof fh == 'string') {
            if (fh.substr(-1) === '%') {
                var percent = parseFloat(fh) / 100;
                fh = percent * heigth;
            } else if (fh.substr(-2) == 'px') {
                fh = parseFloat(fh);
            } else {
                fh = parseFloat(fh);
                if (isNaN(fh)) console.error("name:" + serie.name + " size[1] not support");
            }
        } else if (typeof  fh != 'number') {
            console.error("name:" + serie.name + " size[1] not support");
        }
        serie.width = fw;
        serie.height = fh;
    }

    /**
     * 计算漏斗图的起始位置
     * @param series
     * @param that
     */
    function calcPosition(serie, that) {
        var width = that.width, height = that.height, x = serie.x, y = serie.y;
        var xOffset = 0, yOffset = 0;
        if (x == 'center') {
            xOffset = (width - serie.width) / 2;
        }
        else if (x == 'right') {
            xOffset = (width - serie.width);
        }
        else if (x.substr(-1) == '%') {
            xOffset = parseFloat(x) / 100 * width;
        } else {
            x = parseFloat(x);
            if (isNaN(x)) console.error("name:" + serie.name + " serie.x not support")
            else xOffset = x;
        }

        if (y == 'middle') {
            yOffset = (height - serie.height) / 2;
        }
        else if ('y' == 'bottom') {
            yOffset = (height - serie.height);
        }
        else if (y.substr(-1) == '%') {
            yOffset = parseFloat(y) / 100 * height;
        } else {
            y = parseFloat(y);
            if (isNaN(y)) console.error("name:" + serie.name + " serie.y not support")
            else yOffset = y;
        }
        serie.xOffset = xOffset;
        serie.yOffset = yOffset;
    }

    function defaultFormatter(name,value,percentage){
        return '<p>'+name + ':&nbsp;' + value+' 占比:'+percentage+'%</p>';
    }

    function defaultConfig() {
        /**
         * @var funnel
         * @type Object
         * @extends xCharts.series
         * @description 漏斗图配置项
         */
        var funnel = {
            /**
             * @var name
             * @type String
             * @extends xCharts.series.funnel
             * @description 漏斗图代表的名字
             */
            name: '漏斗图',
            /**
             * @var type
             * @type String
             * @extends xCharts.series.funnel
             * @default funnel
             * @description 漏斗图指定类型
             */
            type: 'funnel',
            /**
             * @var sort
             * @type String
             * @values 'top'|'down'
             * @default 'down'
             * @description 漏斗图尖角朝向
             * @extends xCharts.series.funnel
             */
            sort: 'down',
            /**
             * @var size
             * @extends xCharts.series.funnel
             * @type Array
             * @description 漏斗图大小
             * @description 可以为百分比，也可以为具体数字，默认单位px
             * @default ['50%', '50%']
             * @example
             *  size:['50%','50%']//百分比
             *  size:[500,'300']//固定宽高
             */
            size: ['50%', '50%'],
            /**
             *  @var x
             *  @extends xCharts.series.funnel
             *  @type String|Number
             *  @default 'center'
             *  @values 'left'|'right'|'center'|Number(单位像素)|Percentage
             *  @description 漏斗图左上角在x轴方向的偏移量
             */
            x: 'center',
            /**
             *  @var y
             *  @extends xCharts.series.funnel
             *  @type String|Number
             *  @default 'center'
             *  @values 'top'|'middle'|'bottom'|Number(单位像素)|Percentage
             *  @description 漏斗图左上角在y轴方向的偏移量
             */
            y: 'middle',
            /**
             * @var data
             * @type Array
             * @extends xCharts.series.funnel
             * @description 一个装有漏斗图数据的二维数组
             * @example
             *   [
             *      {name: '腾讯', value: '80'},
             *      {name: '百度', value: '100'},
             *      {name: '阿里巴巴', value: '60'},
             *      {name: '京东', value: '40'},
             *      {name: '淘宝', value: '20'},
             *   ]
             */
            data: [],
            /**
             * @var formatter
             * @extends xCharts.series.funnel
             * @type Function
             * @description 可以单独定义格式化函数来覆盖tooltip里面的函数
             * @example
             *  formatter: function (name,x,y) {
             *      return '<p>'+name + ':&nbsp;' + value+' 占比:'+percentage+'%</p>';
             *  }
             */
            //formatter:function(){},
            /**
             * @var itemStyle
             * @extends xCharts.series.funnel
             * @type Object
             * @description 每个漏斗图区块的样式
             */
            itemStyle:{
                /**
                 * @var opacity
                 * @extends xCharts.series.funnel.itemStyle
                 * @type Number
                 * @values 0-1
                 * @description 鼠标移入时，变化的透明度
                 * @default 0.5
                 */
                opacity:0.5
            }
        }
        return funnel;
    }

}(window))
},{}],4:[function(require,module,exports){
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

                // 处理折线图数据
                this.series = parseSeries(this,series, config);

                // 判断是否是时间轴
                this.timeModel = config.xAxis[0].type=='time';
            },
            render: function (animationEase, animationTime) {
                this.__renderArea(animationEase, animationTime);
                this.__renderLine(animationEase, animationTime);
                if(!this.timeModel) this.__renderCircle(animationEase, animationTime);
            },
            __renderLine: function (animationEase, animationTime) {
                var id = this.id, _this = this;

                var transitionStr = "opacity "+(animationTime/2)+"ms linear";

                var lineGroup = this.main.selectAll('.xc-line-group').data([_this]);
                lineGroup.enter().append('g').attr('class', 'xc-line-group')
                lineGroup.exit().remove();

                var lineScale = d3.svg.line()
                    .x(function (d) {
                        return d.x;
                    })
                    .y(function (d) {
                        return d.y;
                    });
                var linePath = lineGroup.selectAll('.xc-line-path').data(_this.series)
                linePath.enter().append('path').attr('class', 'xc-line-path').attr('fill', 'none');
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
                    .style("transition",transitionStr)
                    .style("opacity",function(d){
                       if(d.show === false){
                           return 0;
                       } else {
                           return 1;
                       }
                    });

                linePath.transition()
                    .duration(animationTime)
                    .ease(animationEase)
                    .attrTween("d", function (serie) {

                        var ctx = this;
                        if (serie.show === false) return function(){
                            return ctx.linePath;
                        };


                        var lineData = serie.data.map(function(dataItem){
                            return {
                                x:serie.xScale(dataItem.x),
                                y:serie.yScale(dataItem.y)
                            }
                        });

                        this.lineData = this.lineData == undefined ? lineData : this.lineData;
                        var interpolate = d3.interpolate(this.lineData, lineData);
                        this.lineData = lineData;

                        return function(t){
                            var interpolateData = interpolate(t);
                            lineScale.interpolate(serie.interpolate);
                            var path = lineScale(interpolateData);
                            if(t==1){
                                ctx.linePath = path;
                            }
                            return path
                        }
                    });
            },
            __renderArea: function (animationEase, animationTime) {
                //面积
                // DONE 不用d3.svg.area，重写一个以满足需求
                var id = this.id, _this = this;
                var transitionStr = "opacity "+(animationTime/2)+"ms linear";

                var areaGroup = _this.main.selectAll('.xc-area-group').data([_this]);
                areaGroup.enter().append('g').attr('class', 'xc-area-group');
                areaGroup.exit().remove();
                var areaPath = areaGroup.selectAll('.xc-line-area-path').data(_this.series);
                areaPath.enter().append('path').attr('class', 'xc-line-area-path').attr('stroke', 'none');
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
                    .style("transition",transitionStr)
                    .style("opacity",function(d){
                        if(d.show === false){
                            return 0;
                        } else {
                            return d.areaStyle.opacity;
                        }
                    });


                // 动画
                areaPath.transition()
                    .duration(animationTime)
                    .ease(animationEase)
                    .attrTween("d",function(serie){
                        var ctx = this;

                        if(serie.show === false){
                            return function(){
                                return ctx.areaPath;
                            }
                        }

                        if(serie.areaStyle.show === false){
                            return function(){
                                return "";
                            }
                        }

                        var areaData = serie.data.map(function(dataItem){
                            return {
                                x: serie.xScale( dataItem.x ),
                                y: serie.yScale( dataItem.y ),
                                y0: serie.yScale( dataItem.y0 )
                            }
                        });
                        ctx.areaData = ctx.areaData == undefined? areaData : ctx.areaData;
                        var interpolate = d3.interpolate(this.areaData, areaData);
                        ctx.areaData = areaData;

                        return function(t){
                            var data = interpolate(t);
                            var areaPath = area(data,serie);
                            if(t==1){
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
                var transitionStr = "opacity "+(animationTime/2)+"ms linear";
                var circleGroup = _this.main.selectAll('.xc-circle-group').data(_this.series);
                circleGroup.enter().append('g').attr('class', function (serie) {
                    return 'xc-circle-group';
                });
                circleGroup.exit().remove();

                circleGroup.attr('id', function (d) {
                    return 'xc-circle-group-id' + id + '-' + d.idx;
                })
                    .attr('fill', function (serie) {
                        if (serie.lineStyle.color != 'auto')
                            return serie.lineStyle.color;
                        return _this.getColor(serie.idx);
                    });

                var circle = circleGroup.selectAll('circle').data(function (d) {
                    return d.data;
                });
                circle.enter().append('circle').attr('class', function (d, i) {
                    return 'xc-point xc-point-' + i;
                });
                circle.exit().remove();
                circle.style("transition",transitionStr)
                    .style("opacity",function(d){
                        if(typeof d !== 'object'){
                            return 0;
                        } else {
                            return 1;
                        }
                    })
                    .attr('r', function (d) {
                        if(typeof d === 'object') {
                            this.circleRadius = d._serie.lineStyle.radius;
                        }
                        return this.circleRadius;
                    });

                //动画
                circle.transition()
                    .duration(animationTime)
                    .ease(animationEase)
                    .attrTween("cx",function(d){
                        var ctx = this;
                        if(typeof d !== 'object') {
                            return function () {
                                return ctx.circleCX
                            }
                        }


                        var circleCX = d._serie.xScale(d.x);
                        ctx.circleCX = ctx.circleCX == undefined ? circleCX:ctx.circleCX;
                        var interpolate = d3.interpolate(ctx.circleCX, circleCX);
                        ctx.circleCX = circleCX;
                        return function(t){
                            return interpolate(t);
                        }
                    })
                    .attrTween("cy",function(d){
                        var ctx = this;

                        if(typeof d !== 'object') {
                            return function () {
                                return ctx.circleCY;
                            }
                        }

                        var circleCY = d._serie.yScale(d.y);
                        ctx.circleCY = ctx.circleCY == undefined ? circleCY:ctx.circleCY;
                        var interpolate = d3.interpolate(ctx.circleCY, circleCY);
                        ctx.circleCY = circleCY;
                        return function(t){
                            return interpolate(t);
                        }
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
                    var animationConfig = _this.config.animation;
                    _this.init(_this.messageCenter, _this.config, _this.type, series);
                    _this.render(animationConfig.animationEase,animationConfig.animationTime);
                });
            },
            __tooltipReady: function () {
                var _this = this;

                if (!this.config.tooltip || this.config.tooltip.show === false) return;//未开启tooltip

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
                                        return d._serie.xScale(d.x);
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
                        tooltip.setTooltipHtml(title + html);
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

        function parseSeries(ctx,series, config) {
            //先剔除不属于line的serie
            var stacks = {}, idx = 0, lineSeries = [];
            series.map(function (serie) {
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
            lineSeries = parseNoramlSeries(ctx, lineSeries, config);
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
                            serie.data = serie.data.map(function (dataValue, idx) {
                                var data = {};

                                // TODO 这里好像只能满足category
                                if (xConfig.type != 'value') {
                                    data.x = xConfig.data[idx];
                                    data.y0 = oldData ? oldData[idx].y : yScale.domain()[0];
                                    data.y = parseFloat(dataValue) + (oldData ? oldData[idx].y : 0);
                                }

                                data.value = dataValue;
                                data.idx = serieIdx;
                                data._serie = serie;
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

                    serie.data = serie.data.map(function (dataValue, idx) {

                        var data = {};
                        if (xConfig.type != 'value') {
                            data.x = xConfig.data[idx];
                            data.y = parseFloat(dataValue);
                            data.y0 = yScale.domain()[0];
                        }

                        data.value = dataValue;
                        data.idx = serieIdx;
                        data._serie = serie;
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
        function area(data,serie) {
            var lineScale = d3.svg.line()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                });
            var line0Scale = d3.svg.line()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y0;
                });


            lineScale.interpolate(serie.interpolate);
            var path = lineScale(data);
            line0Scale.interpolate(serie.y0Interpolate);
            var path0 = line0Scale(data.reverse());
            data.reverse()//再次翻转，恢复原状
            //serie.areaPath = joinPath(serie);
           return joinPath(path,path0,data);
        }

        /**
         * 将path和path0拼接成一个areaPath
         * @param serie
         */
        function joinPath(path,path0,data) {
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
            return '<p>'+name + ':&nbsp;' + value+'</p>';
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
                /**
                 * @var xAxisIndex
                 * @type Number
                 * @description 使用哪一个x轴，从0开始，对应xAxis中的坐标轴
                 * @default 0
                 * @extends xCharts.series.line
                 */
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
                     * @default 5
                     * @extends xCharts.series.line.lineStyle
                     */
                    radius: 5
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
                units: '',
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
            }
            return config;
        }

    }
    (window)
)
},{}],5:[function(require,module,exports){
/**
 * @file 饼图
 * @author chenwubai.cx@gmail.com
 */
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
                        this.pieConfig.center = utils.copy(series[i].center, true);
                        this.pieConfig.radius = utils.copy(series[i].radius, true);
                        break;
                    }
                }
            }

            // 用变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

            // 计算饼图原点、半径等属性值
            this.__correctConfig();
            // 转化原始数据为画弧形需要的数据
            this.pieData = this.__getPieData();
            // 生成弧形路径计算函数
            this.arcFunc = this.__getArcFunc();
            this.bigArcFunc = this.__getBigArcFunc();
        },
        render: function(animationEase, animationTime) {
            // 添加饼图g容器
            this.pieWrapper = this.__renderPieWrapper();
            // 添加弧形
            this.arcList = this.__renderArcs(animationEase, animationTime);
        },
        ready: function() {
            // TODO 这里应该考虑在一些极简应用场景下(没有legend或tooltip的配置)是否还需要进行事件绑定
            this.__legendReady();
            if(this.messageCenter.components.tooltip && this.messageCenter.components.tooltip._show) {
                this.__tooltipReady();
            }
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
        __renderPieWrapper: function() {
            var pieWrapper;
            if(!this.main.select('.xc-pie').node()) {
                // 初始化加载
                pieWrapper = this.main.append('g')
                    .classed('xc-pie', true);
            } else {
                pieWrapper = this.main.select('.xc-pie');
            }
            pieWrapper.attr('transform', 'translate(' + this.pieConfig.center[0] + ',' + this.pieConfig.center[1] + ')');
            return pieWrapper;
        },
        __renderArcs: function(animationEase, animationTime) {
            var _self = this;
            var arcs;
            if(!this.pieWrapper.select('.xc-pie-arcs').node()) {
                arcs = this.pieWrapper.append('g')
                    .classed('xc-pie-arcs', true);
                var arcList = arcs.selectAll('.xc-pie-arc')
                    .data(this.pieData)
                    .enter()
                    .append('path')
                    .classed('xc-pie-arc', true)
                    .style('fill', function(d, i) {
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
            } else {
                return this.__changeArcs(animationEase, animationTime);
            }
        },
        __changeArcs: function(animationEase, animationTime) {
            var _self = this;
            var arcs = this.pieWrapper.select('.xc-pie-arcs');
            var arcList = arcs.selectAll('.xc-pie-arc')
                .data(this.pieData)
                .transition()
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
                _self.__changeArcs(animationConfig.animationEase, animationConfig.animationTime);
            });
        },
        __tooltipReady: function() {
            var _self = this;
            var tooltip = _self.messageCenter.components.tooltip;
            this.arcList.on('mousemove.pie', function() {
                var bindData = d3.select(this).datum();
                var event = d3.event;
                var x = event.layerX || event.offsetX,
                    y = event.layerY || event.offsetY;
                var tooltipFormatter = tooltip.tooltipConfig.formatter,
                    pieFormatter = _self.pieConfig.formatter;
                var formatter = pieFormatter || tooltipFormatter || defaultFormatter;
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
    function defaultFormatter(name, value) {
        return "<div>" + name + '：' + value + "</div>";
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
}(window))
},{}],6:[function(require,module,exports){
/**
 * @file 雷达图
 * @author chenwubai.cx@gmail.com
 */
(function(window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;

    // 创建radar构造函数
    function radar(messageCenter, config) {
        // 调用这一步的原因是为了继承属性
        Chart.call(this, messageCenter, config, 'radar');
    }

    // 在xCharts中注册radar构造函数
    xCharts.charts.extend({ radar: radar });
    // 从父类Chart里继承一系列的方法
    utils.inherits(radar, Chart);

    radar.prototype.extend = xCharts.extend;
    radar.prototype.extend({
        init: function(messageCenter, config, type, series) {
            if(!this.radarConfig) {
                // 提出type为radar的series的子元素对象
                this.radarConfig = {};
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'radar') {
                        this.radarConfig = utils.copy(series[i], true);
                        break;
                    }
                }
            } else {
                for(var i=0;i<series.length;i++) {
                    if(series[i].type == 'radar') {
                        this.radarConfig.center = utils.copy(series[i].center, true);
                        this.radarConfig.radius = series[i].radius;
                        break;
                    }
                }
            }

            // 用临时变量存储messageCenter里的一些信息(如宽高等)，方便后面使用
            this.margin = messageCenter.margin;
            this.width = messageCenter.width;
            this.height = messageCenter.height;
            this.main = messageCenter.main;
            this.getColor = messageCenter.getColor;

            // 计算网轴点坐标
            this.polygonWebs = this.__getPolygonWebs();
            // 计算雷达图形的点坐标
            this.areas = this.__getAreas();
            // 计算文字标签的点
            this.textPoints = this.__getTextPoints();
            // 计算覆盖整个网轴的多边形的点坐标
            this.coverPolygons = this.__getCoverPolygons();
        },
        render: function(animationEase, animationTime) {
            // 添加雷达图的g容器
            this.radar = this.__renderRadarWrapper();
            // 添加网轴
            this.webList = this.__renderWebs();
            // 添加网轴线
            this.lineList = this.__renderLines();
            // 添加雷达图形
            this.areaList = this.__renderAreas(animationEase, animationTime);
            // 添加文字标签
            this.textList = this.__renderText();
            // 添加覆盖的多边形
            this.coverPolygonList = this.__renderCoverPolygons();
        },
        ready: function() {
            // TODO 这里应该考虑在一些极简应用场景下(没有legend或tooltip的配置)是否还需要进行事件绑定
            this.__legendReady();
            if(this.messageCenter.components.tooltip && this.messageCenter.components.tooltip._show) {
                this.__tooltipReady();
            }
        },
        __getPolygonWebs: function() {
            // 计算图的中心坐标
            if(typeof this.radarConfig.center[0] == 'string') {
                this.radarConfig.center[0] = parseFloat(this.radarConfig.center[0]) * 0.01 * this.width;
            }
            if(typeof this.radarConfig.center[1] == 'string') {
                this.radarConfig.center[1] = parseFloat(this.radarConfig.center[1]) * 0.01 * this.height;
            }
            // 计算最大的多边形的半径
            if(typeof this.radarConfig.radius == 'string') {
                this.radarConfig.radius = parseFloat(this.radarConfig.radius) * 0.01 * this.width;
            }
            // 添加对雷达图大小的处理,如果半径太大,自动把半径保持在可控的最大值
            var minLength = this.width<this.height ? this.width : this.height;
            // 减20是考虑到还有文字标签占着位置
            if(this.radarConfig.radius*2+20 > minLength) {
                this.radarConfig.radius = minLength/2 - 20;
            }

            // 计算网轴多边形的点
            this.radarConfig.total = this.radarConfig.data[0].value.length;
            var onePiece = 2 * Math.PI/this.radarConfig.total;
            var polygonWebs = new Array();
            for(var k=this.radarConfig.levels;k>0;k--) {
                var web = '',
                    points = [];
                var r = this.radarConfig.radius/this.radarConfig.levels * k;
                for(var i=0;i<this.radarConfig.total;i++) {
                    var x = r * Math.sin(i * onePiece),
                        y = r * Math.cos(i * onePiece);
                    web += x + ',' + y + ' ';
                    points.push({ x: x, y: y });
                }
                polygonWebs.push({
                    webString: web,
                    webPoints: points
                });
            }
            return polygonWebs;
        },
        __getAreas: function() {
            // 计算雷达图形的点
            var areas = new Array();
            for(var i=0; i<this.radarConfig.data.length;i++) {
                var d = this.radarConfig.data[i],
                    max = this.radarConfig.indicator[i].max,
                    min = this.radarConfig.indicator[i].min,
                    area = '',
                    points = [];
                for(var k=0;k< d.value.length;k++) {
                    var x = this.polygonWebs[0].webPoints[k].x * d.value[k]/(max - min),
                        y = this.polygonWebs[0].webPoints[k].y * d.value[k]/(max - min);
                    area += x + ',' + y + ' ';
                    points.push({ x: x, y: y });
                }
                areas.push({
                    areaString: area,
                    areaPoints: points,
                    originalData: d,
                    isShow: true
                });
            }
            return areas;
        },
        __getTextPoints: function() {
            // 计算文字标签的点
            // TODO 优化文字标签分布
            var textPoints = new Array();
            var textRadius = this.radarConfig.radius + 20;
            for(var i=0;i<this.radarConfig.total;i++) {
                textPoints.push({
                    x: textRadius/this.radarConfig.radius * this.polygonWebs[0].webPoints[i].x,
                    y: textRadius/this.radarConfig.radius * this.polygonWebs[0].webPoints[i].y + 8
                });
            }
            return textPoints;
        },
        __getCoverPolygons: function() {
            // 计算覆盖整个多边形网轴的多边形的坐标
            var webPoints = this.polygonWebs[0].webPoints;
            var coverPolygons = new Array();
            var length = webPoints.length;
            for(var i=0;i<length;i++) {
                var lastPoint = i==0 ? webPoints[length-1] : webPoints[i-1],
                    currentPoint = webPoints[i],
                    nextPoint = webPoints[(i+1)%length];
                var pointsStr = '0,0',
                    points = [ {x:0, y:0} ];
                pointsStr += ' ' + (lastPoint.x+currentPoint.x)/2 + ',' + (lastPoint.y+currentPoint.y)/2;
                points.push({
                    x: (lastPoint.x+currentPoint.x)/2,
                    y: (lastPoint.y+currentPoint.y)/2
                });
                pointsStr += ' ' + currentPoint.x + ',' + currentPoint.y;
                points.push({
                    x: currentPoint.x,
                    y: currentPoint.y
                });
                pointsStr += ' ' + (currentPoint.x+nextPoint.x)/2 + ',' + (currentPoint.y+nextPoint.y)/2;
                points.push({
                    x: (currentPoint.x+nextPoint.x)/2,
                    y: (currentPoint.y+nextPoint.y)/2
                });
                coverPolygons.push({
                    pointsStr: pointsStr,
                    points: points,
                    index: i
                });
            }
            return coverPolygons;
        },
        __renderRadarWrapper: function() {
            var radar;
            if(!this.main.select('.xc-radar').node()) {
                radar = this.main.append('g')
                    .classed('xc-radar', true);
            } else {
                radar = this.main.select('.xc-radar');
            }
            radar.attr('transform', 'translate(' + this.radarConfig.center[0] + ',' + this.radarConfig.center[1] + ')');
            return radar;
        },
        __renderWebs: function() {
            var webs, webList;
            if(!this.radar.select('.xc-radar-webs').node()) {
                // 初始化加载
                webs = this.radar.append('g')
                    .classed('xc-radar-webs', true);
                webList = webs.selectAll('.xc-radar-web')
                    .data(this.polygonWebs)
                    .enter()
                    .append('polygon')
                    .classed('xc-radar-web', true)
                    .attr('points', function(d) { return d.webString; });
            } else {
                // 重绘
                webs = this.radar.select('.xc-radar-webs');
                webList = webs.selectAll('.xc-radar-web')
                    .data(this.polygonWebs)
                    .attr('points', function(d) { return d.webString; });
            }
            return webList;
        },
        __renderLines: function() {
            var lines, lineList;
            if(!this.radar.select('.xc-radar-lines').node()) {
                // 初始化加载
                lines = this.radar.append('g')
                    .classed('xc-radar-lines', true);
                lineList = lines.selectAll('.xc-radar-line')
                    .data(this.polygonWebs[0].webPoints)
                    .enter()
                    .append('line')
                    .classed('xc-radar-line', true)
                    .attr({
                        x1: 0,
                        y1: 0,
                        x2: function(d) {
                            return d.x;
                        },
                        y2: function(d) {
                            return d.y;
                        }
                    });
            } else {
                lines = this.radar.select('.xc-radar-lines');
                lineList = lines.selectAll('.xc-radar-line')
                    .data(this.polygonWebs[0].webPoints)
                    .attr({
                        x1: 0,
                        y1: 0,
                        x2: function(d) {
                            return d.x;
                        },
                        y2: function(d) {
                            return d.y;
                        }
                    });
            }
            return lineList;
        },
        __renderAreas: function(animationEase, animationTime) {
            var _self = this;
            var areas, areaList;
            if(!this.radar.select('.xc-radar-areas').node()) {
                // 初始化加载
                areas = this.radar.append('g')
                    .classed('xc-radar-areas', true);
                areaList = areas.selectAll('.xc-radar-area')
                    .data(this.areas)
                    .enter()
                    .append('g')
                    .attr('class', function(d, i) {
                        return 'xc-radar-area xc-radar-area' + d.originalData.idx;
                    });
                areaList.append('polygon')
                    .attr('points', function(d) {
                        return Array.apply(0, Array(_self.radarConfig.total)).map(function() {
                            return '0,0';
                        }).join(' ');
                    })
                    .style({
                        stroke: function(d) {
                            if(!d.originalData.color) {
                                d.originalData.color = _self.getColor(d.originalData.idx);
                            }
                            return d.originalData.color;
                        },
                        fill: !this.radarConfig.fill ? '' : function(d) {
                            return d.originalData.color;
                        }
                    })
                    .transition()
                    .duration(animationTime)
                    .ease(animationEase)
                    .attr('points', function(d) {
                        return d.areaString;
                    });
                // 添加雷达图形的点
                for(var i=0;i<this.areas.length;i++) {
                    var area = areas.select('.xc-radar-area' + this.areas[i].originalData.idx);
                    area.selectAll('.xc-radar-area-point')
                        .data(this.areas[i].areaPoints)
                        .enter()
                        .append('circle')
                        .classed('xc-radar-area-point', true)
                        .attr({
                            cx: 0,
                            cy: 0
                        })
                        .style('stroke', _self.areas[i].originalData.color)
                        .transition()
                        .duration(animationTime)
                        .ease(animationEase)
                        .attr({
                            cx: function(d) { return d.x; },
                            cy: function(d) { return d.y; }
                        });
                }
            } else {
                // 重绘
                areas = this.radar.select('.xc-radar-areas');
                areaList = areas.selectAll('.xc-radar-area')
                    .data(this.areas);
                for(var i=0;i<this.areas.length;i++) {
                    var area = areas.select('.xc-radar-area' + this.areas[i].originalData.idx);
                    area.select('polygon')
                        .transition()
                        .duration(animationTime)
                        .ease(animationEase)
                        .attr('points', this.areas[i].areaString);
                    area.selectAll('.xc-radar-area-point')
                        .data(this.areas[i].areaPoints)
                        .transition()
                        .duration(animationTime)
                        .ease(animationEase)
                        .attr({
                            cx: function(d) { return d.x; },
                            cy: function(d) { return d.y; }
                        });
                }
            }
            return areaList;
        },
        __renderText: function() {
            var _self = this;
            var texts, textList;
            if(!this.radar.select('.xc-radar-texts').node()) {
                // 初始化加载
                texts = this.radar.append('g')
                    .classed('xc-radar-texts', true);
                textList = texts.selectAll('.xc-radar-text')
                    .data(this.textPoints)
                    .enter()
                    .append('text')
                    .classed('xc-radar-text', true)
                    .attr({
                        x: function(d) { return d.x; },
                        y: function(d) { return d.y; }
                    })
                    .text(function(d, i) {
                        return _self.radarConfig.indicator[i].text;
                    })
                    .attr('text-anchor', 'middle');
            } else {
                // 重绘
                texts = this.radar.select('.xc-radar-texts');
                textList = texts.selectAll('.xc-radar-text')
                    .data(this.textPoints)
                    .attr({
                        x: function(d) { return d.x; },
                        y: function(d) { return d.y; }
                    });
            }
            return textList;
        },
        __renderCoverPolygons: function() {
            var coverPolygons, coverPolygonList;
            if(!this.radar.select('.xc-radar-coverPolygons').node()) {
                // 初始化加载
                coverPolygons = this.radar.append('g')
                    .classed('xc-radar-coverPolygons', true);
                coverPolygonList = coverPolygons.selectAll('xc-radar-coverPolygon')
                    .data(this.coverPolygons)
                    .enter()
                    .append('polygon')
                    .classed('xc-radar-coverPolygon', true)
                    .attr('points', function(d) {
                        return d.pointsStr;
                    });
            } else {
                // 重绘
                coverPolygons = this.radar.select('.xc-radar-coverPolygons');
                coverPolygonList = coverPolygons.selectAll('xc-radar-coverPolygon')
                    .data(this.coverPolygons)
                    .attr('points', function(d) {
                        return d.pointsStr;
                    });
            }
            return coverPolygonList;
        },
        __legendReady: function() {
            var _self = this,
                areas = _self.areas;
            // TODO 去掉mouseenter和mouseleave的重复代码
            this.on('legendMouseenter.radar', function (name) {
                var areaData = {};
                for(var i=0;i<areas.length;i++) {
                    if(name == areas[i].originalData.name) {
                        areaData = areas[i];
                        break;
                    }
                }
                for(var i=0;i<_self.areaList[0].length;i++) {
                    var areaEle = d3.select(_self.areaList[0][i]);
                    if(areaEle.datum() == areaData) {
                        areaEle.selectAll('.xc-radar-area-point')
                            .style('stroke-width', 5);
                        break;
                    }
                }
            });
            this.on('legendMouseleave.radar', function(name) {
                var areaData = {};
                for(var i=0;i<areas.length;i++) {
                    if(name == areas[i].originalData.name) {
                        areaData = areas[i];
                        break;
                    }
                }
                for(var i=0;i<_self.areaList[0].length;i++) {
                    var areaEle = d3.select(_self.areaList[0][i]);
                    if(areaEle.datum() == areaData) {
                        areaEle.selectAll('.xc-radar-area-point')
                            .style('stroke-width', 3);
                        break;
                    }
                }
            });
            this.on('legendClick.radar', function(nameList) {
                for(var i=0;i<_self.areas.length;i++) {
                    _self.areas[i].isShow = false;
                }
                for(var i=0;i<nameList.length;i++) {
                    for(var k=0;k<_self.areas.length;k++) {
                        if(nameList[i] == _self.areas[k].originalData.name) {
                            _self.areas[k].isShow = true;
                            break;
                        }
                    }
                }
                for(var i=0;i<_self.areas.length;i++) {
                    d3.select(_self.areaList[0][i]).classed('hidden', !_self.areas[i].isShow);
                }
            });
        },
        __tooltipReady: function() {
            var _self = this;
            var tooltip = _self.messageCenter.components.tooltip;
            this.coverPolygonList.on('mousemove.radar', function() {
                var index = d3.select(this).datum().index;
                var event = d3.event;
                var x = event.layerX || event.offsetX,
                    y = event.layerY || event.offsetY;
                var tooltipFormatter = tooltip.tooltipConfig.formatter,
                    radarFormatter = _self.radarConfig.formatter;
                var formatter = radarFormatter || tooltipFormatter || defaultFormatter;
                var indicator = _self.radarConfig.indicator[index].text;
                var valueList = new Array();
                for(var i=0;i<_self.radarConfig.data.length;i++) {
                    if(_self.areas[i].isShow) {
                        valueList.push({
                            name: _self.radarConfig.data[i].name,
                            value: _self.radarConfig.data[i].value[index]
                        });
                    }
                }
                tooltip.setTooltipHtml(formatter(indicator, valueList));
                tooltip.setPosition([x,y], 10, 10);
                tooltip.showTooltip();
                var areaPointsList = _self.areaList.selectAll('.xc-radar-area-point');
                for(var i=0;i<areaPointsList.length;i++) {
                    var areaPoints = areaPointsList[i];
                    d3.select(areaPoints[index]).style('stroke-width', 5);
                }
            });
            this.coverPolygonList.on('mouseout.radar', function() {
                tooltip.hiddenTooltip();
                var index = d3.select(this).datum().index;
                var areaPointsList = _self.areaList.selectAll('.xc-radar-area-point');
                for(var i=0;i<areaPointsList.length;i++) {
                    var areaPoints = areaPointsList[i];
                    d3.select(areaPoints[index]).style('stroke-width', 3);
                }
            });
        }
    });
    function defaultFormatter(indicator, valueList) {
        var htmlStr = '';
        htmlStr += "<h3>" + indicator + "</h3>";
        for(var i=0;i<valueList.length;i++) {
            htmlStr += "<div>" + valueList[i].name + "：" + valueList[i].value + "</div>";
        }
        return htmlStr;
    }

    function defaultConfig() {
        /**
         * @var radar
         * @type Object
         * @extends xCharts.series
         * @description 雷达图配置项
         */
        var config = {
            /**
             * @var type
             * @type String
             * @description 指定图表类型
             * @values 'radar'
             * @extends xCharts.series.radar
             */
            type: 'radar',
            /**
             * @var levels
             * @type Number
             * @description 标记雷达图网轴有几层，取值必须为大于0的整数
             * @default 4
             * @extends xCharts.series.radar
             */
            levels: 4,
            /**
             * @var radius
             * @type Number|String
             * @description 定义雷达图的半径
             * @default '15%'
             * @extends xCharts.series.radar
             */
            radius: '15%',
            /**
             * @var fill
             * @type Boolean
             * @description 定义雷达图的区域是否填充，true为填充，false为不填充
             * @default false
             * @extends xCharts.series.radar
             */
            fill: false,
            /**
             * @var center
             * @type Array
             * @description 雷达图中心位置，可为百分比或数值。若为百分比则center[0]（中心x坐标）参照容器宽度，center[1]（中心y坐标）参照容器高度。
             * @default ['50%','50%']
             * @extends xCharts.series.radar
             */
            center: ['50%', '50%'],
            /**
             * @var indicator
             * @type Array
             * @description 雷达图各项指标
             * @extends xCharts.series.radar
             */
            indicator: [
                {
                    /**
                     * @var text
                     * @type String
                     * @description 指标名称
                     * @extends xCharts.series.radar.indicator
                     */
                    text: '',
                    /**
                     * @var max
                     * @type Number
                     * @description 指标取值范围的最大值
                     * @extends xCharts.series.radar.indicator
                     */
                    max: 100,
                    /**
                     * @var min
                     * @type Number
                     * @description 指标取值范围的最大值
                     * @extends xCharts.series.radar.indicator
                     */
                    min: 0
                }
            ],
            /**
             * @var data
             * @type Array
             * @description 雷达图数据
             * @extends xCharts.series.radar
             */
            data: [
                {
                    /**
                     * @var name
                     * @type String
                     * @description 数据项名称
                     * @extends xCharts.series.radar.data
                     */
                    name: '',
                    /**
                     * @var value
                     * @type Array
                     * @description 数据项对应所有指标的值的集合，其中的顺序必须和indicator中指标的顺序相对应。
                     * @extends xCharts.series.radar.data
                     */
                    value: []
                }
            ]
        }
        return config;
    }
}(window))
},{}],7:[function(require,module,exports){
/**
 *  scatter 散点图
 *  继承自 Chart
 */
(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var Chart = xCharts.charts.Chart;
    var d3 = window.d3;
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
            var animationConfig = _this.config.animation;
            var scatterGroup = _this.main.selectAll('.xc-scatter-group')
                .data([1]);

            scatterGroup.enter().append('g')
                .attr('class', 'xc-scatter-group');

            var scatterItem = scatterGroup.selectAll('.xc-scatter-item')
                .data(_this.data);

            var transitionStr = "r "+animationConfig.animationTime+"ms linear,cx "+animationTime+"ms linear,cy "+animationTime+"ms linear";

            scatterItem.enter().append('circle');
            scatterItem.exit().remove();

            scatterItem.style("transition",transitionStr)
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

            _this.scatterItem = scatterItem;//暴露出去，为了tooltip事件
        },
        ready: function () {
            this.__legendReady();
            this.__tooltipReady();
        },
        __legendReady: function () {
            var _this = this, selectGroup = null;
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
                _this.render('linear', 0);
            });
        },
        __tooltipReady: function () {
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger == 'axis') return;//未开启tooltip
            var _this = this;
            var tooltip = _this.messageCenter.components['tooltip'];
            var tooltipFormatter = tooltip.tooltipConfig.formatter;
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
            })
        }
    })
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

}(window))
},{}],8:[function(require,module,exports){
/**
 * Created by liuyang on 15/10/27.
 */
(function () {

    function Component(messageCenter, config, type) {
        this.messageCenter = messageCenter;
        this.config = config;
        this.type = type;
        this.main = messageCenter.main;
        this.margin = messageCenter.margin;
        this.svg = messageCenter.svg;
        this.div = messageCenter.div;

        //绘画三大周期

        //计算绘画所需的数据
        this.init(messageCenter, config, type, this.config.series);

        //绘制图形，第一个参数是动画类型，第二个是动画时间，这里初始化绘制统一交给动画组件进行，所以时间为0
        this.render('linear', 0);

        //绑定相应的事件
        this.ready();
    }

    Component.prototype = {
        constructor: Component,
        init: function (messageCenter, config, type) {
            //初始化
        },
        render: function (animationEase, animationTime) {
            //绘制
        },
        ready: function () {
            //绑定事件
        },
        refresh: function (animationEase, animationTime) {

            // 关闭显示的组件不进行刷新
            if(!this._show) return true;

            //当容器改变时，刷新当前组件
            this.margin = this.messageCenter.margin;//每次刷新时，重置margin
            this.originalHeight = this.messageCenter.originalHeight; //将变化后的宽高重新赋值
            this.originalWidth = this.messageCenter.originalWidth
            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.render(animationEase, animationTime);//刷新
        },
        updateSeries: function (series) {

            // 关闭显示的组件不更新数据
            if(!this._show) return true;

            //加载新数据
            this.init(this.messageCenter, this.config, this.type, series);//重新初始化
            this.render('linear', 0);//刷新
            this.ready();//绘画完成，重新绑定事件
        },
        on: function () {
            this.messageCenter.on.apply(this.messageCenter, arguments);
        },
        fire: function () {
            this.messageCenter.fire.apply(this.messageCenter, arguments);
        }
    }

    xCharts.components.extend({Component: Component});

}())
},{}],9:[function(require,module,exports){
/**
 * xCharts.axis
 * 坐标系绘制函数
 * TODO brush时间刷
 */
(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    var components = xCharts.components;
    utils.inherits(axis, components['Component']);
    components.extend({axis: axis});

    function axis(messageCenter, config, type) {
        /**
         * 这里跟其他组件不一样，即使用户不愿意显示坐标轴，也必须初始化(init)，不然其他图表会拿不到比例尺导致绘图失败
         */
        this._show = true;
        components['Component'].call(this, messageCenter, config, type);

    }

    axis.prototype.extend = xCharts.extend;
    axis.prototype.extend({
        //一些初始化参数的计算
        init: function (messageCenter, config, type, series) {
            this.isXAxis = type === 'xAxis';
            this.axisConfig = config[type];
            this.series = series;

            var scales = [];
            for (var i = 0; i < this.axisConfig.length; i++) {

                // 合并默认config
                var config = utils.merage(defaultConfig(type), this.axisConfig[i]);

                // 计算需要显示的文字的宽高，y轴是宽，x轴是高

                // 计算比例尺scale
                var scale = axisScale(config, i, this);

                // 这里判断，如果domain是NAN证明是legend取消了所有显示，保持上一个不变
                var doamin = scale.domain();
                if (isNaN(doamin[0]) && isNaN(doamin[1]) && scale.scaleType==='value') scale = this.scales[i];

                if (!this.legendRefresh) calcAxisMargin(this, this.isXAxis, config, scale);


                this.axisConfig[i] = config;


                scales[i] = scale;

                this.axisConfig[i] = config;
            }

            this.width = messageCenter.originalWidth - messageCenter.margin.left - messageCenter.margin.right; //计算剩余容器宽
            this.height = messageCenter.originalHeight - messageCenter.margin.top - messageCenter.margin.bottom;//计算剩余容器高
            this.range = this.isXAxis ? [0, this.width] : [this.height, 0];

            setScaleRange(scales, this.range);

            this.messageCenter[this.type + 'Scale'] = scales;
            this.scales = scales;

        },
        render: function (animationEase, animationTime) {
            var type = this.type;
            var scales = this.scales;

            for (var i = 0, config; config = this.axisConfig[i]; i++) {

                if (!config.show) break; //不显示坐标

                var scale = scales[i];

                // d3内置函数,生成axis
                var axis = d3.svg.axis()
                    .scale(scale)
                    .orient(config.position)
                    .tickFormat(config.tickFormat);

                //添加<g>
                var axisGroup = this.main.selectAll(".xc-axis." + type + '-' + i).data([config]);

                axisGroup.enter().append('g')
                    .attr('class', 'xc-axis ' + type + '-' + i)
                    .attr('fill', 'none')
                    .attr('stroke', '#000');

                axisGroup.attr('transform', translate.call(this, config))
                    .transition()
                    .ease(animationEase)
                    .duration(animationTime)
                    .call(axis);


            }
        },
        ready: function () {

            this._tooltipReady();
            this._lengendReady();
        },
        _tooltipReady: function () {

            //有些情况不需要加载tooltip事件
            if (!this.config.tooltip || this.config.tooltip.show === false || this.config.tooltip.trigger !== 'axis' || this.type == 'yAxis') return;

            //默认已经是单x轴,且type！=value

            var axis = this.axisConfig[0];
            this.on('tooltipSectionChange.axis', function (sectionNumber, callback) {
                var data = axis.data[sectionNumber];
                var html = axis.formatter(data);

                callback(html);
            });

        },
        _lengendReady: function () {
            var _this = this;
            this.on('legendClick.' + _this.type, function (nameList) {
                var series = _this.series;
                series.forEach(function (serie) {
                    var serieName = serie.name;
                    serie.show = false;
                    for (var i = 0, n; n = nameList[i++];) {
                        if (n == serieName) {
                            serie.show = true;
                            break;
                        }
                    }

                });
                // 给个标识，这样就不用去计算margin的值
                _this.legendRefresh = true;
                _this.init(_this.messageCenter, _this.config, _this.type, series);
                _this.render(_this.config.animation.animationEase, _this.config.animation.animationTime);
                _this.legendRefresh = false;
            });
        }
    });

    /**
     * 设置scale
     * @param scales
     */
    function setScaleRange(scales, range) {

        scales.forEach(function (scale) {
            if (scale.scaleType === "value" || scale.scaleType === "time") scale.range(range);
            else if (scale.scaleType === "barCategory") scale.rangeRoundBands(range, 0, 0.1);
            else if (scale.scaleType === "category")  scale.rangeRoundPoints(range);

        });
    }

    /**
     * 计算y轴时，需要偏移的margin值
     * @param ctx
     * @param isXAxis
     * @param config
     * @param scale
     */
    function calcAxisMargin(ctx, isXAxis, config, scale) {

        // 只处理Y轴，X轴高度基本不会变化
        if (!isXAxis) {
            var ticksTextList = scale.ticks().map(function (tickText) {
                return config.tickFormat(tickText);
            });
            // 这里默认14的字体大小，也不知道有没有影响，囧
            var widthList = utils.calcTextWidth(ticksTextList, 14).widthList;
            var maxWidth = d3.max(widthList);

            maxWidth = maxWidth == undefined ? 0 : maxWidth;

            if (config.position === 'right') {
                ctx.margin.right += maxWidth;
            } else {
                ctx.margin.left += maxWidth;
            }
        }


    }

    /**
     * 包含坐标轴类型
     */
    var axisCategory = {
        value: valueAxis,
        time: timeAxis,
        category: categoryAxis
    }

    /**
     * 入口
     * @param singleConfig
     * @param idx
     * @param ctx
     * @returns {*}
     */
    function axisScale(singleConfig, idx, ctx) {
        var axisClass = axisCategory[singleConfig.type];
        if (!axisClass) {
            console.error('axis[%d].type = "%s" is not supported', idx, singleConfig.type);
            return;
        }

        return axisClass.call(ctx, singleConfig, idx);

    }

    /**
     * category类型
     * @param singleConfig
     * @param idx
     * @returns {*}
     */
    function categoryAxis(singleConfig, idx) {

        if (!singleConfig.data) {
            console.error('axis[%d].data is not defined!', idx);
            return;
        }

        if (isBar(this.config.series)) {
            var scale = d3.scale.ordinal()
                .domain(singleConfig.data);


            scale.scaleType = "barCategory";

        } else {
            var scale = d3.scale.ordinal()
                .domain(singleConfig.data);


            scale.scaleType = "category";
        }

        return scale;

    }

    /**
     * value类型
     * @param singleConfig
     * @param idx
     * @returns {*}
     */
    function valueAxis(singleConfig, idx) {

        var series = this.series;
        var type = this.type;
        //默认指向index=0的坐标轴
        series.map(function (serie) {
            if (serie[type + 'Index'] == null) {
                serie[type + 'Index'] = 0;
            }
        });

        var values = [], domain = [];
        for (var k in axisSeries) {
            if (axisSeries.hasOwnProperty(k)) {
                var value = axisSeries[k](series, type, idx);
                if (value) {
                    values.push(value);
                }
            }

        }
        domain[0] = d3.min(values, function (value) {
            return value[0]
        });
        domain[1] = d3.max(values, function (value) {
            return value[1]
        });

        // 虽然设置轴，但是并没有使用，查看是否设置了最大最小值
        //if(domain[0] === undefined){
        //    domain[0] = singleConfig.min;
        //    domain[1] = singleConfig.max;
        //}

        // 如果最大最小值是相等的,手动将domain的一个值设为0
        if (domain[0] === domain[1]) {
            domain[0] > 0 ? domain[0] = 0 : domain[1] = 0;
        }

        // domain 上下添加0.1的偏移，参考至c3
        var valueLength = domain[1] - domain[0];
        domain[0] -= valueLength * 0.1;
        domain[1] += valueLength * 0.1;

        //用户手动控制最大最小值
        if (domain[0] > singleConfig.minValue) {
            domain[0] = singleConfig.minValue;
        }
        if (domain[1] < singleConfig.maxValue) {
            domain[1] = singleConfig.maxValue;
        }


        var scale = d3.scale.linear()
            .domain(domain);


        scale.scaleType = "value";

        return scale;
    }

    /**
     * time类型
     * @param singleConfig
     * @param idx
     * @returns {*}
     */
    function timeAxis(singleConfig, idx) {

        var scale = d3.time.scale()
            .domain(d3.extent(singleConfig.data, function (d) {
                return +new Date(d);
            }));

        //现在只考虑x坐标轴
        if (this.isXAxis) {
            //取得series中data的长度，均分domain,保证singleConfig.data长度一致
            var series = this.config.series;
            var dataLength = 1;
            for (var i = 0, serie; serie = series[i++];) {
                // 这里只支持折线图，暂不考虑其他
                var xIndex = serie.xAxisIndex == undefined ? 0 : serie.xAxisIndex;
                if (serie.type == 'line' && xIndex == idx) {
                    dataLength = serie.data.length - 1;
                    break;
                }
            }

            var domain = scale.domain(),
                timeDifference = domain[1] - domain[0], //最大最小时间差
                sectionTime = timeDifference / dataLength;//时间与时间之间的间隔

            singleConfig.data = [+domain[0]];
            for (var i = 0; i < dataLength; i++) {
                singleConfig.data[i + 1] = +domain[0] + Math.round(sectionTime * (i + 1), 1);
            }
        }
        scale.scaleType = "time";

        return scale;
    }


    //因图表类型而异，取得对应的最大最小值
    //需对每个series指定了xAxisIndex 或者 yAxisIndex
    //@return 数组[min,max]
    var axisSeries = {
        line: function (series, type, idx) {
            var stacks = {}, values = [];
            d3.map(series, function (serie) {
                if (serie.type != 'line' || serie[type + 'Index'] != idx || serie.show == false) {
                    return false;
                }
                if (serie.stack) {
                    stacks[serie.stack] || (stacks[serie.stack] = [])
                    stacks[serie.stack].push(serie.data);
                }
                values = values.concat(serie.data);
            })
            //处理堆积图，值相加
            for (var k in stacks) {
                if (stacks.hasOwnProperty(k)) {
                    var maxData = [];
                    stacks[k].forEach(function (data, i) {
                        data.forEach(function (d, i) {
                            maxData[i] = maxData[i] == null ? 0 : maxData[i];//默认为0
                            maxData[i] += d;
                        })
                    })
                    values = values.concat(maxData);

                }
            }

            return values.length == 0 ? false
                : d3.extent(values, function (value) {
                return parseFloat(value);
            })
        },
        bar: function (series, type, idx) {
            var stacks = {}, values = [];
            d3.map(series, function (serie) {
                if (serie.type != 'bar' || serie[type + 'Index'] != idx || serie.show == false) {
                    return false;
                }
                if (serie.stack) {
                    stacks[serie.stack] || (stacks[serie.stack] = [])
                    stacks[serie.stack].push(serie.data);
                }
                values = values.concat(serie.data);
            })
            for (var k in stacks) {
                if (stacks.hasOwnProperty(k)) {
                    var maxData = [];
                    stacks[k].forEach(function (data, i) {
                        data.forEach(function (d, i) {
                            maxData[i] = maxData[i] == null ? 0 : maxData[i];//默认为0
                            maxData[i] += d;
                        })
                    })
                    values = values.concat(maxData);

                }
            }
            return values.length == 0 ? false
                : d3.extent(values, function (value) {
                return parseFloat(value);
            })
        },
        scatter: function (series, type, idx) {
            var values = [];
            d3.map(series, function (serie) {
                if (serie.type != 'scatter' || serie[type + 'Index'] != idx || serie.show == false) {
                    return;
                }
                d3.map(serie.data, function (d) {
                    values.push(d[type == 'xAxis' ? 0 : 1]); //[[161.2, 51.6]]包含x，y值的数组,第一个为x，第二个为y
                })
            });

            return values.length == 0 ? false
                : d3.extent(values, function (value) {
                return parseFloat(value);
            })
        }
    }

    /**
     * 根据作为位置返回需要偏移的坐标量
     * @param config
     * @returns {string} translate(0,0)
     */
    function translate(config) {
        var position = config.position;
        var xy = [0, 0];

        if (position == 'right')
            xy = [this.width, 0];
        else if (position == 'bottom')
            xy = [0, this.height];
        return 'translate(' + xy + ')';
    }


    function isBar(series) {
        for (var i = 0, s; s = series[i++];)
            if (s.type === 'bar')
                return true;

        return false;
    }

    function defaultConfig(type) {
        //注释掉是因为该项没有默认值,非必须或者必须由用户指定

        /**
         * @var axis
         * @type Object
         * @description 坐标轴配置项
         * @extends xCharts
         */
        var axis = {
            /**
             * @var type
             * @extends xCharts.axis
             * @description 坐标轴的类型
             * @type String
             * @values 'category'|'value'|'time'
             */
            //type:'value',
            /**
             * @var data
             * @extends xCharts.axis
             * @type Array
             * @description
             *  依赖于type类型
             *  type=value时,data值无效
             *  type=category时，data里的值为String|Number
             *  type=time时,data里是可以被new Date()识别的值
             * @example data:[1,2,3] data:['周一','周二','周三']
             */
            //data:[], //当type=category,time时，指定坐标轴的值
            /**
             * @var tickFormat
             * @extends xCharts.axis
             * @type Function
             * @description
             * 对坐标轴上的每一个label进行格式化,需要返回一个字符串作为显示
             * @example
             *  function(value){
             *      return value+'%';
             *  }
             *  @default 不做任何处理
             */
            tickFormat: utils.loop,
            /**
             * @var formatter
             * @extends xCharts.axis
             * @type Function
             * @description
             * 对坐标轴上的每一个label进行格式化,需要返回一个字符串作为tooltip的title字段
             * @example
             *  function(value){
             *      return value+'%';
             *  }
             *  @default 调用tickFormat进行处理,两边包裹<p>标签
             */
            formatter: function (value) {
                return "<p>" + this.tickFormat(value) + "</p>";
            },
            /**
             * @var position
             * @extends xCharts.axis
             * @type String
             * @values x轴'top'|'bottom'；y轴'left'|'right'
             * @description
             *  多X多Y轴使用，控制坐标轴位置
             * @default x轴'bottom';y轴'left'
             */
            position: type == 'xAxis' ? 'bottom' : 'left',//left时y轴在左边，right时Y轴在右边,默认为left;top时x轴在顶端，bottom时x轴在底部,默认bottom.
            /**
             * @var maxValue
             * @extends xCharts.axis
             * @type Number
             * @description
             *  当type=value时有效
             *  控制坐标轴上最大值显示
             *  当传入值中的最大值超过maxValue时，以传入值为准
             */
            //maxValue: 100,
            /**
             * @var minValue
             * @extends xCharts.axis
             * @type Number
             * @description
             *  当type=value时有效
             *  控制坐标轴上最小值显示
             *  当传入值中的最小值小于minValue时，以传入值为准
             */
            //minValue: 0, //type=value有效，手动设置最大最小值,
            /**
             * @var show
             * @extends xCharts.axis
             * @type Boolean
             * @default true
             * @description
             * 当不需要显示坐标轴时，可以关掉这个选项
             */
            show: true
        }
        return axis;
    }


}(window))
},{}],10:[function(require,module,exports){
/**
 * xCharts.legend
 * extends Component
 */
(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(legend, Component);
    components.extend({legend: legend});

    function legend(messageCenter, config, type) {

        //show=false时不做显示处理
        if (config.legend.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        Component.call(this, messageCenter, config, type);
    }

    legend.prototype.extend = xCharts.extend;
    legend.prototype.extend({
        init: function (messageCenter, config) {

            // 合并默认配置项
            this.legendConfig = utils.merage(defaultConfig(), config.legend);

            this.legendSeries = parseSeries(config.series, this.legendConfig.data, messageCenter);
            this.originalHeight = messageCenter.originalHeight;
            this.originalWidth = messageCenter.originalWidth
            this.width = this.originalWidth - this.margin.left - this.margin.right;
            this.height = this.originalHeight - this.margin.top - this.margin.bottom;

            //计算位置
            this.groupPosition = calcPosition.call(this);

        },
        render: function () {
            var _this = this,
                fontSize = _this.legendConfig.item.fontSize,
                chartSize = _this.legendConfig.item.chartSize,
                itemHeight = fontSize > chartSize ? fontSize : chartSize,
                color = _this.legendConfig.item.color,
                groupPosition = _this.groupPosition;

            // 添加g.xc-legend-group
            var legendGroup = _this.svg.selectAll('.xc-legend-group')
                .data([_this]);
            legendGroup.enter().append('g')
                .attr('class', 'xc-legend-group');

            // 设置group的偏移值
            legendGroup.attr('transform', "translate(" + groupPosition + ")");

            // 添加每个legendItemGroup
            var itemList = legendGroup.selectAll('.xc-legend-item')
                .data(_this.legendSeries);

            itemList.enter().append('g')
                .attr("class", "xc-legend-item");

            // 如果动态更新数据时可能会出现item减少的情况，这里去掉多余的
            itemList.exit().remove();

            itemList.attr('transform', function (serie) {

                    // 这里保存点击状态，默认选中
                    // 为了刷新时只刷新位置，选中状态不变化
                    this.isChecked = this.isChecked == undefined ?
                        true : this.isChecked;

                    return 'translate(' + serie.position + ')';
                })
                .attr('fill', color)
                .attr('opacity', function () {
                    return this.isChecked ?
                        1 : _this.legendConfig.item.opacity;
                });

            //因为事件是绑定在g上，所以里面的path和text可以删掉节约代码
            itemList.html("");
            //添加文字
            itemList.append('text')
                .attr('x', chartSize * 1.1)
                .attr('y', function () {
                    return fontSize * 0.9;//减去一个偏移量,使其居中
                })
                .attr('font-size', fontSize)
                .append('tspan')
                .attr('dy', function () {
                    //为了文字和图居中
                    if (fontSize > chartSize) return 0;
                    else return (chartSize - fontSize) * 0.5;
                })
                .text(function (serie) {
                    return serie.name;
                });


            //添加图案
            var legendPathD={};
            itemList.append('path')
                .attr('d', function (serie) {

                    //这里新添一个图表需要在这里添加自己独特的图案路径
                    if (!pathD[serie.type]) {
                        throw new Error("pathD." + serie.type + " not found")
                    }

                    // 节约性能，因为图例的大小都是统一的，计算一次就够了
                    if(!legendPathD[serie.type])  legendPathD[serie.type]=pathD[serie.type](chartSize, itemHeight);

                    return legendPathD[serie.type];
                })
                .attr('stroke', function (serie) {
                    return serie.color;
                })
                .attr('fill', function (serie) {
                    return serie.color;
                });

            _this.itemList = itemList;
        },
        ready: function () {
            var _this = this,
                config = _this.legendConfig,
                hoverColor = config.item.hoverColor,
                defaultColor = config.item.color,
                multiple = config.selectedMode != 'single',
                opacity = config.item.opacity;


            var nameList = multiple ?
                this.legendSeries.map(function (serie) {
                    return serie.name;
                }) : [];

            /**
             * 点击legend事件
             * 有多选和单选模式，
             * 多选模式下，初始状态是全部选中，点击某一个legend，状态翻转
             * 单选模式下，初始状态是全部选中，第一次点击某一个legend这个legend保持高亮，其他取消选中。这种模式下除了初始状态，其他都是有且仅有一个legend处于选中状态
             * 刷新图例状态，触发legendClick事件
             */
            _this.itemList.on('click.legend', function (data) {
                this.isChecked = !this.isChecked;
                if (multiple) {
                    //多选的情况下
                    d3.select(this).attr('opacity', this.isChecked ? 1 : opacity)
                } else {
                    // 单选，高亮自己，灰掉别人
                    _this.itemList.attr('opacity', opacity);
                    d3.select(this).attr('opacity', 1);
                }

                reload.call(_this,data.name,multiple,nameList);
            });

            /**
             * 鼠标移入，高亮对应的图表
             * 触发legendMouseenter
             */
            _this.itemList.on('mouseenter.legend', function (data) {
                var color;
                if (hoverColor == 'auto')
                    color = data.color;
                else
                    color = hoverColor;
                var item = d3.select(this);
                item.attr('fill', color);
                _this.fire('legendMouseenter', data.name);
            });

            /**
             * 鼠标移除，移除高亮状态
             * 触发 legendMouseleave
             */
            _this.itemList.on('mouseleave.legend', function (data) {
                var item = d3.select(this);
                item.attr('fill', defaultColor);

                _this.fire('legendMouseleave', data.name);
            });





        }
    });

    /**
     * 分两种模式处理刷新
     * 传递给接受者一个 name的数组
     * @param name
     */
    function reload(name,multiple,nameList) {
        if (multiple) {
            //如果存在则删除，不存在则从_series中拿出添加
            var isAdd = true;
            for (var i = 0, s; s = nameList[i++];) {
                if (s == name) {
                    nameList.splice(i - 1, 1);
                    isAdd = false;
                    break;
                }
            }
            if (isAdd)
                nameList.push(name);

            if (nameList.length == 0) this.fire('tooltipNone');
            else this.fire('tooltipShow');

        } else {
            nameList = [name];
        }

        this.fire('legendClick', nameList);
    }


    /**
     * 计算每一个serie的位置，并根据配置计算返回group位置
     * 此函数会根据计算结果修改margin的值
     * @returns {Array} 返回g.xc-legend-group 的xy位置
     */
    function calcPosition() {
        var _this = this,
            config = _this.legendConfig,
            series = _this.legendSeries,
            itemGap = config.itemGap,
            width = _this.width,
            height = _this.height,
            fontSize = _this.legendConfig.item.fontSize,
            chartSize = _this.legendConfig.item.chartSize,
            itemHeight = fontSize > chartSize ? fontSize : chartSize,
            configX = config.x,
            configY = config.y,
            orient = config.orient,
            margin = _this.margin,
            originalWidth = _this.originalWidth;


        var offsetLength = config.item.chartSize * 1.1;
        var nameList = series.map(function(serie){
           return serie.name;
        });

        //计算name的长度
        var widthList = utils.calcTextWidth(nameList,config.item.chartSize,offsetLength).widthList;

        // 计算每个legendSerie的x,y位置
        var totalWidth = 0, totoalHeight = 0, maxWidth=0, maxHeight=0, colWidth = 0;
        series.forEach(function (serie,index) {

            var itemWidth = widthList[index];
            serie.position = [totalWidth, totoalHeight];

            if (orient != 'vertical') {
                //水平布局的情况
                totalWidth += itemWidth + itemGap;

                // 如果当前行的宽度已经大于当前可绘画区域的最大宽度，进行换行
                if (totalWidth > width) {
                    maxWidth = width;
                    totalWidth = 0;
                    totoalHeight += itemHeight * 1.1;//加上高度的0.1的偏移量做分割
                }
            } else {
                //垂直布局

                // 一列的宽度取决于当前列所有元素的最大宽度
                colWidth = d3.max([colWidth, itemWidth]);
                totoalHeight += itemHeight + itemGap;

                // 一列已经超过最大高度，起一列新列
                if (totoalHeight > height) {
                    maxHeight = height;
                    totoalHeight = 0;
                    totalWidth += colWidth * 1.1;
                }
            }

        });

        var posX, posY, gap = 30;
        maxWidth = maxWidth ? maxWidth : totalWidth; // 只有一行时，maxWidth为0，取totalWidth为这一行的宽度，高度同理
        maxHeight = maxHeight ? maxHeight : totoalHeight;

        if (orient != 'vertical') {
            maxHeight += itemHeight;//最后一行高度未算到
            if (configX == 'right')
                posX = originalWidth - margin.right - maxWidth;
            else if (configX == 'center')
                posX = (width - maxWidth) / 2 + margin.left;
            else
                posX = margin.left;//left

            if (configY == "top") {
                posY = margin.top;
                margin.top += totoalHeight + gap;
            }
            else {
                posY = height - totoalHeight + margin.top;
                margin.bottom += totoalHeight + gap;
            }
        } else {
            maxWidth += colWidth;//最后一列的宽度未算到
            if (configX == 'right') {
                posX = originalWidth - margin.right - maxWidth;
                margin.right += maxWidth + gap;
            } else {
                posX = 0;
                margin.left += maxWidth + gap;
            }

            if (configY == 'center') {
                posY = (height - maxHeight) / 2 + margin.top;
            } else if (configY == 'bottom') {
                posY = (height - maxHeight) + margin.top;
            }
            else
                posY = margin.top;
        }
        return [posX, posY]
    }



    /**
     * 对不同图表类型的serie进行提取成legendSereis统一类型
     * @param series
     * @param data
     * @param messageCenter
     * @param config
     * @returns {Array}
     */
    function parseSeries(series, data, messageCenter) {
        //首先对series按照类型分类，方便针对不同的chart做不同的处理
        var seriesClassify = {}, legendSeries = [];

        // 对series按照type类型进行分类,
        // 这里是为后续的多图联动做铺垫
        series.forEach(function (serie) {
            var type = serie.type;
            if (!type) return;
            seriesClassify[type] || (seriesClassify[type] = []);
            seriesClassify[type].push(serie);
        });


        for (var type in seriesClassify)
            if (seriesClassify.hasOwnProperty(type)) {
                var parseFn = speciallyParseFn(type);
                if (parseFn) legendSeries = legendSeries.concat(parseFn(seriesClassify[type], data, messageCenter));
            }

        //多图表共存时，需要对legendList的name去重，否则会出现name一样，legend图例颜色不一样的情况

        return legendSeries;
    }

    /**
     * 请返回一个Array
     * 其实就是加入了一个color属性，顺便把idx加上了
     * // TODO 不支持name重复问题，待解决
     */
    function speciallyParseFn(type) {
        switch (type) {
            case "radar":
            case "funnel":
            case "pie":
                return multiple;
                break;
            default:
                return defaultParse;
        }
    }

    /**
     * 处理饼图和雷达图之类，一个serie里面包括多个legend实例
     * @param series
     * @param data
     * @param messageCenter
     */
    function multiple(series, data, messageCenter) {
        var legendList = [];
        series.forEach(function (serie) {
            var nameIdx = {}, colorIdx = 0, type = serie.type;
            serie.data.forEach(function (d) {
                var name = d.name, dIdx;

                // 防止重复的名字出现
                if (nameIdx[name] == undefined) {
                    nameIdx[name] = colorIdx;
                    dIdx = colorIdx;
                } else {
                    // 重复出现的名字赋予同一种颜色
                    dIdx = nameIdx[name];
                }
                d.idx = dIdx;

                if (valueInArray(name, data)) {
                    d.color = messageCenter.getColor(dIdx);

                    //携带type类型，后面绘制legend图例有需要
                    d.type = type;
                    legendList.push(d);
                }

                colorIdx++;
            });
        });
        return legendList;
    }

    /**
     * 默认转化规则，适合折线图这种一个serie对象一个图形的图表
     * @param series
     * @param data
     * @param messageCenter
     * @returns {Array}
     */
    function defaultParse(series, data, messageCenter) {
        var dataInSeries = [], getColor = messageCenter.getColor;
        series.forEach(function (serie, idx) {
            if (serie.idx === undefined) serie.idx = idx;

            //name出现在legend.data中
            if (valueInArray(serie.name, data)) {

                // TODO  这里只有折线图可用，等把其他图表的源码看完后回来修改
                if (serie.lineStyle && serie.lineStyle.color !== 'auto')
                    serie.color = serie.lineStyle.color;
                else
                    serie.color = getColor(idx);

                dataInSeries.push(serie);
            }
        });
        return dataInSeries;
    }

    /**
     * array[i]===value or array[i][key]===value
     * @param value
     * @param array
     * @param key
     */
    function valueInArray(value, array, key) {
        for (var i = 0, a; a = array[i++];) {
            if (key && a[key] === value) return a;
            else if (a === value) return a;
        }
        return false;
    }

    var pathD = {
        'line': getLinePath,
        'radar': getRadarPath,
        'pie': getScatterPath,
        'scatter': getScatterPath,
        'funnel': getFunnelPath,
        'bar': getBarPath,
    }

    /**
     * 折线图图例
     * @param size 正方形 宽度
     * @returns {string} -o-
     */
    function getLinePath(size, itemHeight) {
        var r = size / 6, h = itemHeight / 2;
        var ret = 'M0,' + h + 'L' + 2 * r + ',' + h;
        ret += 'A' + r + ',' + r + ' 0 1 1 ' + 2 * r + ',' + (h + 0.00001);
        ret += 'M' + 4 * r + ',' + h + 'L' + 6 * r + ',' + h;
        return ret;
    }

    /**
     * 散点图图例,饼图图例
     * @param size  宽度
     * @returns {string} 圆圈 O
     */
    function getScatterPath(size) {
        var r = size;
        var ret = 'M0,' + 0.5 * r + ' A' + r / 2 + ',' + r / 2 + ' 0 1 1 0,' + (0.5 * r + 0.001);
        return ret;
    }

    /**
     * 六边形
     * @param size
     */
    function getRadarPath(size) {
        var r = size / 2, rad = Math.PI / 180 * 30;
        var x0 = 0, y0 = -r,
            x1 = Math.cos(rad) * r, y1 = Math.sin(rad) * (-r);
        var position = [], ret = "";
        position[0] = [x0, y0], position[1] = [x1, y1], position[2] = [x1, -y1], position[3] = [x0, -y0], position[4] = [-x1, -y1], position[5] = [-x1, y1];
        position.forEach(function (p) {
            //修正坐标
            p[0] += r;
            p[1] += r;
            if (!ret) {
                ret += 'M';
            } else {
                ret += 'L';
            }
            ret += p;
        });
        ret += 'z';
        return ret;

    }

    function getFunnelPath(size) {
        var offset = size / 10;
        return 'M0,' + offset + ' L' + size + ',' + offset + ' L' + size * 0.5 + ',' + size
    }

    function getBarPath(size) {
        var leftTop = [0, size / 4],
            rightTop = [size, size / 4],
            rightBottom = [size, size / 4 * 3],
            leftBottom = [0, size / 4 * 3]
        return 'M' + leftTop + ' L' + rightTop + 'L' + rightBottom + 'L' + leftBottom + 'z';
    }

    function defaultConfig() {
        /**
         * @var legend
         * @extends xCharts
         * @type Object
         */
        var legend = {
            /**
             * @var show
             * @type Boolean
             * @extends xCharts.legend
             * @default false
             * @description 是否显示图例(legend)
             */
            show: false,
            /**
             * @var orient
             * @type String
             * @extends xCharts.legend
             * @default 'horizontal'
             * @values 'horizontal'| 'vertical'
             * @description 图例是水平排列还是垂直排列
             */
            orient: 'horizontal',
            /**
             * @var x
             * @type String
             * @extends xCharts.legend
             * @default 'left'
             * @valuse 'left'|'center'|'right'
             * @description 水平布局时支持'left','center','right';垂直布局时支持'left','right'
             * @description 注：center只在图例只有一行有效，多行第二行开始会自动从最左边开始排
             */
            x: 'left',
            /**
             * @var y
             * @type String
             * @extends xCharts.legend
             * @default 'bottom'
             * @valuse 'top'|'bottom'
             * @description 水平布局时支持'top','bottom',垂直布局无效
             */
            y: 'bottom',
            /**
             * @var itemGap
             * @extends xCharts.legend
             * @type Number
             * @default 10
             * @description 图例与图例之间的间距，单位是像素。水平布局时是水平之间的间距，垂直是上下之间的间距
             */
            itemGap: 10,
            /**
             * @var formatter
             * @type Function
             * @extends xCharts.legend
             * @description 传入data中的每一个name值，返回一个以供显示的字符串
             * @default 默认不处理
             * @example
             *  function(name){
             *      return name+'%'
             *  }
             */
            formatter: function (name) {
                return name;
            },
            /**
             * @var selectedMode
             * @type String
             * @default 'multiple'
             * @extends xCharts.legend
             * @description 选择模式，multiple表示可以同时存在多个选中状态，single表示同一时间只能一个被选中
             * @values 'multiple'|'single'
             */
            selectedMode: 'multiple',
            /**
             * @var data
             * @type Array
             * @extends xCharts.legend
             * @description 要显示哪些legend，Array里面对应series里的name值
             */
            data: [],
            /**
             * @var item
             * @extends xCharts.legend
             * @type Object
             * @description 控制每个图例的样式
             */
            item: {
                /**
                 * @var fontSize
                 * @extends xCharts.legend.item
                 * @type String|Number
                 * @default 14
                 * @description 图例文字的大小
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @extends xCharts.legend.item
                 * @type String
                 * @default '#000'
                 * @description 图例文字的颜色
                 */
                color: '#000',
                /**
                 * @var chartSize
                 * @extends xCharts.legend.item
                 * @type Number
                 * @default 20
                 * @description 图例图标的宽度
                 */
                chartSize: 20,
                /**
                 * @var opacity
                 * @extends xCharts.legend.item
                 * @type Number
                 * @default 0.3
                 * @description 图例未被选中时的透明程度
                 */
                opacity: 0.3,
                /**
                 * @var hoverColor
                 * @extends xCharts.legend.item
                 * @type String
                 * @default 'auto' 保持和图标颜色一致
                 */
                hoverColor: 'auto'
            }
        }
        return legend;
    }


}(window))
},{}],11:[function(require,module,exports){
/**
 * Author liuyang46@meituan.com
 * Date 16/3/9
 * Describe
 */


(function(window){


    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    var components = xCharts.components;
    utils.inherits(resize, components['Component']);
    components.extend({resize: resize});

    var chartList={};

    d3.select(window).on('resize.refresh',function(){

        for(var k in chartList){
            if(chartList.hasOwnProperty(k)) chartList[k].resize();
        }
    });

    function resize(messageCenter, config, type) {
        if(config.resize.enable) components['Component'].call(this, messageCenter, config, type);
    }

    resize.prototype.extend = xCharts.extend;

    resize.prototype.extend({
        init:function(messageCenter, config, type, series){
            this.config = utils.merage(defaultConfig,config[type]);
            messageCenter.refreshAnimationEase = this.config.animationEase;
            messageCenter.refreshAnimationTime = this.config.animationTime;
        },
        ready:function(){
            // 比动画时间多1S
            var _this = this,
                animationTime = _this.config.animationTime;


            var resizeFn = utils.throttle(function(){
                _this.messageCenter.refresh();
            },animationTime+300,true);

            _this.resize = resizeFn;

            add(_this);

            _this.on("chartRemoveBind",function(){
                _this.unBind();
            })
        },
        unBind:function(){
            remove(this);
        },
        refresh:function(){},
        updateSeries:function(){}
    });

    function add(ctx){
        chartList[ctx.messageCenter.id] = ctx;
    }

    function remove(ctx){
        delete chartList[ctx.messageCenter.id];
    }

    /**
     * @var resize
     * @type Object
     * @description 当容器改变时，是否自动刷新当前图表
     * @extends xCharts
     * @default true
     */
    var defaultConfig = {
        /**
         * @var refresh
         * @type Boolean
         * @description 当容器改变时，是否自动刷新当前图表
         * @extends xCharts.resize
         * @default false
         */
        enable:false,
        /**
         * @var animationEase
         * @type String
         * @description 当容器改变时，刷新动画
         * @extends xCharts.resize
         * @default 'linear'
         */
        animationEase:'linear',
        /**
         * @var animationEase
         * @type Number
         * @description 当容器改变时，刷新动画时间,单位ms
         * @extends xCharts.resize
         * @default 300
         */
        animationTime:300
    }

}(window))
},{}],12:[function(require,module,exports){
/**
 * xCharts.title
 * extends Component
 */
(function (window) {

    // 获取必须的全局声明
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;

    // 获取xCharts的components存储点
    var components = xCharts.components;

    // 获取组件基类Component并继承方法
    var Component = components['Component'];
    utils.inherits(title, Component);

    // 往xCharts.components上添加自己
    components.extend({title: title});


    /**
     * title的构造函数
     * @param messageCenter 消息中心
     * @param config 配置文件
     * @param type title
     */
    function title(messageCenter, config, type) {

        //show=false时不做显示处理
        if(config.title.show === false) {
            this._show = false;
            return;
        }else{
            this._show = true;
        }

        //继承Component的属性
        Component.call(this, messageCenter, config, type);
    }

    title.prototype.extend = xCharts.extend;//添加extends函数

    title.prototype.extend({
        init: function (messageCenter) {

            // 用户的配置覆盖默认的配置项
            this.titleConfig = utils.merage(defaultConfig(), this.config.title);
            this.height = messageCenter.originalHeight;
            this.titlePosition = calculateTitlePosition.call(this);
        },
        render: function () {
            var _this = this,
                textFontSize = _this.titleConfig.textStyle.fontSize,
                subtextFontSize = _this.titleConfig.subtextStyle.fontSize,
                x = _this.titlePosition.x,
                y = _this.titlePosition.y,
                textAnchor = _this.titlePosition.textAnchor;

            /*===================================*/
            /* 绘画开始 */

            //第一步在svg下添加一个text，目的是为了能在浮动的时候能覆盖所有的charts
            var title = _this.svg.selectAll('.xc-title')
                .data([_this.titleConfig]);

            title.enter().append('text')
                .attr('class', 'xc-title');

            //添加主标题
            var titleText = title.selectAll('.xc-title-text')
                .data([_this.titleConfig]);

            titleText.enter().append('tspan')
                .attr('class', 'xc-title-text');

            titleText.text(function (config) {

                //设置主标题文字
                return config.text;
            })
                //设置主标题位置
                .attr('x', x)
                .attr('y', y)
                .attr('font-size', textFontSize)
                .attr('fill', function (config) {
                    return config.textStyle.color;
                })
                .attr('text-anchor', textAnchor);

            //添加副标题
            var subtitleText = title.selectAll('.xc-title-subtext')
                .data([_this.titleConfig]);

            subtitleText.enter().append('tspan')
                .attr('class', 'xc-title-subtext');

            subtitleText.text(function (config) {

                // 设置副标题文字
                return config.subtext;
            })
                .attr('x', x)
                .attr('dy', '1.2em')
                .attr('fill', function (config) {
                    return config.subtextStyle.color;
                })
                .attr('font-size', subtextFontSize)
                .attr('text-anchor', textAnchor);
        },
        updateSeries: function () {
            //数据更新与title无关，不做处理
        }
    });

    /**
     * 计算title的xy位置
     * @returns {{x: *, y: *, textAnchor: string}}
     */
    function calculateTitlePosition() {
        var _this = this,
            textAnchor = 'start',
            textFontSize = _this.titleConfig.textStyle.fontSize,
            subtextFontSize = _this.titleConfig.subtextStyle.fontSize,
            x = _this.titleConfig.x,
            y = _this.titleConfig.y,
            height = _this.height;

        /**
         * 计算title的x位置，默认center
         * 预定位置有left,start,end 只有这些预定值会改变textAnchor
         * 非预定值支持常用的css单位
         */
        if (x === 'left') {
            x = 0;
            textAnchor = 'start';
        } else if (x === 'center') {
            x = '50%';

            // 只有设置textAnchor为middle才能实现完全居中，强迫症的福音O(∩_∩)O
            textAnchor = 'middle';
        } else if (x === 'right') {
            x = '100%';
            textAnchor = 'end';
        }

        /**
         * 计算title的y位置
         * 默认top位置
         * 只有在top位置时会使margin.top增加，为了不和其他元素重叠
         * 但是非top情况实在难以计算重叠情况，直接不管,称之为浮动(会出现title遮盖住图表或其他文字的现象)
         */
        if (y == 'top') {
            y = '1em';

            // 只有在y==top时，文本不浮动，需要调整margin.top 防止和charts重叠
            _this.margin.top += parseFloat(textFontSize) + parseFloat(subtextFontSize);
        } else if (y == 'center') {
            y = '50%';
        } else if (y == 'bottom') {
            y = height - parseFloat(subtextFontSize) - parseFloat(textFontSize);
        }

        return {
            x: x,
            y: y,
            textAnchor: textAnchor,
        }
    }


    function defaultConfig() {
        /**
         * title配置项
         * @var title
         * @type Object
         * @extends xCharts
         * @description 标题配置项，设置标题文本，位置相关的属性
         */
        var title = {
            /**
             * @var show
             * @extends xCharts.title
             * @type Boolean
             * @default true
             * @description 是否显示标题
             */
            show: true,
            /**
             * @var text
             * @extends xCharts.title
             * @type String
             * @description 主标题文本
             */
            text: '',
            /**
             * @var subtext
             * @extends xCharts.title
             * @type String
             * @description 副标题文本
             */
            subtext: '', //副标题文本
            /**
             * @var x
             * @extends xCharts.title
             * @type String|Number
             * @values 'center'|'left'|'right'|number(单位px或百分比)
             * @default 'center'
             * @description
             * 控制标题水平位置
             * @example
             * x:'90'和x:90结果一样都是以x=0为基准向右偏移90px
             * x:'50%' 表示以x=0为基准向右偏移容器宽度的50%,居中请用center
             */
            x: 'center',
            /**
             * @var y
             * @extends xCharts.title
             * @type String|Number
             * @values 'top'|'center'|'bottom'|number(单位px或百分比)
             * @default 'top'
             * @description 控制标题垂直位置
             * @description 注意：修改y的位置会造成标题浮动，与图表重叠在一起
             * @example
             * y:'90'和y:90结果一样，以y=0为基准想下偏移90px
             * y:'50%' 表示以y=0为基准向下偏移容器高度的50%,居中请用center
             */
            y: 'top',
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.title
             * @description 主标题样式控制,也可以通过设置.xc-title-text的css属性控制样式
             * @example
             *  textStyle{
             *      fontSize:14,
             *      color:'#000'
             *  }
             */
            textStyle: {
                /**
                 * @var fontSize
                 * @extends xCharts.title.textStyle
                 * @type Number
                 * @default 14
                 * @description 主标题字号大小，可设置.xc-title-text的css属性控制
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @extends xCharts.title.textStyle
                 * @type String
                 * @default '#000'
                 * @description 主标题颜色,可设置.xc-title-text的css属性控制
                 */
                color: '#000', //默认颜色
            },
            /**
             * @var subtextStyle
             * @type Object
             * @extends xCharts.title
             * @description 副标题样式控制,也可以通过设置.xc-title-subtext的css属性控制样式
             * @example
             *  subtextStyle{
             *      fontSize:14,
             *      color:'#000'
             *  }
             */
            subtextStyle: {
                /**
                 * @var fontSize
                 * @extends xCharts.title.subtextStyle
                 * @type Number
                 * @default 12
                 * @description 副标题字号大小，可设置.xc-title-subtext的css属性控制
                 */
                fontSize: 12,
                /**
                 * @var color
                 * @extends xCharts.title.subtextStyle
                 * @type String
                 * @default '#000'
                 * @description 副标题颜色,可设置.xc-title-subtext的css属性控制
                 */
                color: '#00',
            }

        }
        return title;
    }
}(window))
},{}],13:[function(require,module,exports){
/**
 * components.tooltip
 */

(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    var components = xCharts.components;
    var Component = components['Component'];

    utils.inherits(tooltip, Component);

    //继承方法
    components.extend({tooltip: tooltip});

    function tooltip(messageCenter, config, type) {

        //show=false时不做显示处理
        if (config.tooltip.show === false) {
            this._show = false;
            return;
        } else {
            this._show = true;
        }

        //继承属性
        Component.call(this, messageCenter, config, type);
    }

    tooltip.prototype.extend = xCharts.extend;

    // 扩展自己独有的方法
    tooltip.prototype.extend({
        init: function (messageCenter, config) {
            this.originalWidth = messageCenter.originalWidth;
            this.originalHeight = messageCenter.originalHeight;
            this.xAxisScale = messageCenter.xAxisScale;
            this.axisX = null;
            this.axisY = null;
            this.tooltipWidth = null;
            this.tooltipHeight = null;

            // tooltip显示一级开关
            // 设置为false，不论任何情况下都会不显示tooltip，主要是为了当图表没有显示的数据后强制不显示tooltip
            this.display = true;

            // tooltip显示二级开关
            // 当前tooltip框状态
            this.tooltipShow = false;


            //没有x轴，多x轴，x轴type==value 将会改成item触发方式
            if (!this.config.xAxis || this.config.xAxis.length > 1 || this.config.xAxis[0].type == 'value') this.config.tooltip.trigger = 'item';
            this.tooltipConfig = utils.merage(defaultConfig(), config.tooltip);

        },
        render: function () {

            /**
             * 就是添加一个div框
             * @type {render}
             * @private
             */

            this.tooltip = this.div.append('div')
                .attr('class', 'xc-tooltip');
        },
        ready: function () {
            var _this = this;

            //触发方式为item时，交给各个chart自己处理去,这里只负责axis触发方式
            if (_this.tooltipConfig.trigger !== 'axis') return;

            // 保存前一个tooltip所在的区域，用于判断当前tooltip是否需要刷新位置
            var oldSectionNumber = -1;
            var firstMove = true;
            var tooltipX=-1;
            _this.div.on('mousemove.tooltip', function () {

                // 一级开关关闭，强制不显示，即使鼠标在正常的范围内
                if (_this.display === false) return;

                // 只需第一次移动时计算边界即可
                if (firstMove) {
                    firstMove = false;
                    calcChartBorder(_this);
                    _this.axisLine = appendTooltipLine.call(_this);
                }


                // 获取当前鼠标坐标
                var position = d3.mouse(this),
                    mouseX = position[0],
                    mouseY = position[1],
                    axisLine = _this.axisLine;


                if ( judgeOutOfBounds.call(_this,mouseX,mouseY) ) {
                    //超出边界，隐藏tooltip
                    _this.hiddenTooltip();
                    return;
                } else if (!_this.tooltipShow) {
                    _this.showTooltip();
                }


                var xScale = _this.messageCenter.xAxisScale[0],
                    xAxisData = _this.config.xAxis[0].data,

                    // TODO 有结束绘制事件后，只需计算一次
                    width = _this.originalWidth - _this.margin.left - _this.margin.right,
                    height = _this.originalHeight - _this.margin.top - _this.margin.bottom,
                    sectionLength = xAxisData.length - 1,
                    sectionWidth = width / sectionLength; //计算每个区域的宽度,注意这里是均分
                var sectionNumber = Math.round((mouseX - _this.margin.left) / sectionWidth);//得到在哪个区域，从0开始


                if (sectionNumber !== oldSectionNumber) {
                    //触发tooltipSectionChange事件，获取文本
                    var tooltipHtml="";

                    _this.fire("tooltipSectionChange", sectionNumber, function (html) {
                        tooltipHtml += html;
                        _this.setTooltipHtml(tooltipHtml);
                    }, _this.tooltipConfig.formatter);

                    //如果是柱状图的话，需要使用bar上提供的接口来获取x坐标
                    if (_this.messageCenter.charts['bar']) {
                        tooltipX = _this.messageCenter.charts['bar'].getTooltipPosition(sectionNumber);
                    } else {
                        tooltipX = xScale(xAxisData[sectionNumber]);
                    }

                    axisLine.attr('x1', tooltipX).attr('x2', tooltipX).attr('y1', 0).attr('y2', height);
                    tooltipX += _this.margin.left;//修正tooltip的位置

                    oldSectionNumber = sectionNumber;
                }

                _this.setPosition([tooltipX, mouseY]);

            });

            //这里是为了当没有任何需要显示的值时，能保证tooltip不出现
            _this.on('tooltipNone', function () {
                _this.display = false;
            });
            _this.on('tooltipShow', function () {
                _this.display = true;
            });

            _this.div.on('mouseleave.tooltip', function () {
                _this.hiddenTooltip();//鼠标过快划出，单纯监听mousemove很容易造成隐藏失败，这里加重保险
            });

        },
        refresh: function () {
            /**
             * 只需重置图表位置，重新进行绑定事件
             * 并不需要重新render
             */
            if (!this._show) return true;

            this.init(this.messageCenter, this.config, this.type, this.config.series);//初始化
            this.ready();
        },
        updateSeries: function () {},
        showTooltip: function () {
            var _this = this;
            _this.tooltipShow = true;
            _this.tooltip.style( {visibility: 'visible'} );
            // 显示线条
            if(this.tooltipConfig.trigger === 'axis') _this.axisLine.attr('opacity', 1);


        },
        hiddenTooltip: function () {
            var _this = this;
            _this.fire('tooltipHidden');
            _this.tooltipShow = false;

            // 隐藏方框
            _this.tooltip.style({visibility: 'hidden'});

            // 隐藏线条
            if(this.tooltipConfig.trigger === 'axis') _this.axisLine.attr('opacity', 0);
            _this.main.selectAll('.xc-tooltip-line').attr('opacity', 0);
        },
        setPosition: function (position, offsetX, offsetY) {
            var _this = this;
            if (!_this.tooltipShow) return;//tooltip处于未显示状态，不做任何处理

            offsetX = offsetX || 5, offsetY = offsetY || 5;

            // 计算一次tooltip的宽高
            if (!_this.tooltipWidth) {
                _this.tooltipWidth = _this.tooltip.node().clientWidth;
                _this.tooltipWidth = parseFloat(_this.tooltipWidth);
                _this.tooltipHeight = _this.tooltip.node().clientHeight;
                _this.tooltipHeight = parseFloat(_this.tooltipHeight);
            }

            var tooltipWidth = _this.tooltipWidth,
                tooltipHeight = _this.tooltipHeight,
                width = _this.originalWidth,
                height = _this.originalHeight,
                tooltipX = position[0], tooltipY = position[1];


            //tooltip当前位置超出div最大宽度,强制往左边走
            if (tooltipX + tooltipWidth > width) {
                tooltipX = tooltipX - tooltipWidth - offsetX;
            } else {
                tooltipX += offsetX;
            }
            if (tooltipY + tooltipHeight > height) {
                tooltipY = tooltipY - tooltipHeight - offsetY;
            } else {
                tooltipY += offsetY;
            }

            _this.tooltip.style({transform: "translate(" + tooltipX + "px," + tooltipY + "px)"})

        },
        setTooltipHtml: function (html) {
            this.tooltip.html(html);
        }
    });

    /**
     * 判断鼠标是否出界
     * @param mouseX 鼠标X
     * @param mouseY 鼠标Y
     * @return {boolean} 是否出界
     */
    function judgeOutOfBounds(mouseX,mouseY) {
        var axisX = this.axisX,
            axisY = this.axisY;

        return mouseX < axisX[0] ||
            mouseX > axisX[1] ||
            mouseY < axisY[0] ||
            mouseY > axisY[1];
    }

    /**
     * 添加竖线
     */
    function appendTooltipLine() {
        // 添加一根竖线
        var axisLine = this.main.selectAll('.xc-tooltip-line')
            .data([this]);
        axisLine.enter().append('line')
            .attr('class', 'xc-tooltip-line')
            .attr('stroke', this.tooltipConfig.lineColor)
            .attr('stroke-width', this.tooltipConfig.lineWidth)
            .attr('opacity', 0);

        return axisLine;
    }

    /**
     * 计算图表边界
     * @param _this
     */
    function calcChartBorder(_this) {

        _this.axisX = [];
        _this.axisX[0] = _this.margin.left;
        _this.axisX[1] = _this.originalWidth - _this.margin.right;


        _this.axisY = [];
        _this.axisY[0] = _this.margin.top;
        _this.axisY[1] = _this.originalHeight - _this.margin.bottom;

    }

    function defaultConfig() {
        /**
         * @var tooltip
         * @type Object
         * @extends xCharts
         * @description 控制提示框
         */
        var tooltip = {
            /**
             * @var show
             * @extends xCharts.tooltip
             * @description 是否显示tooltip提示框
             * @type Boolean
             * @default true
             */
            show: true,
            /**
             * @var trigger
             * @extends xCharts.tooltip
             * @type String
             * @values 'axis'|'item'
             * @default 'item'
             * @description 触发方式,'axis'只对单x轴有效
             */
            trigger: 'axis',
            /**
             * @var formatter
             * @extends xCharts.tooltip
             * @type Function
             * @description 格式化函数，如果在各项series里面定义了formatter会覆盖此函数
             * @default 请查看各个series里面的格式化函数
             */
            //formatter: function (name,data) {
            //    return name+':&nbsp;'+data;
            //},
            /**
             * @var lineColor
             * @extends xCharts.tooltip
             * @type String
             * @default '#008ACD'
             * @description 在trigger='axis'时有效
             * @description 竖直线的颜色
             */
            lineColor: '#008ACD',
            /**
             * @var lineWidth
             * @extends xCharts.tooltip
             * @type Number
             * @default 2
             * @description 在trigger='axis'时有效
             * @description 竖直线的宽度
             */
            lineWidth: 2
        }
        return tooltip;
    }
}(window))
},{}],14:[function(require,module,exports){
/**
 * Created by liuyang on 15/10/23.
 */
(function () {
    var utils = xCharts.utils;

    var toString = Object.prototype.toString;

    /**
     * isArguments之类的函数
     * @type {string[]}
     */
    var list = ['Arguments', 'Object', 'Array', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'];
    list.forEach(function (name) {
        utils['is' + name] = function (obj) {
            return toString.call(obj) === '[object ' + name + ']';
        };
    })
    /**
     * 类型返回函数
     * @param obj 判断对象
     * @returns {*} [object Xxxx];
     */
    utils['getType'] = function (obj) {
        var string = toString.call(obj);
        var type = string.match(/\[object\s(\w+?)\]/)[1];
        return type;
    };
    utils['copy'] = copy;
    utils['merage']=merage;
    utils['inherits']=inherits;
    utils['loop']=loop;
    utils['getColor']=getColor;
    utils['calcTextWidth']=calcTextWidth;
    utils['throttle']=throttle;
    utils['debounce']=debounce;

    /**
     * 复制函数
     * @param form 需要复制的对象
     * @param deep 是否深复制
     * @returns {*}
     */
    function copy(form, deep) {
        if(!form) return form;
        var type = utils.getType(form);
        if(type=="Object" || type=='Array'){
            var clone=type=='Object'?{}:[];
            var value;
            for(var k in form){
                if (form.hasOwnProperty(k)) {
                    value=form[k];
                    if(deep && ( utils.isObject(value)||utils.isArray(value) )){
                        clone[k]=arguments.callee(value,true);
                    }else{
                        clone[k]=form[k];
                    }
                }
            }
            return clone;
        }else{
            return form;
        }
    }

    /**
     * 合并函数
     * @param to 被合并对象
     * @param form 来源
     */
    function merage(to,form){
        var value;
        for (var k in form) {
            if (form.hasOwnProperty(k)) {
                value = form[k];
                if (utils.isObject(value)) {
                    to[k] =to[k]|| {};
                } else if (utils.isArray(value)) {
                    to[k] =to[k]|| [];
                }else{
                    //非数组和对象不处理
                    to[k]=form[k];
                    continue;
                }
                arguments.callee(to[k], form[k], true);
            }
        }
        return to;
    }

    //原型继承
    function inherits(clazz, baseClazz) {
        var clazzPrototype = clazz.prototype;

        function F() {
            this.superClass=baseClazz.prototype;
        }

        F.prototype = baseClazz.prototype;
        clazz.prototype = new F();

        clazz.constructor = clazz;
    }
    //内部迭代用，返回第一个参数
    function loop(arg){
        return arg;
    }

    /**
     * @var color
     * @extends xCharts
     * @type Array
     * @description 全局color数组，如果设置会覆盖默认的颜色配置，系统会循环从数组中取色
     * @example
     *  [
     * '#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80',
     * '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa',
     * '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050',
     * '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'
     * ]
     */
    function getColor(palette) {

        if (!palette && !Array.isArray(palette) ) {
            palette = [
                '#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80',
                '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa',
                '#07a2a4', '#9a7fd1', '#588dd5', '#f5994e', '#c05050',
                '#59678c', '#c9ab00', '#7eb00a', '#6f5553', '#c14089'
            ]

        }

        return function (idx) {
            return palette[idx % palette.length];
        }
    }

    /**
     * 计算当前文字的长度，放入浏览器中计算
     * @param fontSize 文字大小
     * @param offsetWidth 需要追加的长度
     * @param {Array} list 需要计算的文字
     */
    function calcTextWidth(list,fontSize,offsetWidth,offsetHeight){
        if(!Array.isArray(list)){
            list=[list];
        }

        if(offsetWidth === undefined){
            offsetWidth=0;
        }

        if(offsetHeight === undefined){
            offsetHeight=0;
        }


        /**
         * 添加一个隐藏的span
         * 设置span的文字来获取文字在浏览器里实际的宽高
         */
        var textSpan = document.createElement('span');
        textSpan.style.fontSize = fontSize + 'px';
        textSpan.style.margin = "0px";
        textSpan.style.padding = "0px";
        textSpan.style.border = "none";
        textSpan.style.position = 'absolute';
        textSpan.style.visibility = "hidden";
        document.body.appendChild(textSpan);

        var widthList=[],heightList=[];
        list.forEach(function(text){

            // 给span设置文字
            textSpan.innerText === undefined ? textSpan.textContent = text : textSpan.innerText = text; //兼容firefox

            //获取实际宽度,并在实际宽度上加上偏移宽度
            var itemWidth = parseFloat(textSpan.offsetWidth) + offsetWidth;
            var itemHeight = parseFloat(textSpan.offsetHeight) + offsetHeight;
            widthList.push(itemWidth);
            heightList.push(itemHeight);
        });

        //移除这个span,因为用不到了
        document.body.removeChild(textSpan);
        return {
            widthList:widthList,
            heightList:heightList
        };
    }

    /*
     * 频率控制 返回函数连续调用时，fn 执行频率限定为每多少时间执行一次
     * @param fn {function}  需要调用的函数
     * @param delay  {number}    延迟时间，单位毫秒
     * @param immediate  {bool} 给 immediate参数传递false 绑定的函数先执行，而不是delay后后执行。
     * @return {function}实际调用函数
     */
    function throttle(fn,delay, immediate, debounce) {
        var curr = +new Date(),//当前事件
            last_call = 0,
            last_exec = 0,
            timer = null,
            diff, //时间差
            context,//上下文
            args,
            exec = function () {
                last_exec = curr;
                fn.apply(context, args);
            };
        return function () {
            curr= +new Date();
            context = this,
                args = arguments,
                diff = curr - (debounce ? last_call : last_exec) - delay;
            clearTimeout(timer);
            if (debounce) {
                if (immediate) {
                    timer = setTimeout(exec, delay);
                } else if (diff >= 0) {
                    exec();
                }
            } else {
                if (diff >= 0) {
                    exec();
                } else if (immediate) {
                    timer = setTimeout(exec, -diff);
                }
            }
            last_call = curr;
        }
    };

    /*
     * 空闲控制 返回函数连续调用时，空闲时间必须大于或等于 delay，fn 才会执行
     * @param fn {function}  要调用的函数
     * @param delay   {number}    空闲时间
     * @param immediate  {bool} 给 immediate参数传递false 绑定的函数先执行，而不是delay后后执行。
     * @return {function}实际调用函数
     */

    function debounce(fn, delay, immediate) {
        return throttle(fn, delay, immediate, true);
    };

}())
},{}],15:[function(require,module,exports){
/**
 * Created by liuyang on 15/10/23.
 * TODO 当出现不支持的参数时，忽略还是报错关闭绘制
 */
(function (window) {

    /**
     * 入口，自动调用new init
     * @param container 块级元素 选中的容器,容器需要有宽高
     * @returns {xCharts.init}
     */
    var d3 = window.d3;
    var id = 1;

    function xCharts(container) {

        if (!d3) {
            console.error('The library depends on d3js http://d3js.org/ ')
            return;
        }

        return new xCharts.prototype.init(container);
    }

    xCharts.extend = xCharts.prototype.extend = function (obj) {
        for (var k in obj) {
            if (obj.hasOwnProperty(k))
                this[k] = obj[k];
        }
    }
    var chartsList={};
    xCharts.prototype.extend({
        //初始化方法
        // TODO 当在同一个容器里进行初始化时，会使前面的图表还留存在内存中，当监听refresh时，会造成获取不到宽高报NAN错,这里想个办法辨识容器是否有以前的charts，然后解除引用
        init: function (container) {
            container = d3.select(container);

            var xcContainer = container.select(".xc-container")
            if(xcContainer.node()){
                removeBind(xcContainer);
            }

            container.html('');//清理容器里面的所有节点


            this.container = container;
            this.originalWidth = getWidth(container.node());
            this.originalHeight = getHeight(container.node());
            this.id = id++; //唯一标识，<use> 在多图表使用时，区别其他图用
            this.div = container.append('div').attr('class', 'xc-container');
            this.svg = this.div.append('svg').attr('class', 'xc-svg').attr('width', this.originalWidth).attr('height', this.originalHeight);
            this.defs = this.svg.append('defs');
            this.clippath = this.defs.append("clipPath").attr('id',"xc-firstdraw-"+this.id);
            this.firstDrawingRect = this.clippath.append("rect").attr('x',0).attr('y',0).attr("width",0).attr('height',this.originalHeight);

            //添加clippath
            // todo 画完记着删掉
            this.svg.attr("clip-path","url(#xc-firstdraw-"+this.id+")");

            this.main = this.svg.append('g').attr('class', 'xc-main');
            this.margin = {top: 7, left: 10, right: 15, bottom: 20};
            this.originMargin = xCharts.utils.copy(this.margin);//克隆一个副本，提供给refresh重置用
            this.EventList = {};



            // 生成随机字符串
            var chartID = Math.random().toString(36).substr(2);
            this.div.attr('xcharts-id',chartID);
            //保留引用
            chartsList[chartID] = this;
            return this;
        },
        loadConfig: function (config) {
            //加入时间测试
            defaultConfigMerage.call(this,config);
            this.firstDrawing(this.config);

        },
        firstDrawing: function (config) {

            //可以使用的组件列表,需要修改margin的组件请放在'xAxis','yAxis'前面
            var componentsList = ['title', 'tooltip', 'legend', 'yAxis', 'xAxis', 'resize'];
            var component, i = 0;
            this.components = {};
            this.charts = {};
            while (component = componentsList[i++]) {
                if (!config[component] || this.components[component]) {
                    continue;
                }
                var componentClass = xCharts.components[component];

                //特殊处理下axis
                if (component == 'xAxis' || component == 'yAxis') {
                    componentClass = xCharts.components['axis'];
                }

                //容错处理
                if (!componentClass) {
                    console.warn('components/%s.js is not loaded!', component.match(/Axis/) ? 'axis' : component);
                    continue;
                }
                this.components[component] = new componentClass(this, config, component);

            }

            seriesColor(config.series,this);

            //计算折线图之类的charts实际可用空间
            this.width = this.originalWidth - this.margin.left - this.margin.right;
            this.height = this.originalHeight - this.margin.top - this.margin.bottom;

            //mainGroup设置偏移量
            this.main.attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
            //调用图表
            config.series || (config.series = []);
            for (var i = 0, s; s = config.series[i++];) {
                var type = s.type;
                if (this.charts[type]) {
                    //每个图表类只调用一次
                    continue;
                }
                var chartClass = xCharts.charts[type];


                //容错处理
                if (!chartClass) {
                    console.warn('charts/%s.js is not loaded!', type);
                    continue;
                }

                this.charts[type] = new chartClass(this, config);
            }

            // 绘画结束,淡入动画
            var transitionStr;
            if(this.config.animation.enable){
                 transitionStr = "width "+this.config.animation.animationTime+"ms linear";
            }else{
                transitionStr = "width "+0+"ms linear";
            }

            this.firstDrawingRect.style("transition",transitionStr);
            this.firstDrawingRect.style("width",this.originalWidth);

            // 动画结束后删掉clip-path
            var _this =this;
            setTimeout(function(){
                _this.svg.attr("clip-path","url(#xc-firstdraw-"+this.id+")");
            },this.config.animation.animationTime+100);
        },
        refresh: function () {
            //console.time("refresh time");
            //刷新产生的条件,预知
            //1 容器大小发生了改变，修正
            this.originalWidth = getWidth(this.container.node());
            this.originalHeight = getHeight(this.container.node());
            this.margin = xCharts.utils.copy(this.originMargin);

            this.svg.attr('width', this.originalWidth).attr('height', this.originalHeight);

            var animationTime = this.refreshAnimationTime;
            var animationEase = this.refreshAnimationEase;

            //第二步 通知已有组件刷新
            var components = this.components, charts = this.charts;
            for (var k in components) {
                if (components.hasOwnProperty(k)) {
                    var component = components[k];
                    component.refresh(animationEase,animationTime);
                }
            }

            this.width = this.originalWidth - this.margin.left - this.margin.right;
            this.height = this.originalHeight - this.margin.top - this.margin.bottom;

            //第三步 通知已有图表刷新
            for (var k in charts) {
                if (charts.hasOwnProperty(k)) {
                    var chart = charts[k];
                    chart.refresh(animationEase,animationTime);
                }
            }

            //console.timeEnd("refresh time");

        },
        _updateSeries: function (series) {

            // TODO 开放这个功能

            this.config.series = xCharts.utils.copy(series, true);
            this.margin = xCharts.utils.copy(this.originMargin);
            //第一步 通知已有组件刷新
            var components = this.components, charts = this.charts;
            for (var k in components) {
                if (components.hasOwnProperty(k)) {
                    var component = components[k];
                    component.updateSeries(this.config.series);
                }
            }

            this.width = this.originalWidth - this.margin.left - this.margin.right;
            this.height = this.originalHeight - this.margin.top - this.margin.bottom;

            //第二步 通知已有图表刷新
            for (var k in charts) {
                if (charts.hasOwnProperty(k)) {
                    var chart = charts[k];
                    chart.updateSeries(this.config.series);
                }
            }
        },
        on: function (name, callback) {
            //契合D3，一个namespace只会有一个fn，后来的会使上面的fn失效
            //满足先到先响应的策略

            // 一个实例有且仅有一个Eventlist，多个实例直接互不干扰
            var list = this.EventList;

            //分割eventname和namespace 例如tooltipSectionChange.axis
            var arr = name.split('.');
            var eventName = arr[0];

            //如果用户不设置namecpace，默认为default
            var nameSpace = arr[1] ? arr[1] : 'default';

            list[eventName] || ( list[eventName] = []);

            //如果有相同的namespace，移除该事件
            for (var i = 0, l; l = list[eventName][i++];) {
                if (l.nameSpace == nameSpace) {
                    list[eventName].splice(i - 1, 1);
                    break;
                }
            }
            list[eventName].push({nameSpace: nameSpace, callback: callback})
        },
        /**
         * 触发某个事件
         * @param type 事件名称
         * @param ...args 事件参数
         */
        fire: function (type/*,...args*/) {
            var args = Array.prototype.slice.call(arguments, 1);
            var list = this.EventList[type];
            if (!list) return;
            list.forEach(function (l) {
                l.callback.apply('', args);
            })
        }
    });



    //和jquery类似，这样做new init的实例能访问到xCharts.prototype上的属性和方法
    xCharts.prototype.init.prototype = xCharts.prototype;

    //组件和图表控件的注册存放地
    // 这样做xCharts可以知道哪些组件被用户引入方便调用
    // 为以后支持模块引入做准备
    xCharts.extend({
        //图表库
        charts: {
            extend: xCharts.extend
        },
        //组件库
        components: {
            extend: xCharts.extend
        },
        //工具库
        utils: {
            extend: xCharts.extend
        },
    });


    /**
     * 获取对应的css值
     * @param container 需要计算的元素
     * @param type css名称
     * @param boolean 是否运用parseFloat
     * @returns {*}
     */
    function css(container, type, boolean) {
        var style = getComputedStyle(container);
        var value = style[type];

        return boolean ? parseFloat(value) : value;

    }

    /**
     * 获取传入dom的真实宽，在border-box模式下会去掉padding和border宽度
     * @param {DOM} container
     * @returns width
     */
    function getWidth(container) {
        var width = css(container, 'width', true);
        if (css(container, 'boxSizing') !== 'border-box') {
            return width;
        }
        width = width - css(container, 'borderLeftWidth', true)
            - css(container, 'paddingLeft', true)
            - css(container, 'paddingRight', true)
            - css(container, 'borderRightWidth', true);
        return width;
    }

    /**
     * 获取传入dom的真实高，在border-box模式下会去掉padding和border高度
     * @param {DOM} container
     * @returns height
     */
    function getHeight(container) {
        var height = css(container, "height", true);
        if (css(container, 'boxSizing') !== 'border-box') {
            return height;
        }
        height = height - css(container, 'borderTopWidth', true)
            - css(container, 'paddingTop', true)
            - css(container, 'paddingBottom', true)
            - css(container, 'borderBottomWidth', true);
        return height;
    }

    /**
     * 处理图表sereis的color
     * @param series
     */
    function seriesColor(series,ctx){
        var serieClassify={},getColor = ctx.getColor;
        series.forEach(function(serie){
            var type = serie.type;
            serieClassify[type] = serieClassify[type] == undefined?
                serieClassify[type]=[]:
                serieClassify[type];
            serieClassify[type].push(serie);
        });

        for(var k in serieClassify){
            if(serieClassify.hasOwnProperty(k) ){
                switch (k){
                    case "line":
                    case "scatter":
                    case "bar":
                        serieClassify[k].forEach(function(serie,index){
                            serie.idx = index;
                        });
                        break;
                    case "pie":
                    case "funnel":
                    case "radar":
                        serieClassify[k].forEach(function(serie){
                            serie.data.forEach(function(dataValue,index){
                                dataValue.idx = index;
                            });
                        });
                        break;
                    default :
                        console.error("type=%d not supported")
                }
            }
        }
    }

    /**
     * 合并一些全局性质的config
     * @param config
     */
    function defaultConfigMerage(config){
        //深复制config
        var utils = xCharts.utils;
        this.config = utils.copy(config, true);
        this.getColor = utils.getColor(config.color);

        // 如果动画效果关闭，设置animationTime=0即可
        if(!this.config.animation || !this.config.animation.enable){
            this.config.animation = utils.copy(animationConfig);
            this.config.animation.animationTime=0;
        }else{
            this.config.animation = utils.merage(utils.copy(animationConfig),this.config.animation);
        }
    }

    /**
     * 解除上一个图表的绑定事件
     * @param container
     */
    function removeBind(container){
        var chartID = container.attr("xcharts-id");
        var chart = chartsList[chartID];
        chart.fire("chartRemoveBind");
        //删除引用
        delete chartsList[chartID];
    }

    /**
     * @var animation
     * @type Object
     * @description 动画参数
     * @extends xCharts
     * @default true
     */
    var animationConfig={
        /**
         * @var enable
         * @type Boolean
         * @description 是否开启动画
         * @extends xCharts.animation
         * @default false
         */
        enable:false,
        /**
         * @var animationTime
         * @type Number
         * @description 动画时间,单位ms
         * @extends xCharts.animation
         * @default 500ms
         */
        animationTime:500,
        /**
         * @var animationEase
         * @type String
         * @description 动画类型
         * @extends xCharts.animation
         * @default linear
         */
        animationEase:'linear'
    }

    window.xCharts = xCharts;
}(window))
},{}]},{},[15,14,8,9,10,11,12,13,1,2,3,4,5,6,7]);
