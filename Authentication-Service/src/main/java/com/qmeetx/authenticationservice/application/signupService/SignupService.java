package com.qmeetx.authenticationservice.application.signupService;


import com.qmeetx.authenticationservice.api.dto.SignupRequestDTO;

public interface SignupService {

    void signup(SignupRequestDTO signupRequestDTO);
 /*   public String createTenantId(String organizationName);
*/
}
