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
    components.extend({legend: legend})

    function legend(messageCenter, config, type) {
        if(!config.legend.show) return;
        Component.call(this, messageCenter, config, type);
    }

    legend.prototype.extend = xCharts.extend;
    legend.prototype.extend({
        init: function (messageCenter, config, type) {
            this.legendConfig=utils.merage(defaultConfig(),config.legend);
            this._series=config.series;
            this.series=parseSeries(config.series,this.legendConfig.data,messageCenter,this.legendConfig);
            this.originalHeight=messageCenter.originalHeight;
            this.originalWidth=messageCenter.originalWidth
            this.width=this.originalWidth-this.margin.left-this.margin.right;
            this.height=this.originalHeight-this.margin.top-this.margin.bottom;

        },
        render: function (ease, time) {
            var _this=this,
                fontSize=_this.legendConfig.item.fontSize,
                chartSize=_this.legendConfig.item.chartSize,
                itemHeight=fontSize>chartSize?fontSize:chartSize,
                color=_this.legendConfig.item.color;

            var groupPosition = _this.__calcPosition();//计算位置



            var legendGroup = _this.svg.selectAll('.xc-legend-group').data([_this]);
            legendGroup.enter().append('g').attr('class','xc-legend-group');
            legendGroup.attr('transform',"translate("+groupPosition+")");
            var itemList=legendGroup.selectAll('.xc-legend-item').data(_this.series);
            itemList.enter().append('g').attr("class","xc-legend-item");
            itemList.exit().remove();
            itemList.attr('transform',function(serie){
                this.isChecked=this.isChecked==undefined?true:this.isChecked;//默认选中状态，给click事件用
                return 'translate('+serie.position+')';
            }).attr('fill',color)
                .attr('opacity',function(){
                    return this.isChecked?1:_this.config.item.opacity;
                });

            //因为事件是绑定在g上，所以里面的path和text可以删掉节约代码
            itemList.html("");
            //添加文字
            itemList.append('text').attr('x',chartSize*1.1)
                .attr('y',function(){
                    return fontSize*0.9;//减去一个偏移量,使其居中
                })
                .attr('font-size',fontSize)
                .append('tspan')
                .attr('dy',function(){
                    //为了文字和图居中
                    if(fontSize>chartSize)
                        return 0;
                    else
                        return (chartSize-fontSize)*0.5;
                })
                .text(function(serie){
                    return serie.name;
                })

            //添加图案
            itemList.append('path').attr('d',function(serie){
                if(!pathD[serie.type]){throw new Error("pathD."+serie.type+" not found")};
                return pathD[serie.type](chartSize,itemHeight);
            })
                .attr('stroke',function(serie){
                    return serie.color;
                })
                .attr('fill',function(serie){
                    return serie.color;
                })
            _this.itemList=itemList;
        },
        ready:function(){
            var _this=this,
                config=_this.legendConfig,
                hoverColor=config.item.hoverColor,
                defaultColor=config.item.color,
                multiple=config.selectedMode!='single',
                opacity=config.item.opacity


            _this.itemList.on('click.legend',function(data){
                this.isChecked=!this.isChecked;
                if(multiple){
                    //多选的情况下
                    d3.select(this).attr('opacity',this.isChecked?1:opacity)
                }else{
                    _this.itemList.attr('opacity',opacity);
                    d3.select(this).attr('opacity',1);
                }

                reload(data.name);
            });

            _this.itemList.on('mouseenter.legend',function(data){
                var color;
                if(hoverColor=='auto')
                    color=data.color;
                else
                    color=hoverColor;
                var item=d3.select(this);
                item.attr('fill',color);
                _this.fire('legendMouseenter',data.name);
            });
            _this.itemList.on('mouseleave.legend',function(data){
                var item=d3.select(this);
                item.attr('fill',defaultColor);

                _this.fire('legendMouseleave',data.name);
            })


            var nameList=multiple?this.series.map(function(serie){
                return serie.name;
            }):[];
            /**
             * 分两种模式处理
             * @param name
             */
            function reload(name){
                if(multiple){
                    //如果存在则删除，不存在则从_series中拿出添加
                    var isAdd=true;
                    for(var i= 0,s;s=nameList[i++];){
                        if(s==name){
                            nameList.splice(i-1,1);
                            isAdd=false;
                            break;
                        }
                    }
                    if(isAdd)
                        nameList.push(name);

                    if(nameList.length==0) _this.fire('tooltipNone');
                    else _this.fire('tooltipShow');

                }else{
                    nameList=[name];
                }

                _this.fire('legendClick',nameList);
            }

        },
        //计算每一个serie的位置，并根据配置计算返回group位置
        __calcPosition:function(){
            var config = this.legendConfig,
                _this=this,
                series=_this.series,
                itemGap=config.itemGap,
                width=_this.width,
                height=_this.height,
                fontSize=_this.legendConfig.item.fontSize,
                chartSize=_this.legendConfig.item.chartSize,
                itemHeight=fontSize>chartSize?fontSize:chartSize,
                x=config.x,
                y=config.y,
                orient=config.orient,
                margin=_this.margin,
                originalWidth=_this.originalWidth,
                originalHeight=_this.originalHeight

            //TODO 拆分下
            var offsetLength=config.item.chartSize*1.1,
                textSpan=document.createElement('span');
            textSpan.style.fontSize=config.item.fontSize+'px';
            textSpan.style.margin="0px";
            textSpan.style.padding="0px";
            textSpan.style.border="none";
            textSpan.style.position='absolute';
            textSpan.style.visibility="hidden";
            document.body.appendChild(textSpan);

            var totalWidth= 0,totoalHeight= 0,maxWidth,maxHeight,colWidth=0;
            series.forEach(function(serie){
                textSpan.innerText==undefined?textSpan.textContent=serie.name:textSpan.innerText=serie.name; //兼容firefox
                //计算name的长度
                var itemWidth=parseFloat(textSpan.offsetWidth) + offsetLength;
                serie.position=[totalWidth,totoalHeight];

                if(orient!='vertical'){
                    //水平布局的情况
                    totalWidth+=itemWidth+itemGap;
                    if(totalWidth>width){
                        maxWidth=width;
                        totalWidth=0;
                        totoalHeight+=itemHeight*1.1;//加上高度的0.1的偏移量做分割
                    }
                }else{
                    //垂直布局
                    colWidth=d3.max([colWidth,itemWidth])
                    totoalHeight+=itemHeight+itemGap;
                    if(totoalHeight>height){
                        maxHeight=height;
                        totoalHeight=0;
                        totalWidth+=colWidth*1.1;
                    }
                }
            })
            //document.body.removeChild(textSpan);
            var posX,posY,gap=30;
            maxWidth=maxWidth?maxWidth:totalWidth;
            maxHeight=maxHeight?maxHeight:totoalHeight;
            if(orient!='vertical'){
                maxHeight+=itemHeight;//最后一行高度未算到
                if(x=='right')
                    posX=originalWidth-margin.right-maxWidth;
                else if(x=='center')
                    posX=(width-maxWidth)/2+margin.left;
                else
                    posX=margin.left;//left

                if(y=="top") {
                    posY = margin.top;
                    margin.top+=totoalHeight+gap;
                }
                else {
                    posY = height - totoalHeight+margin.top;
                    margin.bottom+=totoalHeight+gap;
                }
            }else{
                maxWidth+=colWidth;//最后一列的宽度未算到
                if(x=='right'){
                    posX=originalWidth-margin.right-maxWidth;
                    margin.right+=maxWidth+gap;
                }else{
                    posX=0;
                    margin.left+=maxWidth+gap;
                }

                if(y=='center'){
                    posY=(height-maxHeight)/2+margin.top;
                }else if(y=='bottom'){
                    posY=(height-maxHeight)+margin.top;
                }
                else
                    posY=margin.top;
            }
            return [posX,posY]
        }
    })

    function parseSeries(series,data,messageCenter,config) {
        //首先对series按照类型分类，方便针对不同的chart做不同的处理
        var seriesObj = {},ret=[];
        series.forEach(function (serie) {
            var type = serie.type;
            if (!type) return;
            seriesObj[type]||(seriesObj[type]=[]);
            seriesObj[type].push(serie);
        });
        for(var k in seriesObj)
            if(seriesObj.hasOwnProperty(k)){
                var parseFn=parseObj[k];
                if(parseFn) ret=ret.concat(parseFn(seriesObj[k],data,messageCenter));
            }


        return ret;
    }

    /**
     * 请返回一个Array
     * 其实就是加入了一个color属性，顺便把idx加上了
     * // TODO 不支持name重复问题，待解决
     */
    var parseObj={
        line:lineParse,
        pie:pieAndRadar,
        radar:pieAndRadar,
        scatter:lineParse,
        funnel:pieAndRadar,
        bar:lineParse,
    }

    /**
     * 处理饼图和雷达图
     * @param series
     * @param data
     * @param messageCenter
     */
    function pieAndRadar(series,data,messageCenter){
        var ret=[];
        series.forEach(function(serie){
            var nameIdx={},colorIdx= 0,type=serie.type;
            serie.data.forEach(function(d){
                var name = d.name,dIdx;
                if(nameIdx[name]==undefined){
                    nameIdx[name]=colorIdx;
                    dIdx=colorIdx;
                    colorIdx++;
                }else{
                    dIdx=nameIdx[name];
                }
                d.idx=dIdx;

                if(valueInArray(name,data)){
                    d.color=messageCenter.getColor(dIdx);
                    d.type=type;
                    ret.push(d);
                }

            });
        });
        return ret;
    }

    function lineParse(series,data,messageCenter){
        var dataInSeries=[],getColor=messageCenter.getColor;
        series.forEach(function(serie,idx){
            if(!serie.idx)
                serie.idx=idx;
            if(valueInArray(serie.name,data)){
                //name出现在legend.data中
                if(serie.lineStyle && serie.lineStyle.color!=='auto')
                    serie.color=serie.lineStyle.color;
                else
                    serie.color=getColor(idx);
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
    function valueInArray(value,array,key){
        for(var i= 0,a;a=array[i++];){
            if(key && a[key]===value) return a;
            else if(a===value) return a;
        }
        return false;
    }

    var pathD={
        'line':getLinePath,
        'radar':getRadarPath,
        'pie':getScatterPath,
        'scatter':getScatterPath,
        'funnel':getFunnelPath,
        'bar':getBarPath,
    }
    // TODO 改成闭包，节约性能
    /**
     * 折线图图例
     * @param size 正方形 宽度
     * @returns {string} -o-
     */
    function getLinePath(size,itemHeight) {
        var r = size / 6,h=itemHeight/2;
        var ret = 'M0,'+h+'L' + 2 * r + ','+h;
        ret += 'A' + r + ',' + r + ' 0 1 1 ' + 2 * r + ','+(h+0.00001);
        ret += 'M' + 4 * r + ','+h+'L' + 6 * r + ','+h;
        return ret;
    }

    /**
     * 散点图图例,饼图图例
     * @param size  宽度
     * @returns {string} 圆圈 O
     */
    function getScatterPath(size) {
        var r = size;
        var ret = 'M0,'+0.5*r+' A' + r / 2 + ',' + r / 2 + ' 0 1 1 0,'+(0.5*r+0.001);
        return ret;
    }

    /**
     * 六边形
     * @param size
     */
    function getRadarPath(size){
        var r=size/ 2,rad=Math.PI/180*30;
        var x0= 0,y0=-r,
            x1=Math.cos(rad)* r,y1=Math.sin(rad)*(-r);
        var position=[],ret="";
        position[0]=[x0,y0],position[1]=[x1,y1],position[2]=[x1,-y1],position[3]=[x0,-y0],position[4]=[-x1,-y1],position[5]=[-x1,y1];
        position.forEach(function(p){
           //修正坐标
            p[0]+=r;
            p[1]+=r;
            if(!ret){
                ret+='M';
            }else{
                ret+='L';
            }
            ret+=p;
        });
        ret+='z';
        return ret;

    }

    function getFunnelPath(size){
        var offset=size/10;
        return 'M0,'+offset+' L'+size+','+offset+' L'+size*0.5+','+size
    }

    function getBarPath(size){
        var leftTop=[0,size/4],
            rightTop=[size,size/4],
            rightBottom=[size,size/4*3],
            leftBottom=[0,size/4*3]
        return 'M'+leftTop+' L'+rightTop+'L'+rightBottom+'L'+leftBottom+'z';
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
             * @describtion 是否显示图例(legend)
             */
            show: true,
            /**
             * @var orient
             * @type String
             * @extends xCharts.legend
             * @default 'horizontal'
             * @values 'horizontal'| 'vertical'
             * @describtion 图例是水平排列还是垂直排列
             */
            orient: 'horizontal',
            /**
             * @var x
             * @type String
             * @extends xCharts.legend
             * @default 'left'
             * @valuse 'left'|'center'|'right'
             * @describtion 水平布局时支持'left','center','right';垂直布局时支持'left','right'
             * @describtion 注：center只在图例只有一行有效，多行第二行开始会自动从最左边开始排
             */
            x: 'left',
            /**
             * @var y
             * @type String
             * @extends xCharts.legend
             * @default 'bottom'
             * @valuse 'top'|'bottom'
             * @describtion 水平布局时支持'top','bottom',垂直布局无效
             */
            y: 'bottom',
            /**
             * @var itemGap
             * @extends xCharts.legend
             * @type Number
             * @default 10
             * @describtion 图例与图例之间的间距，单位是像素。水平布局时是水平之间的间距，垂直是上下之间的间距
             */
            itemGap: 10,
            /**
             * @var formatter
             * @type Function
             * @extends xCharts.legend
             * @describtion 传入data中的每一个name值，返回一个以供显示的字符串
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
             * @describtion 选择模式，multiple表示可以同时存在多个选中状态，single表示同一时间只能一个被选中
             * @values 'multiple'|'single'
             */
            selectedMode: 'multiple',
            /**
             * @var data
             * @type Array
             * @extends xCharts.legend
             * @describtion 要显示哪些legend，Array里面对应series里的name值
             */
            data: [],
            /**
             * @var item
             * @extends xCharts.legend
             * @type Object
             * @describtion 控制每个图例的样式
             */
            item: {
                /**
                 * @var fontSize
                 * @extends xCharts.legend.item
                 * @type String|Number
                 * @default 14
                 * @describtion 图例文字的大小
                 */
                fontSize: 14,
                /**
                 * @var color
                 * @extends xCharts.legend.item
                 * @type String
                 * @default '#000'
                 * @describtion 图例文字的颜色
                 */
                color: '#000',
                /**
                 * @var chartSize
                 * @extends xCharts.legend.item
                 * @type Number
                 * @default 20
                 * @describtion 图例图标的宽度
                 */
                chartSize: 20,
                /**
                 * @var opacity
                 * @extends xCharts.legend.item
                 * @type Number
                 * @default 0.3
                 * @describtion 图例未被选中时的透明程度
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