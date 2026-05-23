package com.qmeetx.authenticationservice.application.oauth.Google;


import com.qmeetx.authenticationservice.domain.models.User;
import org.springframework.security.oauth2.core.user.OAuth2User;

public interface OAuthUserService {

    public User OAuthLogin(OAuth2User oAuth2User);

}
