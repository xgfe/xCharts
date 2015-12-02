/**
 * Created by liuyang on 15/9/9.
 */
(function () {
    var jQuery = function (element) {
        return new jQuery.fn.init(element);
    }

    jQuery.fn = jQuery.prototype;
    jQuery.fn.init = function (element) {
        this.element = element;
        return this;
    }
    jQuery.fn.init.prototype = jQuery.fn;
    jQuery.fn.addClass = function () {
        console.log(this);
    }

    jQuery(document).addClass();

}())


var myImage = (function () {
    var imgNode = document.createElement('img');
    document.body.appendChild(imgNode);
    return {
        setSrc: function (src) {
            imgNode.src = src;
        }
    }
})
var proxyImage = (function () {
    var img = new Image;
    img.onload = function () {
        myImage.setSrc(this.src);
    }
    return {
        setSrc: function (src) {
            myImage.setSrc('loading.img');
            img.src = src;
        }
    }
})
//观察者模式
var Event = (function () {
    var clientList = {},
        listen,
        trigger,
        remove;
    listen = function (key, fn) {
        clientList[key] || (clientList[key] = []);
        clientList[key].push(fn);
    };
    trigger = function (key) {
        var args = Array.prototype.slice.call(arguments, 1);
        var fns = clientList[key];
        var _this = this;
        if (!fns || fns.length == 0) return false;
        fns.forEach(function (d) {
            d.apply(_this, args);
        })
    };
    remove = function (key, fn) {
        var fns = clientList[key];
        if (!fns || fns.length == 0) return false;
        if (!fn) {
            //清除全部函数
            fns.length = 0;
        } else {
            for (var i = fns.length - 1; i >= 0; i--) {
                var _fn = fns[i];
                if (_fn === fn) {
                    fns.splice(i, 1);
                    break;
                }
            }
        }
    };
    return {
        listen: listen,
        trigger: trigger,
        remove: remove
    }
}())
Event.listen('a', function (key) {
    console.log(key);
})
Event.trigger('a', '我触发了');
Event.remove('a');
Event.trigger('a', '我触发了');

var Beverage = function (param) {
    var boilWater = function () {
        console.log('把水煮沸');
    }
    var brew = param.brew || function () {
            throw new Error('必须传递brew方法');
        }
    var pourInCup = param.pourInCup || function () {
            throw new Error('必须传递pourInCup方法');
        }
    var addCondiments=param.addCondiments||function(){
            throw new Error('必须传递addCondiments方法');
        }
    var F=function(){};
    F.prototype.init=function(){
        boilWater();
        brew();
        pourInCup();
        addCondiments();
    }
    return F;
}
var Coffee=Beverage({
    brew:function(){
        console.log('用沸水冲泡咖啡')
    },
    pourInCup:function(){
        console.log('把咖啡倒进杯子');
    },
    addCondiments:function(){
        console.log('加糖和牛奶')
    }
})
var Tea=Beverage({
    brew:function(){
        console.log('用沸水浸泡茶叶')
    },
    pourInCup:function(){
        console.log('把茶叶倒进杯子');
    },
    addCondiments:function(){
        console.log('加柠檬')
    }
})

//没用享元模式
var Upload=function(type,name,size){
    this.type=type;
    this.name=name;
    this.size=size;
}
Upload.prototype.start=function(){
    console.log('上传成功');
}
for(var i=0;i<100;i++){
    var obj = new Upload('jpg','file','1000');
    obj.start();
}
//使用享元模式
var Upload={
    list:{},
    add:function(id,type,name,size){
        this.list[id]={type:type,name:name,size:size};
    },
    start:function(){
        for(var k in this.list){
            var l = this.list[k];
            console.log(l.name+'上传成功');
        }
    }
}

function Player(name){
    this.name=name;
    this.enemy=null;
}
Player.prototype.win=function(){
    console.log(this.name+' won');
}
Player.prototype.lose=function(){
    console.log(this.name+' lose');
}
var player1=new Player('王二');
var player2=new Player('李四');
player1.enemy=player2;
player2.enemy=player1;


var playerCenter=(function(){
   var players={},
       methods={};
    methods.add=function(player){
        var teamColor=player.teamColor;
        players[teamColor]||(players[teamColor]=[]);
        players[teamColor].push(player);
    }
    methods.die=function(player){
        var teamColor=player.teamColor;
        var teamPlayers=players[teamColor];

        //判断己方队伍是否全部死亡
        for(var i=0;i<teamPlayers.length;i++){
            if(teamPlayers[i].state!='dead'){
                return;
            }
        }
        //己方队员全部阵亡
        for(var i=0;i<teamPlayers.length;i++){
            teamPlayers[i].lose();
        }
        for(var k in players){
            if(teamColor != k){
                var teamPlayers=players[k];
                for(var i=0;i<teamPlayers.length;i++){
                    teamPlayers[i].win();
                }
            }
        }
    }
    return function(method,player){
        methods[method].call(this,player);
    }
}())

