/**
 * Created by liuyang on 15/10/23.
 */

(function(){

    window.xCharts=xCharts;

    function xCharts(dom){
        return new xCharts.prototype.init(dom);
    }

    xCharts.prototype.init=function(dom){
          this.svg = d3.select(dom).append('svg');
    }
    xCharts.prototype.init.prototype=xCharts.prototype;
    xCharts.prototype.loadConfig=function(config){
        this.config=config;
        this.chart = new line(config, this)
        this.line(config);
    }
})

//line.js
(function(){
    xCharts.prototype.line=line;
    function line(){
        this;
        var path = this.svg.append('path');
        var width = this.width;

        function render(){
            //具体的绘画代码
        }

        function addEvent(){
            //绑定事件
            path.on();
        }
    }
})

var line = xCharts(div);
line.loadConfig(cofing);

//新的流程

(function(){

    window.xCharts=xCharts;

    function xCharts(dom){
        return new xCharts.prototype.init(dom);
    }

    xCharts.prototype.init=function(dom){
        this.svg = d3.select(dom).append('svg');
    }

    xCharts.prototype.charts={};
    xCharts.prototype.init.prototype=xCharts.prototype;
    xCharts.prototype.loadConfig=function(config){
        this.config=config;
        var instance={};
        var type=config.type;
        var chartClass=this.charts[type];
        instance[type]=new chartClass(this);
    }
})
//line.js
(function(){
    xCharts.prototype.charts={line:line};
    function line(messageCenter){
        this.messageCenter=messageCenter;
    }
    line.prototype={
        constructor:line,
        __render:function(){
            this.path=this.messageCenter.svg.append('path');
        },
        __addEvent:function(){
            this.path.on(function(){
                //添加事件
            })
        }
    }
})