var fs=require('fs');
exports.host=function(setting){
	fs.readFile('agent.cfg','utf8',function(err,data){
		if(err){
			throw err;
		}else{
			setting.host=[];
			var agentString = /AGENT,(.*)\r/.exec(data);
			var hosts = agentString[1].split(',');
			setting.host = hosts;

			setting.csvpath=/Csvpath,(.*),/.exec(data)[1];
			setting.webhost=/Webhost,(.*),/.exec(data)[1];

			var line_capture_reg=/LINE(\d),\d+.\d+.\d+.(\d+),(\w{1,5})/g;
			var capture_lines=[];
			for(var i=0;i<1000;i++){
				var match=line_capture_reg.exec(data);
				if(line_capture_reg.lastIndex==0){
					break;
				}
				capture_lines.push(match);
			}
			setting.capture_lines=capture_lines;
			//LB线路匹配
			var loadbalance_in_reg=/LINE(\d)_LB,\d+.\d+.\d+.(\d+),(\w{4})/g;
			var loadbalance_in_info=[];
			for(var i=0;i<1000;i++){
				var loadbalance_in=loadbalance_in_reg.exec(data);
				if(loadbalance_in_reg.lastIndex==0){
					break;
				}
				loadbalance_in_info.push(loadbalance_in);
			}
			setting.loadbalance_in_info=loadbalance_in_info;
			//agentIP
			var agent_ip=/AGENT,(.+)\r/.exec(data)[1];
			setting.ip_info=agent_ip.split(',');
			
			//获取线路和网卡
			var pcap_reg=/LINE\d,\d+.\d+.\d+.\d+,\w{4}/g;
			var pcaps=[];
			for(var i=0;i<10;i++){
				var match=pcap_reg.exec(data);
				if(pcap_reg.lastIndex==0){
					break;
				}
				pcaps.push(match[0]);
			}
			setting.pcaps=pcaps;
			return setting;
		}
	})
}