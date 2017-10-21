var http=require('http');
var setting={};
require('./setting').host(setting);
exports.deviceinfo=function(host,port,message,info){
    return new Promise(function(resolve,reject){
        var opt = {
            host:host,
            port:port,
            method:'POST',
            headers:{
                "Content-Length":message.length
            }
        };
        var key=message.split('&')[1].split('=')[1];
        var attr=key.split('-')[1];
        var body = '';
        var req = http.request(opt, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data',function(d){
                body += d;
                }).on('end', function(){
                    info[attr]=JSON.parse(body)[key];
                    resolve();
            });
        }).on('error', function(e) {
            reject("Got error: " + e.message);
        });
        req.write(message);
    });
}
exports.pcapInfo=function(host,port,message,info){
    return new Promise(function(resolve,reject){
        var opt = {
            host:host,
            port:port,
            method:'POST',
            headers:{
                "Content-Length":message.length
            }
        };
        var key=message.split('&')[1].split('=')[1];
        var attr=key.split('-')[1];
        var body = '';
        var req = http.request(opt, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data',function(d){
                body += d;
                }).on('end', function(){
                    info[attr]=JSON.parse(body)[key];
                    resolve();
            });
        }).on('error', function(e) {
            reject("Got error: " + e.message);
        });
        req.write(message);
    });
}
exports.requestMessage=function(host,port,message,info){
    return new Promise(function(resolve,reject){
        var opt = {
            host:host,
            port:port,
            method:'POST',
            headers:{
                "Content-Length":message.length
            }
        };
        var body = '';
        var req = http.request(opt, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data',function(d){
                    body += d;
                }).on('end', function(){
                    info.data=JSON.parse(body);
                    console.log(message);
                    resolve();
            });
        }).on('error', function(e) {
            reject("Got error: " + e.message);
        });
        req.write(message);
    });
}
exports.fileInfo=function(host,port,message,info){
    return new Promise(function(resolve,reject){
        var opt = {
            host:host,
            port:port,
            method:'POST',
            headers:{
                "Content-Length":message.length
            }
        };
        var key=message.split('&')[1].split('=')[1];
        var attr=message.split('&')[2].split('=')[1];
        var body = '';
        var req = http.request(opt, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data',function(d){
                body += d;
                }).on('end', function(){
                    //判断结束,如果有回调函数则执行
                    info[attr]=JSON.parse(body)[key];
                    console.log(message);
                    resolve();
            });
        }).on('error', function(e) {
            reject("Got error: " + e.message);
        });
        req.write(message);
    });
}
exports.sendMessage=function(host,port,message){
    var opt = {
        host:host,
        port:port,
        method:'POST',
        headers:{
            "Content-Length":message.length
        }
    };
    var body = '';
    var req = http.request(opt, function(res) {
        console.log("Got response: " + res.statusCode);
        res.on('data',function(d){
            body += d;
            // info=JSON.parse(body);
            }).on('end', function(){
                console.log(message);
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
    req.write(message);
}
exports.sendMessage2=function(host,port,message,info){
    var opt = {
        host:host,
        port:port,
        method:'POST',
        headers:{
            "Content-Length":message.length
        }
    };
    var body = '';
    var req = http.request(opt, function(res) {
        console.log("Got response: " + res.statusCode);
        res.on('data',function(d){
            body += d;
            }).on('end', function(){
                info.data=JSON.parse(body);
                info.over=true;
                console.log(message);
                // console.log(info);
                console.log('end');
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
    req.write(message);
}