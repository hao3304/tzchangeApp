define("services",["js/jquery.min.js"],function(){

	var prefix = "http://120.24.215.190:112/";

	function login(p,c){
		$.get(prefix + "changeservice/login/"+p.username+"/"+p.pwd,c)
	}

	function getUser(id,c){
		$.get(prefix + "changeservice/phoneuserinfo/"+id,c);
	}

	function getMessage(id,c){
		$.get(prefix + "changeservice/msgs/"+id,c);
	}

	function getChangeTypes(c){
		$.get(prefix + "changeservice/changetypes?parent=",c);
	}

	function getPicUrl(p,c){
		return prefix +"UploadHandler.ashx?action=uploadimage&changeid="+p;
	}

	function upFileBusiness(p,c){
		return prefix +"UploadHandler.ashx?action=uploadbusinessimage&changeid="+p;
	}

	function uploadlicenseimage(p,c){
		return prefix +"UploadHandler.ashx?action=uploadlicenseimage&changeid="+p;
	}

	function postChange(p,c){
		$.get(prefix +"changeservice/changeupload",p,c);
	}

	function getChanges(p,c){
		$.get(prefix + "changeservice/changequery", p,c)
	}

	function getOtherChanges(p,c){
		$.get(prefix + "changeservice/otherchanges?phone="+p,c)
	}

	function getChangeByStatus(s,c){
		$.get(prefix + "changeservice/changes/"+s,c)
	}

	function getChangeDetail(s,c){
		$.get(prefix + "changeservice/change/"+s,c)
	}


	function getQuery(s,c){
		$.get(prefix + "changeservice/placequery",s,c)
	}

	function businessupload(p,c){
		$.get(prefix +"changeservice/businessupload",p,c);
	}

	function businessquery(p,c){
		$.get(prefix +"changeservice/businessquery",p,c);
	}


	return {
		login:login,
		getUser:getUser,
		getMessage:getMessage,
		getChangeTypes:getChangeTypes,
		getPicUrl:getPicUrl,
		postChange:postChange,
		getChanges:getChanges,
		getOtherChanges:getOtherChanges,
		getChangeByStatus:getChangeByStatus,
		getChangeDetail:getChangeDetail,
		getQuery:getQuery,
		prefix:prefix,
		upFileBusiness:upFileBusiness,
		uploadlicenseimage:uploadlicenseimage,
		businessupload:businessupload,
		businessquery:businessquery
	}
});
