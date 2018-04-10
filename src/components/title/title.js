/**
 * xCharts.title
 * extends Component
 */
(function (xCharts,d3) {

    // 获取必须的全局声明
    var utils = xCharts.utils;

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

            title = title.enter().append('text')
                .attr('class', 'xc-title')
                .merge(title);

            //添加主标题
            var titleText = title.selectAll('.xc-title-text')
                .data([_this.titleConfig]);

            titleText = titleText.enter().append('tspan')
                .attr('class', 'xc-title-text')
                .merge(titleText);

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

            subtitleText = subtitleText.enter().append('tspan')
                .attr('class', 'xc-title-subtext')
                .merge(subtitleText);

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
            _this.margin.top += parseFloat(textFontSize) * 1.5 + parseFloat(subtextFontSize);
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
}(xCharts,d3));