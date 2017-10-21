function timeTosame(arr){
    var timeArr=[];
    for(var i=0;i<arr.length;i++){
        //j为端口
        for(var j=1;j<arr[i].length;j++){
            if(arr[i][j][0]){
                timeArr.push(arr[i][j][0][0]);                
            }
        }
    }
    var minTime=Math.min.apply(null,timeArr);
    for(var i=0;i<arr.length;i++){//一条线路
        for(var j=1;j<arr[i].length;j++){
            //arr[i][j]端口流量
            if(arr[i][j][0]){
                var t=arr[i][j][0][0]-minTime;
                for(var k=0;k<arr[i][j].length;k++){
                    arr[i][j][k][0]=arr[i][j][k][0]-t;
                }
            }
        }
    }
    return arr;
}
Highcharts.setOptions({
        global:{
            useUTC:false
        }
    });
    function compare(arr1,arr2){
        return arr1[0]-arr2[0];
    }
    function baospeed(array){
         var newarr=array;
         for(var i=1;i<array.length;i++){
             var times=(array[i][0]-array[i-1][0])/1000;//时间差,秒
             var Bytes=array[i][1];
             newarr[i][1]=parseInt(Bytes/times*1000)/1000;//速率，保留三位有效数字
         }
         newarr.shift();//去掉第一个
         return newarr;
        }
        //一条线路四个端口的流量合并函数
    function arrayCon(arrBefore){
        var newarr=[];
        var length=[];
        var max=null;
        for(var i=1;i<arrBefore.length;i++){
            length.push(arrBefore[i].length);
        }
        var n=Math.max.apply(null,length);
        for(var i=1;i<arrBefore.length;i++){
            if(arrBefore[i].length==n){
                max=arrBefore[i];//最长的
            }
        }
        for(var i=0;i<n;i++){
            var tmp=0;
            for(var j=1;j<arrBefore.length;j++){
                if(arrBefore[j][i]){
                    tmp+=arrBefore[j][i][1];                    
                }
            }
            newarr.push([max[i][0],tmp]);
        }
        return newarr;
    }
    // function arrayYasuo(arrBefore){
    //     var newarr=[];
    //     for(var i=0;i<arrBefore.length;){
    //         var step=arrBefore.length-i>10?10:arrBefore.length-i;
    //         var sum=0;
    //         for(j=0;j<step;j++){
    //             sum+=arrBefore[j+i][1];
    //         }
    //         newarr.push([arrBefore[i][0],sum]);
    //         i+=10;
    //     }
    //     return newarr;
    // }
    //测试用
    function arrayYasuo(arrBefore){
        return arrBefore;
    }
function renderA(protocolArr){
    var lines={};
        //一条线路是一个网卡，有四个端口
    for(var i=0;i<protocolArr.length;i++){
        lines[protocolArr[i][0]]=baospeed(arrayYasuo(arrayCon(protocolArr[i])));
        // console.log(lines);
    }
    //线路
    $('#pic_lines').highcharts('StockChart', {
        rangeSelector : {
            enabled:false
        },
        title : {
            text : '线路合法总流量',
            verticalAlign:'bottom'
        },
        legend: {
            enabled: true                                             
        },
        yAxis: {  
            title: {   
                text: 'pps'                          
            },       
            tickInterval:100                  
        },
        credits:{
            enabled:false
        },
        series:setBSeries(lines)
    });
}
function setBSeries(lines){
    var arr=[];
    for(var line in lines){
        var obj={};
        obj.name="线路"+line;
        obj.data=lines[line];
        arr.push(obj);
    }
    arr.sort(function(obj1,obj2){
        return obj1-obj2;
    })
    return arr;
}
function renderB(id,protocolArr,port){
    var lines={};
        //一条线路是一个网卡，有四个端口
    for(var i=0;i<protocolArr.length;i++){
        //端口80
        lines[protocolArr[i][0]]=baospeed(arrayYasuo(protocolArr[i][port]));
    }
    $('#'+id).highcharts('StockChart', {
        rangeSelector : {
            enabled:false
        },
        title : {
            text : (function(){
                switch(port){
                    case 1:return '80端口各线路流量';
                    case 2:return '443端口各线路流量';
                    case 3:return '843端口各线路流量';
                    case 4:return '8300端口各线路流量';
                }
            }()),
            verticalAlign:'bottom'
        },
        legend: {
            enabled: true                                             
        },
        yAxis: {  
            title: {   
                text: 'pps'                          
            },       
            tickInterval:50                  
        },
        credits:{
            enabled:false
        },
        series:setBSeries(lines)
    });
}
function renderD(id,protocolArr){
    var ports=[];
    var line=id.charAt(8);
        //一条线路是一个网卡，有四个端口
    for(var i=0;i<protocolArr.length;i++){
        //匹配到响应的线路
        if(protocolArr[i][0]==line){
            var newarr=protocolArr[i];
            break;
        }
    }
    if(!newarr){
        return;
    }
    for(var j=1;j<newarr.length;j++){
        ports[j]=baospeed(arrayYasuo(newarr[j]));
    }
    $('#'+id).highcharts('StockChart', {
        rangeSelector : {
            enabled:false
        },
        title : {
            text : (function(){
                switch(line){
                    case '1':return '线路1各端口流量';
                    case '2':return '线路2各端口流量';
                    case '3':return '线路3各端口流量';
                    case '5':return '线路5各端口流量';
                }
            }()),
            verticalAlign:'bottom'
        },
        legend: {
            enabled: true                                             
        },
        yAxis: {  
            title: {   
                text: 'pps'                          
            },       
            tickInterval:10                 
        },
        credits:{
            enabled:false
        },
        series:[{
            name:'80端口',
            data:ports[1]
        },
        {
            name:'443端口',
            data:ports[2]
        },
        {
            name:'830端口',
            data:ports[3]
        },
        {
            name:'8300端口',
            data:ports[4]
        }]
    });
}
    //柱状图
    function catchData(str){
        var arr=[];
        if(/IMAGE REQUEST TOTAL,(\d+)/.test(str)){
            arr.push(Number(/IMAGE REQUEST TOTAL,(\d+)/.exec(str)[1]));
            arr.push(Number(/IMAGE REQUEST REAL TOTAL,(\d+)/.exec(str)[1]));
            arr.push(Number(/IMAGE REQUEST SUCCESS TOTAL,(\d+)/.exec(str)[1]));
        }else{
            arr.push(0);
            arr.push(0);
            arr.push(0);
        }
        return arr;
    }

function renderC(arr){
    var lines={};
    for(var i=0;i<arr.length;i++){
        //每条线路的image请求数
        lines[arr[i].charAt(0)]=catchData(arr[i]);
    }
    var total={
        req:0,
        req_real:0,
        req_success:0
    };
    for(var j in lines){
        total.req+=lines[j][0];
        total.req_real+=lines[j][1];
        total.req_success+=lines[j][2];
    }
        $('#pic_lines_req').highcharts({
        chart: {
            type: 'bar'
        },
        title: {
            text: '各线路image请求数量情况',
            verticalAlign:'bottom'
        },
        subtitle: {
            text: ''
        },
        xAxis: {
            categories: ['线路1', '线路2', '线路3', '线路5', 'TOTAL'],
            title: {
                text: null
            }
        },
        yAxis: {
            min: 0,
            title: {
                text: '次数',
                align: 'high'
            },
            labels: {
                overflow: 'justify'
            }
        },
        tooltip: {
            valueSuffix: ''
        },
        plotOptions: {
            bar: {
                dataLabels: {
                    enabled: true
                }
            }
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'top',
            x: -40,
            y: 100,
            floating: true,
            borderWidth: 1,
            backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
            shadow: true
        },
        credits: {
            enabled: false
        },
        series: [{
            name: 'image请求总数',
            data: [lines["1"][0], lines["2"][0], lines["3"][0], lines["5"][0],total.req]
        }, {
            name: 'image请求数去重',
            data: [lines["1"][1], lines["2"][1], lines["3"][1], lines["5"][1],total.req_real]
        }, {
            name: 'image请求成功数',
            data: [lines["1"][2], lines["2"][2], lines["3"][2], lines["5"][2],total.req_success]
        }]
    });
}