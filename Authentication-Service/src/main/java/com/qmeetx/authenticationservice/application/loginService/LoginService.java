package com.qmeetx.authenticationservice.application.loginService;


import com.qmeetx.authenticationservice.api.dto.LoginRequestDTO;
import com.qmeetx.authenticationservice.domain.models.User;

public interface LoginService {

    User validateLogin(LoginRequestDTO loginRequestDTO);
}
