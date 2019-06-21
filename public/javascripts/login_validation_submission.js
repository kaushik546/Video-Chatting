$(document).ready(function(){
	$(".login-notify").hide();
	$("#login_form").submit(function(event){
		//event.preventDefault();
		var loginData = $(this).serializeArray(); 
		$.ajax({
			url:"authen",
			type:"GET",
			data:loginData,
			success:function(status){
				
			}
		});
	});
});