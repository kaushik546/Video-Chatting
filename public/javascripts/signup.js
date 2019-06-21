$(document).ready(function(){
	$(".notify").hide();
	$("input").focus(function(){
		$(".notify").fadeIn("slow");
	});

	var is_name=false,is_user=false,is_email=false,is_pass=false,is_repass=false;


	$("#fullNameFld").blur(function(){
		var str = $(this).val();
		if(str.match(/^\s*$/)){
			$(".name-notify .arrow").css("border-right","solid 15px red");
			$(".name-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Required field, Please fill up");
		}
		else{
			$(".name-notify .arrow").css("border-right","solid 15px #728EAA");
			$(".name-notify .arrow-body").css({"background":"#728EAA","color":"#fff"}).text("Nice name");
			is_name=true;
		}
			
	});

	$("#userNameFld").blur(function(){
		var str = $(this).val();
		if(str.match(/^\s*$/)){
			$(".user-notify .arrow").css("border-right","solid 15px red");
			$(".user-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Required field, Please fill up");
		}
		else{
			$.ajax({
				url:"check_user",
				type:"GET",
				data:$(this).serializeArray(),
				success:function(is_user_exist){
					if(is_user_exist == 'yes'){
						$(".user-notify .arrow").css("border-right","solid 15px #728EAA");
						$(".user-notify .arrow-body").css({"background":"#728EAA","color":"#fff"}).html("'<b>"+str+"</b>' is available");
						is_user=true;
					}
					else if(is_user_exist == 'no'){
						$(".user-notify .arrow").css("border-right","solid 15px red");
						$(".user-notify .arrow-body").css({"background":"red","color":"#fff"}).html("'<b>"+str+"</b>' already used!");
					}
				}
			});
			
		}
			
	});

	$("#emailFld").blur(function(){
		var str = $(this).val();
                var patt_email = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]|w+)*/;
		if(str.match(/^\s*$/)){
			$(".email-notify .arrow").css("border-right","solid 15px red");
			$(".email-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Required field, Please fill up");
		}
                else if(!patt_email.test(str)){
                        $(".email-notify .arrow").css("border-right","solid 15px red");
			$(".email-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Please enter valid email");
                }
		else{
			$.ajax({
				url:"check_email",
				type:"GET",
				data:$(this).serializeArray(),
				success:function(is_email_exist){
					if(is_email_exist == 'yes'){
						$(".email-notify .arrow").css("border-right","solid 15px #728EAA");
						$(".email-notify .arrow-body").css({"background":"#728EAA","color":"#fff"}).html("'<b>"+str+"</b>' is available");
						is_email=true;

					}
					else if(is_email_exist == 'no'){
						$(".email-notify .arrow").css("border-right","solid 15px red");
						$(".email-notify .arrow-body").css({"background":"red","color":"#fff"}).html("'<b>"+str+"</b>' already used!");
					}
				}
			});
		}
			
	});

	$("#passwordFld").focus(function(){
		$(".password-notify .arrow").css("border-right","solid 15px #728EAA");
		$(".password-notify .arrow-body").css({"background":"#728EAA","color":"#fff"}).text("Password atleast 7 characters");	
	});

	$("#passwordFld").blur(function(){
		var str = $(this).val();
		if(str.match(/^\s*$/)){
			$(".password-notify .arrow").css("border-right","solid 15px red");
			$(".password-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Required field, Please fill up");
		}
		else if(str.length<7)
			{
				$(".password-notify .arrow").css("border-right","solid 15px red");
				$(".password-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Password atleast 7 characters");
			}
			 else{
				$(".password-notify .arrow").css("border-right","solid 15px #728EAA");
				$(".password-notify .arrow-body").css({"background":"#728EAA","color":"#fff"}).text("Accepted");
				is_pass=true;
		     }
			
	});

	$("#rePasswordFld").blur(function(){
		var str = $(this).val();
		if(str.match(/^\s*$/)){
			$(".repassword-notify .arrow").css("border-right","solid 15px red");
			$(".repassword-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Required field, Please fill up");
		}
		else if($("#passwordFld").val() != $("#rePasswordFld").val())
			{
				$(".repassword-notify .arrow").css("border-right","solid 15px red");
				$(".repassword-notify .arrow-body").css({"background":"red","color":"#fff"}).text("Password does not match");
			}
			 else{
				$(".repassword-notify .arrow").css("border-right","solid 15px #728EAA");
				$(".repassword-notify .arrow-body").css({"background":"#728EAA","color":"#fff"}).text("Match");
				is_repass=true;
		     }
			
	});

	// submit form to server
        
	$("#signup_form").submit(function(event){
		event.preventDefault();
		if(is_name && is_user && is_email && is_pass && is_repass){
			var signupData = $(this).serializeArray();  
			$.ajax({
				url:"save_signup_data",
				type:"GET",
				data:signupData,
				success:function(results){
					$(".success").show();
                                        
                                        setTimeout(function(){
                                            $(".success").fadeOut("fast");
                                            window.location="/login";
                                        },3000);
                                        
				}
			});

		}
	});
});
