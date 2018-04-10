/**
 * xCharts.legend
 * extends Component
 */
(function (xCharts, d3) {
    var utils = xCharts.utils;
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

            // 配合tooltip显示
            messageCenter.lengendChange = false;

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
            legendGroup = legendGroup.enter().append('g')
                .attr('class', 'xc-legend-group')
                .merge(legendGroup);

            // 设置group的偏移值
            legendGroup.attr('transform', "translate(" + groupPosition + ")");

            // 添加每个legendItemGroup
            var itemList = legendGroup.selectAll('.xc-legend-item')
                .data(_this.legendSeries);

            itemList = itemList.enter().append('g')
                .attr("class", "xc-legend-item")
                .merge(itemList);

            // 如果动态更新数据时可能会出现item减少的情况，这里去掉多余的
            itemList = itemList.exit().remove()
                .merge(itemList);

            itemList.attr('transform', function (serie) {

                // 这里保存点击状态，默认选中
                // 为了刷新时只刷新位置，选中状态不变化

                if (this.isChecked === undefined) {
                    this.isChecked = serie.isChecked;
                }

                // this.isChecked = this.isChecked == undefined ?
                //     true : this.isChecked;

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
                    return 0.325 * chartSize + 0.25 * fontSize;
                })
                .append('tspan')
                .text(function (serie) {
                    return serie.name;
                })
                .attr('font-size', fontSize);


            //添加图案
            // var legendPathD={};
            // itemList.append('path')
            //     .attr('d', function (serie) {
            //
            //         //这里新添一个图表需要在这里添加自己独特的图案路径
            //         if (!pathD[serie.type]) {
            //             throw new Error("pathD." + serie.type + " not found")
            //         }
            //
            //         // 节约性能，因为图例的大小都是统一的，计算一次就够了
            //         if(!legendPathD[serie.type])  legendPathD[serie.type]=pathD[serie.type](chartSize, itemHeight);
            //
            //         return legendPathD[serie.type];
            //     })
            //     .attr('stroke', function (serie) {
            //         return serie.color;
            //     })
            //     .attr('fill', function (serie) {
            //         return serie.color;
            //     });

            itemList.append('rect')
                .attr('width', chartSize * 0.9)
                .attr('height', chartSize * 0.5)
                .attr('rx', chartSize * 0.1)
                .attr('ry', chartSize * 0.1)
                .attr('stroke', function (serie) {
                    return serie.color;
                })
                .attr('fill', function (serie) {
                    return serie.color;
                })
                .style('transform', function () {

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


            if (_this.mobileMode) {
                _this.mobileReady(nameList, opacity);
            } else {

                /**
                 * 点击legend事件
                 * 有多选和单选模式，
                 * 多选模式下，初始状态是全部选中，点击某一个legend，状态翻转
                 * 单选模式下，初始状态是全部选中，第一次点击某一个legend这个legend保持高亮，其他取消选中。这种模式下除了初始状态，其他都是有且仅有一个legend处于选中状态
                 * 刷新图例状态，触发legendClick事件
                 */
                _this.itemList.on('click.legend', legendMouseClick(this, nameList, opacity));

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


        }
    });

    legend.legendMouseClick = legendMouseClick;

    function legendMouseClick(ctx, nameList, opacity) {

        return function (data) {

            // legend点击事件失效状态
            if (ctx.legendConfig.clickable === false) {
                return true;
            }

            // 通知tooltip,legend有操作
            ctx.messageCenter.lengendChange = true;

            this.isChecked = !this.isChecked;
            if (multiple) {
                //多选的情况下
                d3.select(this).attr('opacity', this.isChecked ? 1 : opacity)
            } else {
                // 单选，高亮自己，灰掉别人
                this.itemList.attr('opacity', opacity);
                d3.select(this).attr('opacity', 1);
            }

            reload.call(ctx, data.name, multiple, nameList, ctx.legendSeries);
        }
    }

    /**
     * 分两种模式处理刷新
     * 传递给接受者一个 name的数组
     * todo namelist 可以不用传了
     * @param name
     */
    function reload(name, multiple, nameList, series) {
        nameList = [];
        if (multiple) {
            //如果存在则删除，不存在则从_series中拿出添加
            // var isAdd = true;
            // for (var i = 0, s; s = nameList[i++];) {
            //     if (s == name) {
            //         nameList.splice(i - 1, 1);
            //         isAdd = false;
            //         break;
            //     }
            // }
            // if (isAdd)
            //     nameList.push(name);
            series.forEach(function (serie) {

                if (serie.name === name) {
                    serie.isChecked = !serie.isChecked;
                }

                if (serie.isChecked === true) {
                    nameList.push(serie.name)
                }
            });


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
        var nameList = series.map(function (serie) {
            return serie.name;
        });

        //计算name的长度
        var widthList = utils.calcTextWidth(nameList, config.item.fontSize, offsetLength).widthList;

        // 计算每个legendSerie的x,y位置
        var totalWidth = 0, totoalHeight = 0, maxWidth = 0, maxHeight = 0, colWidth = 0;
        series.forEach(function (serie, index) {

            var itemWidth = widthList[index];
            serie.position = [totalWidth, totoalHeight];

            if (orient != 'vertical') {
                //水平布局的情况
                totalWidth += itemWidth + itemGap;

                // 如果当前行的宽度已经大于当前可绘画区域的最大宽度，进行换行
                if ((totalWidth - itemGap) > width) {
                    maxWidth = width;
                    totalWidth = 0;
                    totoalHeight += itemHeight * 1.1;//加上高度的0.1的偏移量做分割

                    // 需要把当前的serie重新设置位置
                    serie.position = [totalWidth, totoalHeight];

                    totalWidth = itemWidth + itemGap;
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

        legendSeries.forEach(function (serie) {
            // 如果legendShow === false,legend默认不显示
            serie.isChecked = serie.legendShow === false ? false : true;
        })

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
            x: 'center',
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
            },
            /**
             * @var clickable
             * @extends xCharts.legend
             * @type Boolean
             * @description 图例是否可以点击
             * @default true
             */
            clickable: true
        }
        return legend;
    }


}(xCharts, d3));