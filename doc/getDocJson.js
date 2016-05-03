/**
 * node
 * 生成doc相关的json
 */
var dox = require('dox');
var fs = require('fs');
var Path = require('path');

var path=Path.join(__dirname,'../src')//起始目录
var outputName=Path.join(__dirname,'api.json');
var apiData=[];
fs.writeFile(outputName,'');

function hadle(path){
    fs.stat(path,function(err,stats){
        if (err) {
            console.log('stat error',err);
        } else {
            if (stats.isDirectory()) {
                return;
            }
            var data=fs.readFileSync(path,"utf-8");

            try {
                var parseData = dox.parseComments(data);
                parseData.forEach(function (d) {
                    //delete d.code;
                    var tags = d.tags;
                    for (var i = 0; i < tags.length; i++) {
                        if (tags[i].type == 'var') { //var特有属性表示是xCharts.config中的一员
                            apiData.push(tags);
                            break;
                        }
                    }

                })
            } catch (e) {
                console.log(e)
            }

            //apiData.push(parseData);

            fs.writeFile(outputName,JSON.stringify(apiData));
        }
    })
}


walk(path,0,hadle);
/*

 递归处理文件,文件夹

 path 路径
 floor 层数
 handleFile 文件,文件夹处理函数

 */

function walk(path, floor, handleFile) {
    handleFile(path, floor);
    floor++;
    fs.readdir(path, function(err, files) {
        if (err) {
            console.log('read dir error',err);
        } else {
            files.forEach(function(item) {
                var tmpPath = path + '/' + item;
                fs.stat(tmpPath, function(err1, stats) {
                    if (err1) {
                        console.log('stat error');
                    } else {
                        if (stats.isDirectory()) {
                            walk(tmpPath, floor, handleFile);
                        } else {
                            handleFile(tmpPath, floor);
                        }
                    }
                })
            });

        }
    });
}
