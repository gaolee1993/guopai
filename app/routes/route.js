var connection=require('../connection');
var fs=require('fs');
var path=require('path');
var setting={};
require('../setting').host(setting);

//网卡名改为线路名,LINE1,10.10.88.172,p2p1
function nicToLine(ip,nicInfo){
	// for(var i=0; i<nic.length; i++){
	// 	var str = ip +','+ nic[i].name;
	// 	//可以直接和配置文件读出来的setting.pcaps进行匹配
	// 	switch(str){
	// 		case '10.10.88.172,p5p2':nic[i].name='line3';break;
	// 	}
	// }
	switch(ip+','+nicInfo.name){
		case '10.10.88.172,em1' : nicInfo.name='line1(em1)';break;
		case '10.10.88.172,em3' : nicInfo.name='line_LB(em3)';break;
		case '10.10.88.172,p5p2': nicInfo.name='line2(p5p2)';break;
		case '10.10.88.173,em1' : nicInfo.name='line3(em1)';break;
		case '10.10.88.173,em3' : nicInfo.name='line4(em3)';break;
		case '10.10.88.173,p5p2': nicInfo.name='line5(p5p2)';break;
	}
	return nicInfo;
}
module.exports=function(app){
	var render=function(req,res){
		var hostPromistAll = null;
		var promise = [];
		var info = [];
		for(var i = 0; i < setting.host.length; i++) {
			info[i] = new Object();
			info[i].ip = setting.host[i];
			var p1 = connection.deviceinfo(setting.host[i],'1234','type=info&key=device-cpu',info[i]);
			var p2 = connection.deviceinfo(setting.host[i],'1234','type=info&key=device-nic',info[i]);
			var p3 = connection.deviceinfo(setting.host[i],'1234','type=info&key=device-disk',info[i]);
			var p4 = connection.deviceinfo(setting.host[i],'1234','type=info&key=device-mem',info[i]);
			var p5 = connection.deviceinfo(setting.host[i],'1234','type=info&key=ntp-status',info[i]);
			promise[i] = Promise.all([p1, p2, p3, p4, p5]);
		}
		//promise数组的元素是一台服务器异步通信监听的promise
		promise.forEach(function(p, i, arr) {
			p.then(function() {
				// info[i].nic = nicToLine(setting.host[i],info[i].nic);
				info[i].disk.total=Math.ceil(info[i].disk.total/(1024*1024*1024));
			  	info[i].mem.total=Math.ceil(info[i].mem.total/(1024*1024*1024));
			},function(err){
				console.log(err);
			});
		})
		promiseAll = Promise.all(promise);
		promiseAll.then(function() {
			res.render('device',{
				messages:info
			});
		},function(error) {
			console.log(error);
		});
	}

	var capturedata={
		host1:{},
		host2:{}
	};

	var button='stop';
	app.get('/',render);
	app.get('/device',render);

	app.get('/capture',function(req,res){
		var disk=[];
		var diskInfo=[];
		var promise=[];
		for(var i=0; i<setting.host.length; i++) {
			disk[i]=new Object();
			promise[i] = connection.deviceinfo(setting.host[i],'1234','type=info&key=device-disk',disk[i]);
		}
		var p = Promise.all(promise);
		p.then(function(){
			for(var i=0; i<setting.host.length; i++){
				diskInfo.push(disk[i].disk.percent);
			}
			res.render('capture',{
				capturedata:capturedata,
				btnNext:button,
				pcaps:setting.pcaps,
				hosts:setting.host,
				deviceInfo:diskInfo
			});
		},function(error){
			console.log(error);
		});
	});

	var timer=null;
	app.get('/captureData',function(req,res){
		res.json(capturedata);
	});

	//服务器架构改变时，需要修改
	function captureCallback(res){
		button='start';
		var captureTraffic=[];
		for(var i=0; i<setting.host.length; i++) {
			captureTraffic[i]=new Object();
			captureTraffic[i].preByte=[0,0,0,0,0];
			captureTraffic[i].preTime=[0,0,0,0,0];
		}
		timer=setInterval(function(){
			//判断是否抓包中
			var flag=[];
			var promise=[];
			for(var i=0; i<setting.host.length; i++) {
				flag[i]=new Object();
				promise[i]=connection.requestMessage(setting.host[i],'1234','type=pcap&key=status',flag[i]);
			}
			var promiseAll = Promise.all(promise);
			promiseAll.then(function(){
				//是否不再抓包中
				var closeFlag = true;
				for(var i=0; i<setting.host.length; i++){
					//存在抓包
					if(flag[i].data.status == 'running') {
						closeFlag = false;
					}
				}
				var promiseCapture=[];
				
				for(var i=0; i< setting.host.length; i++){
					promiseCapture[i]= connection.pcapInfo(setting.host[i],'1234','type=info&key=nic-traffic',captureTraffic[i]);
				}
				Promise.all(promiseCapture).then(function(){
					//第一台服务器
					for(var i=0;i<captureTraffic[0].traffic.length;i++){
						captureTraffic[0].traffic[i]=nicToLine(setting.host[0],captureTraffic[0].traffic[i]);
						if(!(captureTraffic[0].traffic[i].name in capturedata.host1)){
							capturedata.host1[captureTraffic[0].traffic[i].name]=[];
						}else{
							var speed1=parseInt((captureTraffic[0].traffic[i]['total-bytes']-captureTraffic[0].preByte[i])*8/(captureTraffic[0].traffic[i].time-captureTraffic[0].preTime[i])*1000)/1000;
							capturedata.host1[captureTraffic[0].traffic[i].name].push([parseInt((captureTraffic[0].traffic[i].time+captureTraffic[0].preTime[i])*1000/2),speed1]);
						}
						captureTraffic[0].preByte[i]=captureTraffic[0].traffic[i]['total-bytes'];
						captureTraffic[0].preTime[i]=captureTraffic[0].traffic[i].time;
					}
					for(var i=0;i<captureTraffic[1].traffic.length;i++){
						captureTraffic[1].traffic[i]=nicToLine(setting.host[1],captureTraffic[1].traffic[i]);
						if(!(captureTraffic[1].traffic[i].name in capturedata.host2)){
							capturedata.host2[captureTraffic[1].traffic[i].name]=[];
						}else{
							var speed1=parseInt((captureTraffic[1].traffic[i]['total-bytes']-captureTraffic[1].preByte[i])*8/(captureTraffic[1].traffic[i].time-captureTraffic[1].preTime[i])*1000)/1000;
							capturedata.host2[captureTraffic[1].traffic[i].name].push([parseInt((captureTraffic[1].traffic[i].time+captureTraffic[1].preTime[i])*1000/2),speed1]);
						}
						captureTraffic[1].preByte[i]=captureTraffic[1].traffic[i]['total-bytes'];
						captureTraffic[1].preTime[i]=captureTraffic[1].traffic[i].time;
					}


				},function(value){
					console.log(value);
				});
			},function(value){
				console.log(value);
			});
			
		},3000);
	}
	app.get('/captureStart',function(req,res){
		//状态由按钮可否点击说明
		var flag=[];
		var promise=[];
		for(var i=0;i<setting.host.length;i++) {
			flag[i]=new Object();
			promise[i]=connection.requestMessage(setting.host[i],'1234','type=pcap&key=start',flag[i]);
		}
		Promise.all(promise).then(function(){
			res.json('启动抓包');
			captureCallback();
		});
	});
	app.get('/captureStop',function(req,res){
		var stop=[];
		var promise=[];
		for(var i=0;i<setting.host.length;i++){
			stop[i]=new Object();
			promise[i]=connection.requestMessage(setting.host[i],'1234','type=pcap&key=stop',stop[i]);
		}
		Promise.all(promise).then(function(){
			var closeFlag=true;
			for(var i=0;i<setting.host.length;i++){
				if(stop[i].data.status != 'success'){
					closeFlag=false;
					stop[i]={};
				}
			}
			if(!closeFlag){
				res.json('抓包未能停止，请稍后停止');
			}else{
				clearInterval(timer);
				capturedata={
					host1:{},
					host2:{}
				};
				res.json('已停止');
				button='stop';
			}
		},function(value){
			console.log(value);
		});
	});
	function formate(num){
    	return num<10?'0'+num:num;
    }
    function getdate(time){
    	var date=new Date(time);
    	var y=date.getFullYear();
    	var M=formate(date.getMonth()+1);
    	var h=formate(date.getHours());
    	var d=formate(date.getDate());
    	var m=formate(date.getMinutes());
    	var s=formate(date.getSeconds());
    	return y+'年 '+M+'月 '+d+'日 '+h+':'+m+':'+s+'';
    }
	app.get('/pcapfile',function(req,res){
		//agent
		var file=[];
		var data=[];
		var promise=[];
		for(var i=0;i<setting.host.length;i++){
			file[i]=new Object();
			promise[i]=connection.fileInfo(setting.host[i],'1234','type=req&key=file-infos&value=pcap',file[i]);
		}
		Promise.all(promise).then(function(){
			for(var j=0;j<setting.host.length;j++){
				if(file[j].pcap){
					for(var i=0;i<file[j].pcap.length;i++){
						file[j].pcap[i].ip=setting.host[0];
						file[j].pcap[i].size=parseInt(file[j].pcap[i].size*1000/(1024*1024))/1000;
						file[j].pcap[i].ctime=parseInt(file[j].pcap[i].ctime*1000);
						data.push(file[j].pcap[i]);
					}
				}
			}
			data=data.sort(ctimeCompare);
			for(var i=0;i<data.length;i++){
				data[i].ctime=getdate(data[i].ctime);
			}
			res.render('pcapfile',{
				filesR:data,
				filesL:data,
				captureStatus:button
			});
		});
	});
	app.get('/file',function(req,res){
		var fileName=req.query.filename;
		// console.log(fileName);
		res.json(fileName);
	});
	app.get('/fileDelete',function(req,res){
		var filename=req.query.file;
		var path=req.query.path;
		var ip=req.query.ip;
		var fileDelete={};
		if(!filename){
			res.json('选择错误');
		}else{
			var p=connection.requestMessage(ip,'1234','type=req&key=file-remove&src='+path+'/'+filename,fileDelete);
			p.then(function(){
				if(fileDelete.data['file-remove']==true){
					res.json(true);
				}else{
					res.json(false);
				}
			},function(value){
				console.log(value);
			});
		}
	});
	app.get('/fileToServer',function(req,res){
		
	});
	//路由到过滤页面
	app.get('/filter',function(req,res){
		var filter={
			files:[],
			data:[]
		};	
		var file=[];
		var promisePcap=[];
		var promiseFilter=[];
		//获取数据包列表，查询过滤状态
		for(var i=0;i<setting.host.length;i++){
			file[i]=new Object();
			promisePcap[i]=connection.fileInfo(setting.host[i],'1234','type=req&key=file-infos&value=pcap',file[i]);
			// promiseFilter[i]=connection.requestMessage(setting.host[i],'1234','type=filter&key=status',file[i]);
		}
		var p = Promise.all(promisePcap.concat(promiseFilter));
		p.then(function(){
			//文件列表
			for(var j=0;j<setting.host.length;j++){
				if(file[j].pcap){
					for(var i=0;i<file[j].pcap.length;i++){
						var obj1={
							name:file[j].pcap[i].name,
							path:file[j].pcap[i].path,
							ip:setting.host[j],
							ctime:file[j].pcap[i].ctime
						}
						filter.files.push(obj1);				
					}
				}
			}
			filter.files.sort(ctimeCompare);
			// 正在过滤中，获取文件名用于状态提示
			// var filterRunning = false;
			// for(var i=0;i<setting.host.length;i++) {
			// 	if(file[i].data.status == 'running'){
			// 		filterRunning=true;
			// 		break;
			// 	}
			// }
			// if(filterRunning){
			// 	var promise=[];
			// 	var fileFilter=[];
			// 	for(var i=0;i<setting.host.length;i++){
			// 		fileFilter[i]=new Object();
			// 		promise[i]=connection.fileInfo(setting.host[i],'1234','type=req&key=file-infos&value=filterpcap',fileFilter[i]);
			// 	}
			// 	Promise.all(promise).then(function(){
			// 		for(var j=0;j<setting.host.length;i++){
			// 			for(var i=0;i<fileFilter[j].filterpcap.length;i++){
			// 				fileFilter[j].filterpcap[i].ip=setting.host[0];
			// 				fileFilter[j].filterpcap[i].ctime=parseInt(fileFilter[j].filterpcap[i].ctime*1000);
			// 				filter.data.push(fileFilter[j].filterpcap[i]);
			// 			}
			// 		}
			// 		filter.data.sort(ctimeCompare);
			// 		res.render('filter',{
			// 			filesPcap:filter
			// 		});
			// 	},function(value){
			// 		console.log(value);
			// 	});
			// }else{
				res.render('filter',{
					filesPcap:filter
				});
		},function(value){
			console.log(value);
		});
	});
	//过滤包汇总
	app.get('/filterPcapAll',function(req,res){
		var filterStatus=[];
		var promise=[];
		var filterSuccess=true;//过滤完成
		for(var i=0;i<setting.host.length;i++){
			filterStatus[i]=new Object();
			promise[i]=connection.requestMessage(setting.host[i],'1234','type=filter&key=status',filterStatus[i]);
		}
		Promise.all(promise).then(function(){
			for(var i=0;i<setting.host.length;i++){
				if(filterStatus[i].data.status == 'running'){
					filterSuccess=false;//过滤未完成
				}
			}
		});
		var file=[];
		var data=[];
		var promise=[];
		for(var i=0;i<setting.host.length;i++){
			file[i]=new Object();
			promise[i]=connection.fileInfo(setting.host[i],'1234','type=req&key=file-infos&value=filterpcap',file[i]);
		}
		Promise.all(promise).then(function(){
			for(var j=0;j<setting.host.length;j++){
				if(file[j].filterpcap){
					for(var i=0;i<file[j].filterpcap.length;i++){
						file[j].filterpcap[i].ip=setting.host[0];
						file[j].filterpcap[i].ctime=parseInt(file[j].filterpcap[i].ctime*1000);
						data.push(file[j].filterpcap[i]);
					}				
				}
			}
			data=data.sort(ctimeCompare);
			if(!filterSuccess){
				data.push('filtering');
			}
			res.json(data);
		},function(value){
			console.log(value);
		});
	});
	function ctimeCompare(obj1,obj2){
		return obj2.ctime-obj1.ctime;
	}
	//过滤命令
	app.get('/filterPcap',function(req,res){
		var filterStatus=[];
		var promise=[];
		for(var i=0;i<setting.host.length;i++){
			filterStatus[i]=new Object();
			promise[i]=connection.requestMessage(setting.host[i],'1234','type=filter&key=status',filterStatus[i]);
		}
		Promise.all(promise).then(function(){
			for(var i=0;i<setting.host.length;i++){
				if(filterStatus[i].data.status == 'running'){
					res.json('过滤未完成');
					return;
				}
			}
		});
		var exp=req.query.exp;
		var file=req.query.pcap;
		var ip=file.split('&')[0];
		var path=file.split('&')[1];
		var filename=file.split('&')[2];
		connection.sendMessage(ip,'1234','type=filter&key=start&value='+path+'/'+filename+'&exp="'+exp+'"');
		res.json('过滤中。。。');
	});
	app.get('/fileFilterDelete',function(req,res){
		var file=req.query;
		var fileDelete={};
		if(!file.filename){
			res.json('选择错误');
		}else{
			var p=connection.requestMessage(file.fileip,'1234','type=req&key=file-remove&src='+file.filepath+'/'+file.filename,fileDelete);
			p.then(function(){
				if(fileDelete.data['file-remove']==true){
					res.json(true);
				}else{
					res.json(false);
				}
			});
		}
	});
	app.get('/csvFile',function(req,res){
		var csv=[];
		fs.readdir(setting.csvpath,function(err,files){
			if(err){
				throw err;
			}else{
				for(var i=0;i<files.length;i++){
					csv.push(files[i]);
				}
				res.json(csv.sort(function(name1,name2){
					return parseInt(name2.slice(4,17))-parseInt(name1.slice(4,17));
				}));
			}
		});
	});
	app.get('/csvFileErr',function(req,res){
		var csv=[];
		fs.readdir(setting.csvpath,function(err,files){
			if(err){
				throw err;
			}else{
				for(var i=0;i<files.length;i++){
					if(/img_error_path.csv/.test(files[i])){
						csv.push(files[i]);
					}
				}
				res.json(csv.sort(function(name1,name2){
					return parseInt(name2.slice(4,17))-parseInt(name1.slice(4,17));
				}));
			}
		});
	});
	app.get('/fileDeleteCsv',function(req,res){
		var filename=req.query.filename;
		fs.unlink(setting.csvpath+'/'+filename,function(err){
			if(err){
				throw err;
			}else{
				res.json(true);
			}
		})
	});
	function quchong(arr){
		var newarr=[];
		var hash={};
		for(var i=0;i<arr.length;i++){
			var key=arr[i];
			if(hash[key]!=1){
				newarr.push(arr[i]);
				hash[key]=1;
			}
		}
		return newarr;
	}
	//分析页面
	app.get('/analysefile',function(req,res){
		var file1={};
		var choose_arr=[];
		var choose_time_tmp=[];
		var choose_time=[];
		//只需要获得抓包的各个时间，查询一台服务器就够了
		var p=connection.fileInfo(setting.host[0],'1234','type=req&key=file-infos&value=pcap',file1);
		p.then(function(){
			if(file1.pcap){
				for(var i=0;i<file1.pcap.length;i++){
					choose_arr.push(file1.pcap[i].name);
				}
			}
			for(var i=0;i<choose_arr.length;i++){
				choose_time_tmp.push(choose_arr[i].slice(4,17));
			}
			choose_time=choose_time_tmp.filter(function(element,index,self){
				return self.indexOf(element)===index;
			})
			res.render('analyse',{
				pick_time:choose_time.sort().reverse()
			});
		},function(value){
			console.log(value);
		});
	});
	//分析文件
	app.get('/analyse',function(req,res){
		var time=req.query.selecttime;
		var csvFile=[];
		var promise=[];
		var csvFileAll=[];
		var csvname=[];
		var have=false;
		//服务器的解析文件csv
		for(var i=0;i<setting.host.length;i++){
			csvFile[i]=new Object();
			promise[i]=connection.fileInfo(setting.host[i],'1234','type=req&key=file-infos&value=csv',csvFile[i]);
		}
		
		Promise.all(promise).then(function(){
			for(var i=0;i<setting.host.length;i++){
				csvFileAll=csvFileAll.concat(csvFile[i].csv);
			}
			for(var i=0;i<csvFileAll.length;i++){
				csvname.push(csvFileAll[i].name);
			}
			csvname=quchong(csvname);
			for(var i=0;i<csvname.length;i++){
				if(csvname[i].indexOf(time)!=-1){
					have=true;
				}
			}
			//解析文件已存在
			if(have){
				var csvAnalyseStatusExist=[];
				var promiseExist=[];
				//是否正在解析文件
				for(var i=0;i<setting.host.length;i++){
					csvAnalyseStatusExist[i]=new Object();
					promiseExist[i]=connection.requestMessage(setting.host[i],'1234','type=parse&key=status',csvAnalyseStatusExist[i]);
				}
				Promise.all(promiseExist).then(function(){
					for(var i=0;i<setting.host.length;i++){
						if(csvAnalyseStatusExist[i].data.status=='running'){
							res.json('文件解析中...');
						}
					}
					res.json("抓包服务器端分析文件已存在,点击获取按钮");
				},function(value){
					console.log(value);
				});
			}else{
				//分析文件不存在，触发解析
					var csvAnalyseStatus=[];
					var start=[];
					var promiseStatus=[];
					var promiseStart=[];
					for(var i=0;i<setting.host.length;i++){
						csvAnalyseStatus[i]=new Object();
						promiseStatus[i]=connection.requestMessage(setting.host[i],'1234','type=parse&key=status',csvAnalyseStatus[i]);
					}
					Promise.all(promiseStatus).then(function(){
						for(var i=0;i<setting.host.length;i++){
							if(csvAnalyseStatus[i].data.status !='running'){
								start[i]=new Object();
								promiseStart[i]=connection.requestMessage(setting.host[i],'1234','type=parse&key=start&value='+time,start[i]);
							}
						}
						Promise.all(promiseStart).then(function(){
							var allStart=true;
							for(var i=0;i<setting.host.length;i++){
								if(!start[i].data.pid){
									allStart=false;
									res.json('启动失败')
								}
								console.log(start[i].data.pid)
							}
							if(allStart){
								res.json('启动解析数据包');
							}
						});
					});
				// var timer=setInterval(function(){
				// 	var p3=connection.requestMessage(setting.host[0],'1234','type=parse&key=status',csvfile1);
				// 	p3.then(function(){
				// 		if(csvfile1.data.status!='running'){
				// 			//启动解析
				// 			var p4=connection.requestMessage(setting.host[0],'1234','type=parse&key=start&value='+time,start1);
				// 			p4.then(function(){
				// 				if(start1.data.pid){
				// 					res.json('启动解析数据包');
				// 					clearInterval(timer);
				// 				}
				// 			},error);
				// 		}
				// 	},function(value){
				// 		console.log(value);
				// 	});
				// },500);
			}
		},function(value){
			console.log(value);
		});
	});
//获取分析文件至web服务器端
	app.get('/getCsv',function(req,res){
		var time=req.query.selecttime;
		var csv=[];
		var have=false;
		var csvStatus=[];
		var promise=[];
		for(var i=0;i<setting.host.length;i++){
			csvStatus[i]=new Object();
			promise[i]=connection.requestMessage(setting.host[i],'1234','type=parse&key=status',csvStatus[i]);
		}
		Promise.all(promise).then(function(){
			for(var i=0;i<setting.host.length;i++){
				console.log(csvStatus[i].data.status);
				if(csvStatus[i].data.status =='running'){
					res.json("数据包解析中。。。");
				}
			}
				//先判断web服务器上指定的分析文件有没有
				fs.readdir(setting.csvpath,function(err,files){
					if(err){
						throw err;
					}else{
						for(var i=0;i<files.length;i++){
							csv.push(files[i].slice(4,17));
						}
						csv=quchong(csv);
						if(csv.indexOf(time)!=-1){
							//文件已存在，不能判断解析有没有结束
							res.json("web服务器端分析文件已存在，可显示报告");
						}else{
							var csvFileInfo=[];
							var csvFile=[];
							var csvname=[];
							var promiseFileInfo=[];
							//得到抓包服务器上的csv文件的名字列表
							for(var i=0;i<setting.host.length;i++){
								csvFileInfo[i]=new Object();
								promiseFileInfo[i]=connection.fileInfo(setting.host[i],'1234','type=req&key=file-infos&value=csv',csvFileInfo[i]);
							}
							Promise.all(promiseFileInfo).then(function(){
								for(var i=0;i<setting.host.length;i++){
									csvFile=csvFile.concat(csvFileInfo[i].csv);
								}
								for(var i=0;i<csvFile.length;i++){
									csvname.push(csvFile[i].name);
								}
								
								csvname=quchong(csvname);
								//查看抓包端指定的csv有没有生成
								for(var i=0;i<csvname.length;i++){
									if(csvname[i].indexOf(time)!=-1){
										have=true;
									}
								}
								//指定的csv不存在，需要分析
								if(!have){
									res.json("抓包服务器端分析文件不存在,点击分析按钮");
								}else{
								//指定的csv在抓包服务端存在，需要传输给web端
									var csvTrans=[];
									var promiseTrans=[];
									for(var i=0;i<setting.host.length;i++){
										csvTrans[i]=new Object();
										promiseTrans[i]=connection.requestMessage(setting.host[i],'1234','type=trans&key=status',csvTrans[i]);
									}
									Promise.all(promiseTrans).then(function(){
										for(var i=0;i<setting.host.length;i++){
											if(csvTrans[i].data.status != 'running'){
												connection.sendMessage(setting.host[i],'1234','type=trans&key=start&value=csv&dst='+setting.webhost+':'+setting.csvpath+'&filter='+time);
											}
										}
										res.json('分析文件传输中。。。');
									},function(value){
										console.log(value);
									});
								}
							},function(value){
								console.log(value);
							});
						}
					}
				});
		},function(value){
			console.log(value);
		});
	});
	app.post('/cover_export',function(req,res){
		var type=req.body.type;
		var content=req.body.content;
		var head='<meta charset="utf-8"><link rel="stylesheet" type="text/css" href="../css/analyse.css" />';
		var script="<script>document.getElementsByTagName('head')[0].innerHTML='"+head+"'</script>";
		//拼接后，单引号和双引号要一一对应好,上面head*内部*不能出现单引号
		//字符串内部不能出现外部包的引号
		// var script="<script>document.getElementsByTagName('head')[0].innerHTML='"+head1+"'</script>";
		//<script src='../public/js/mypic.js'></script>
		script+="<script src='../js/jquery.min.js'></script>";
		content+=script;
		fs.writeFile("public/report/"+type+"分析报告封面.html",content,function(err){
			if(err)throw err;
			console.log("file saved");
		})
		res.json('report/'+type+"分析报告封面.html");
	});
	app.get('/showreport',function(req,res){
		var personcommon=req.query.personalcommon;
		var select_time=req.query.selecttime;
		console.log(select_time);
		var fs=require('fs');
		var path=setting.csvpath+'/';

		//console.log(setting);
	
		var capture_lines_number=[];//线路数字
		var loadbalance_out_info=[];
		var loadbalance_in_file=[];
		var match_date=[];
		var img_file=[];
		var protocol_file=[];
		var error_path_file=[];
		var current_capture_lines=[];

		var img_single_file_content=[];
		var protocol_single_file_content=[];
		var error_path_single_file_content=[];
		var loadbalance_in_file_img_content=[];
//////抓包线路数字/////////////////////////////////////////////////////////////////////////////////////
		for(var i=0;i<setting.capture_lines.length;i++){
			capture_lines_number.push(setting.capture_lines[i][1]);
		}				
			
//////LB匹配抓包线路/////////////////////////////////////////////////////////////////////////////////
		for(var i=0;i<setting.loadbalance_in_info.length;i++){
			for(var j=0;j<setting.capture_lines.length;j++){
				if(setting.capture_lines[j][1]==setting.loadbalance_in_info[i][1]){
					loadbalance_out_info.push([setting.capture_lines[j][2],setting.capture_lines[j][3]]);
				}
			}
		}
///////读取result路径下文件名/////////////////////////////////////////////////////////////////////////
		fs.readdir(path,function(err,files){
			if(err){
				throw err;
			}else{
				//console.log(files.length);
				var match_time_reg=/_(20\d{6}_\d{4})/;
				var img=/(img_result)/;
				var protocol=/(ports)/;
				var error_path=/(error_path)/;
///////匹配选定日期文件///////////////////////////////////////////////////////////////////////////////
			for(var i=0;i<files.length;i++){
				if(match_time_reg.exec(files[i])[1]==select_time){
					match_date.push(files[i]);
				}
			}
///////匹配选定日期抓包文件（不包括lb和web）///////////////////////////////////////////////////////////
			for(var i=0;i<setting.capture_lines.length;i++){
				var capture_lines_ip = new RegExp(setting.capture_lines[i][2]);
				var capture_lines_nic = new RegExp(setting.capture_lines[i][3]);
				for(var j=0;j<match_date.length;j++){
					if(capture_lines_ip.exec(match_date[j])&&capture_lines_nic.exec(match_date[j])){
						current_capture_lines.push(match_date[j]);
					}
				}
			}
///////匹配选定日期lb和对应抓包路线文件（2个）/////////////////////////////////////////////////////////
			for(var i=0;i<setting.loadbalance_in_info.length;i++){
				var loadbalance_in_regepx_ip=new RegExp(setting.loadbalance_in_info[i][2]);	
				var loadbalance_in_regepx_nic=new RegExp(setting.loadbalance_in_info[i][3]);
				for(j=0;j<match_date.length;j++){
					if(loadbalance_in_regepx_ip.exec(match_date[j])&&loadbalance_in_regepx_nic.exec(match_date[j])){
						loadbalance_in_file.push(match_date[j]);							
					}
				}
			}
///////选定日期抓包文件分类///////////////////////////////////////////////////////////////////////////////
			for(var i=0;i<match_date.length;i++){
				var match_success=img.exec(current_capture_lines[i]) || protocol.exec(current_capture_lines[i]) || error_path.exec(current_capture_lines[i]);
				if(match_success){
					switch(match_success[1]){
						case 'img_result':
							img_file.push(current_capture_lines[i]);
							break;
						case 'ports':
							protocol_file.push(current_capture_lines[i]);
							break;
						case 'error_path':
							error_path_file.push(current_capture_lines[i]);								
							break;
					}								
				}				
			}

			if(loadbalance_in_file){
				var loadbalance_in_file_img=[];
				for(var i=0;i<loadbalance_in_file.length;i++){
					if(img.exec(loadbalance_in_file[i])){
						loadbalance_in_file_img.push(loadbalance_in_file[i]);
					}
				}
				for(var i=0;i<loadbalance_out_info.length;i++){
					if(loadbalance_out_info[i]==[]){
						break;
					}
					var loadbalance_out_info_ip=new RegExp(loadbalance_out_info[i][0])
					var loadbalance_out_info_nic=new RegExp(loadbalance_out_info[i][1])
					for(var j=0;j<img_file.length;j++){										
						if(loadbalance_out_info_ip.exec(img_file[j])&&loadbalance_out_info_nic.exec(img_file[j])){
						loadbalance_in_file_img.push(img_file[j]);
						}
					}
				}								
			}
					
			var file_num1=0;
			var file_num2=0;
			var file_num3=0;
			var file_num4=0;
			var analyse_Data={
				config_file:{},
				capture_lines_number:capture_lines_number,
				img:false,
				protocol:false,
				error_path:false,
				lb:false
				};	
			console.log(img_file);
			if(img_file.length==0 || protocol_file.length==0){
				res.json("no report");
			}else{
				console.log(img_file);
				function config_file_val_personal(){
					analyse_Data.config_file.lines_info=setting.capture_lines;						
					analyse_Data.config_file.ip_info=setting.ip_info;
					var match_start_time_reg=/_(\d{6})_/;
					analyse_Data.config_file.starttime=match_start_time_reg.exec(img_file[0])[1];
				}	
				config_file_val_personal();	

				img_file.forEach(function(file){
					fs.readFile(path+file,'utf8',function(err,data){
						if(err){
							throw err;
						}else{
							var single_file_index=data.indexOf('NO-RESPONSE PACKETS');
							var newdata=data.slice(0,single_file_index);
							for(var i=0;i<setting.capture_lines.length;i++){
					            var capture_lines_ip = new RegExp(setting.capture_lines[i][2]);
								var capture_lines_nic = new RegExp(setting.capture_lines[i][3]);
								if(capture_lines_ip.exec(file)&&capture_lines_nic.exec(file)){
				                    var newdata2=newdata.split('\n');
				                    var final_arr=[];
				                    for(j=0;j<2;j++){
				                        final_arr.push(newdata2[j].split(','));
				                    }
				                    var start_eq_index=final_arr[0].indexOf('Start time');
				                    console.log(final_arr);
				                    if(final_arr[1][start_eq_index]!='n/a'){
										img_single_file_content.push(setting.capture_lines[i][1]+newdata);
									}
								}
							}
							file_num1++;
							if(file_num1==img_file.length){
								analyse_Data.img_content=img_single_file_content;
								analyse_Data.img=true;
							}					
						}
					})
				});
				protocol_file.forEach(function(file){
					fs.readFile(path+file,'utf8',function(err,data){
						if(err){
							throw err;
						}else{
							for(var i=0;i<setting.capture_lines.length;i++){
						        var capture_lines_ip = new RegExp(setting.capture_lines[i][2]);
								var capture_lines_nic = new RegExp(setting.capture_lines[i][3]);
								if(capture_lines_ip.exec(file)&&capture_lines_nic.exec(file)){
									if(action(data)){
										protocol_single_file_content.push([setting.capture_lines[i][1]].concat(action(data)));
									}
								}
								 
							}
							file_num2++;
							if(file_num2==protocol_file.length){
								analyse_Data.protocol_content=protocol_single_file_content;
								analyse_Data.protocol=true;
							}					
						}
					})
				});
				error_path_file.forEach(function(file){
					fs.readFile(path+file,'utf8',function(err,data){
						if(err){
							throw err;
						}else{
							
							error_path_single_file_content.push(data);
							file_num3++;
							if(file_num3==error_path_file.length){
								analyse_Data.error_path_content=error_path_single_file_content;
								analyse_Data.error_path=true;
								// console.log(person_Data);
							}					
						}
					})
				});

				loadbalance_in_file_img.forEach(function(file){
					fs.readFile(path+file,'utf8',function(err,data){
						if(err){
							throw err;
						}else{
							
							var lb_single_file_index=data.indexOf('NO-RESPONSE PACKETS');
							var lb_newdata=data.slice(0,lb_single_file_index);
							for(var i=0;i<setting.loadbalance_in_info.length;i++){
					               var capture_lines_ip = new RegExp(setting.loadbalance_in_info[i][2]);
								var capture_lines_nic = new RegExp(setting.loadbalance_in_info[i][3]);
								if(capture_lines_ip.exec(file)&&capture_lines_nic.exec(file)){
									loadbalance_in_file_img_content.push('in'+lb_newdata);
								}else{
									loadbalance_in_file_img_content.push(lb_newdata);
								}
							}	
							file_num4++;
							if(file_num4==loadbalance_in_file_img.length){
								analyse_Data.lb_content=loadbalance_in_file_img_content;
								analyse_Data.lb=true;
							}					
						}
					})
				});

				var timer=setInterval(function(){
					if(analyse_Data.protocol&&analyse_Data.img&&analyse_Data.error_path){
						// console.log(analyse_Data);
						res.json(analyse_Data);
						clearInterval(timer);
					}
				},200);
				}
			}
		})
	});
	function action(str){
		var array=[[],[],[],[]];
		if(/PORTS/.test(str)){
			str=str.split('\n');
			for(var i=4;i<str.length;i++){
				if(str[i]){
					var strnew=str[i].split(',');
					array[0].push([parseInt(strnew[0])*1000,parseInt(strnew[1])]);
					array[1].push([parseInt(strnew[0])*1000,parseInt(strnew[2])]);
					array[2].push([parseInt(strnew[0])*1000,parseInt(strnew[3])]);
					array[3].push([parseInt(strnew[0])*1000,parseInt(strnew[4])]);
				}else{
					break;
				}
			}
			return array;
		}else{
			return false;
		}
	}
	app.post('/export',function(req,res){
		var name=["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
		var month=req.body.selecttime.slice(4,6);
		var type=req.body.personalcommon;
		var fileType={
			"personal":"个人",
			"common":"单位"
		};
		var content=req.body.content;
		var head='<meta charset="utf-8"><link rel="stylesheet" type="text/css" href="../css/analyse.css" />';
		var script="<script>document.getElementsByTagName('head')[0].innerHTML='"+head+"'</script>";
		//拼接后，单引号和双引号要一一对应好,上面head*内部*不能出现单引号
		//字符串内部不能出现外部包的引号
		// var script="<script>document.getElementsByTagName('head')[0].innerHTML='"+head1+"'</script>";
		//<script src='../public/js/mypic.js'></script>
		script+="<script src='../js/jquery.min.js'></script><script src='../js/highcharts.js'></script>";
		content+=script;
		fs.writeFile("public/report/"+name[parseInt(month)-1]+fileType[type]+"分析报告.html",content,function(err){
			if(err)throw err;
			console.log("file saved");
		})
		res.json('report/'+name[parseInt(month)-1]+fileType[type]+"分析报告.html");
	});
	app.get('/log',function(req,res){
		res.render('log');
	});
	app.get('/get_log_info',function(req,res){
		var log_info1={
			ip:setting.host[0]
		};
		var log_info2={
			ip:setting.host[1]
		};
		var log_info={};
		var p1=connection.fileInfo(setting.host[0],'1234','type=req&key=file-infos&value=log',log_info1);
		var p2=connection.fileInfo(setting.host[1],'1234','type=req&key=file-infos&value=log',log_info2);
		p1.then(function(){
			if(log_info1.log){
				for(var i=0;i<log_info1.log.length;i++){
					log_info1.log[i].mtime=getdate(parseInt(log_info1.log[i].mtime)*1000);
				}
			}
			if(log_info2.log){
				for(var i=0;i<log_info2.log.length;i++){
					log_info2.log[i].mtime=getdate(parseInt(log_info2.log[i].mtime)*1000);
				}
			}
			log_info.log_info1=log_info1;
			log_info.log_info2=log_info2;
			res.json(log_info);
		});
	});
	app.get('/showAgentLog',function(req,res){
    	var fs=require('fs');
    	fs.readFile('log/server.log','utf8',function(err,data){
    		res.json(data);
    	}); 
	});

	app.get("/get_syslog_info",function(req,res){
		var syslog_info1={
			ip:setting.host[0]
		};
		var syslog_info2={
			ip:setting.host[1]
		};
		var syslog_info={};
		var p1=connection.requestMessage(setting.host[0],'1234','type=info&key=syslog',syslog_info1);
		var p2=connection.requestMessage(setting.host[1],'1234','type=info&key=syslog',syslog_info2);
		Promise.all([p1,p2]).then(function(){
			syslog_info.syslog_info1=syslog_info1;
			syslog_info.syslog_info2=syslog_info2;
			res.json(syslog_info);
		});
	});

	app.get('/set_syslog_ip_port',function(req,res){
		var ip=req.query.ip;
		var syslog_ip=req.query.syslog_ip;
		var syslog_port=req.query.syslog_port;
		var ip_port_prop=syslog_ip+'#'+syslog_port;
		var modify_info={};
		var p=connection.requestMessage(ip,'1234','type=req&key=syslog&value='+syslog_ip+'#'+syslog_port,modify_info);
		p.then(function(){
			if(modify_info.data.syslog==false){
				res.json('config no change');
			}else{
				res.json('config success');
			}
		});
	});
}