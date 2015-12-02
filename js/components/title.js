/**
 * xCharts.title
 * extends Component
 */
(function (window) {
    var xCharts = window.xCharts;
    var utils = xCharts.utils;
    var d3 = window.d3;
    var components = xCharts.components;
    var Component = components['Component'];
    utils.inherits(title, Component);
    components.extend({title: title})

    function title(messageCenter, config, type) {
        if(!config.title.show) return;
        Component.call(this, messageCenter, config, type);
    }

    title.prototype.extend = xCharts.extend;//添加extends函数

    title.prototype.extend({
        init: function (messageCenter, config, type) {
            this.titleConfig = utils.merage(defaultConfig(), this.config.title);
            this.height = messageCenter.originalHeight;
        },
        render: function (ease, time) {
            var _this = this,
                textAnchor = 'start',
                textFontSize=_this.titleConfig.textStyle.fontSize,
                subtextFontSize=_this.titleConfig.subtextStyle.fontSize,
                x = _this.titleConfig.x,
                y = _this.titleConfig.y,
                height=_this.height;
            if (x == 'left') {
                x = 0;
                textAnchor = 'start';
            } else if (x == 'center') {
                x = '50%';
                textAnchor = 'middle';
            } else if (x == 'right') {
                x = '100%';
                textAnchor = 'end';
            }

            if(y=='top'){
                y='1em';
                //只有在y==top时，文本不浮动，需要调整margin.top 防止和charts重叠
                _this.margin.top+=parseFloat(textFontSize)+parseFloat(subtextFontSize);
            }else if(y=='center'){
                y='50%';
            }else if(y=='bottom'){
                y=height-parseFloat(subtextFontSize);
            }

            //第一步在svg下添加一个text，目的是为了能在浮动的时候能覆盖所有的charts
            var title = _this.svg.selectAll('.xc-title').data([_this.titleConfig]);
            title.enter().append('text').attr('class', 'xc-title');
            //添加主标题
            var titleText = title.selectAll('.xc-title-text').data([_this.titleConfig]);
            titleText.enter().append('tspan').attr('class', 'xc-title-text');;
            titleText.text(function (config) {
                return config.text;
            })
                .attr('x', x)
                .attr('y', y)
                .attr('font-size',textFontSize)
                .attr('fill',function(config){
                    return config.textStyle.color;
                })
                .attr('text-anchor',textAnchor);
            //添加副标题
            var subtitleText=title.selectAll('.xc-title-subtext').data([_this.titleConfig]);
            subtitleText.enter().append('tspan').attr('class', 'xc-title-subtext');

            subtitleText.text(function (config) {
                return config.subtext;
            })
                .attr('x', x)
                .attr('dy', '1.2em')
                .attr('fill',function(config){
                    return config.subtextStyle.color;
                })
                .attr('font-size',subtextFontSize)
                .attr('text-anchor',textAnchor);
        },
        updateSeries:function(){
            //数据更新与title无关，不做处理
        }
    })


    function defaultConfig() {
        /**
         * title配置项
         * @var title
         * @type Object
         * @extends xCharts
         * @describtion 标题配置项，设置标题文本，位置相关的属性
         */
        var title = {
            /**
             * @var show
             * @extends xCharts.title
             * @type Boolean
             * @default false
             * @describtion 是否显示标题
             */
            show: false,
            /**
             * @var text
             * @extends xCharts.title
             * @type String
             * @describtion 主标题文本
             */
            text: '',
            /**
             * @var subtext
             * @extends xCharts.title
             * @type String
             * @describtion 副标题文本
             */
            subtext: '', //副标题文本
            /**
             * @var x
             * @extends xCharts.title
             * @type String|Number
             * @values 'center'|'left'|'right'|number(单位px或百分比)
             * @default 'center'
             * @describtion
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
             * @describtion 控制标题垂直位置
             * @describtion 注意：修改y的位置会造成标题浮动，与图表重叠在一起
             * @example
             * y:'90'和y:90结果一样，以y=0为基准想下偏移90px
             * y:'50%' 表示以y=0为基准向下偏移容器高度的50%,居中请用center
             */
            y: 'top',
            /**
             * @var textStyle
             * @type Object
             * @extends xCharts.title
             * @describtion 主标题样式控制,也可以通过设置.xc-title-text的css属性控制样式
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
                 * @describtion 主标题字号大小，可设置.xc-title-text的css属性控制
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @extends xCharts.title.textStyle
                 * @type String
                 * @default '#000'
                 * @describtion 主标题颜色,可设置.xc-title-text的css属性控制
                 */
                color: '#000', //默认颜色
            },
            /**
             * @var subtextStyle
             * @type Object
             * @extends xCharts.title
             * @describtion 副标题样式控制,也可以通过设置.xc-title-subtext的css属性控制样式
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
                 * @describtion 副标题字号大小，可设置.xc-title-subtext的css属性控制
                 */
                fontSize: 12,
                /**
                 * @var color
                 * @extends xCharts.title.subtextStyle
                 * @type String
                 * @default '#000'
                 * @describtion 副标题颜色,可设置.xc-title-subtext的css属性控制
                 */
                color: '#00',
            }

        }
        return title;
    }
}(window))