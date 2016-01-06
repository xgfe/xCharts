/**
 * Created by liuyang on 15/10/30.
 */
var apiModel=angular.module('apiModel',[]);
apiModel.controller('apiCtrl',function($scope,apiService){
    var apiData=[];
    $scope.apiData=apiData;
    apiService.getApi().success(function(res){

        var data=[];
        res.forEach(function(d){
            var obj={};
            d.forEach(function(d0,i){
                var type = d0.type;
                obj[type]||(obj[type]=[]);
                obj[type].push(d0);
            })

            var name = obj.var[0];
            if(name){
                name=name.string;//获取名字字符串
                obj.nameStr=name;
            }else{
                //@var 没有定义报错
                console.error('@var name is not defined',obj);
                return
            }
            var path= obj.extends[0];
            if(path){
                path=path.string;
                obj.pathStr=path;
            }else{
                //@extends 未定义
                console.error('%s @extends path is not defined',name);
                return;
            }

            data.push(obj);
        })

        //根据extends划分父子关系

        $scope.apiData=parseTree(data);
    })
    var showObj=null;
    $scope.configClick=function(item){

        if(showObj===item) return;
        showObj=item;
        if(!item.children || !item.children.length){
            //子节点，跳转到父节点
            $scope.configClick(item.parent);
            return;
        }

        $scope.showDataName=item.name;
        $scope.showData=[];
        $scope.showData.push(item);
        for(var i= 0,c;c=item.children[i++];){
            $scope.showData.push(c);
        }
    }
})

function parseTree(data){
    //对pathStr排序，长度短的在前面--长度短意味着层级靠前，先处理
    data.sort(function(a,b){
        return a.pathStr.length-b.pathStr.length;
    })
    var ret=[{name:'xCharts',children:[]}]; //默认给个父级
    data.forEach(function(d){
        var pathArr= d.pathStr.split('.');
        var now = ret;
        var parObj=ret;
        for(var j= 0,path;path=pathArr[j++];){
            var parent=null;
            for(var i= 0;parent=now[i++];){
                if(parent.name==path){
                    break;
                }
            }
            if(parent==null){
                //父类中某一个未找到，报错，结束循环
                console.error('%s:{extends:%s} %s is not finded', d.nameStr, d.pathStr, path);
                break;
            }
            parObj=parent;
            now=parent.children;
        }
        if(now==null){
            throw new Error('parseTree 中循环结束now错误,请修改代码');
        }
        d.name= d.nameStr;//填前面取错名字的坑
        d.children=[];
        //下面是为了显示方便做的处理
        if(!d.type){
            console.error('%s.type is not defined', d.name);
            return;
        }
        d.type= d.type[0].string||'null';
        d.var = d.var[0].string;

        d.values= d.values? d.values[0].string:'';
        d.default= d.default? d.default[0].string:'';
        //处理demo链接
        if(d.demo){
            for(var i= 0,dm; dm=d.demo[i++];){
                var str=dm.string.trim();
                str.replace('/s+',' ');
                var arr=str.split(' ');
                dm.demoName=arr[0];
                dm.demoUrl=arr[1];
            }
        }
        d.parent=parObj;//保持父节点的引用
        now.push(d);

    })
    return ret[0].children;//返回xCharts.children
}


apiModel.service('apiService',function($http){
    return {
        getApi:function(){
            return $http.get('api.json')
        }
    }
})

apiModel.directive('treeView',[function(){

    return {
        restrict: 'E',
        templateUrl: 'tpl/treeView.html',
        scope: {
            treeData: '=',
            canChecked: '=',
            textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', function($scope){
            $scope.itemExpended = function(item, $event){
                item.$$isExpend = ! item.$$isExpend;
                $event.stopPropagation();
            };

            $scope.getItemIcon = function(item){
                var isLeaf = $scope.isLeaf(item);

                if(isLeaf){
                    return 'fa  fa-bookmark';
                }

                return item.$$isExpend ? 'fa fa-minus': 'fa fa-plus';
            };

            $scope.isLeaf = function(item){
                return !item.children || !item.children.length;
            };

            $scope.warpCallback = function(callback, item, $event){
                ($scope[callback] || angular.noop)({
                    $item:item,
                    $event:$event
                });
            };
        }]
    };
}]);
