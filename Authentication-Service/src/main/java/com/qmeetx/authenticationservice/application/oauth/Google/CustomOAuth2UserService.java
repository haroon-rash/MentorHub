package com.qmeetx.authenticationservice.application.oauth.Google;


import com.qmeetx.authenticationservice.domain.models.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final OAuthUserService oAuthUserService;
    private final HttpServletRequest request;
    @Override

    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
OAuth2User oAuth2User = super.loadUser(userRequest);
    User user= oAuthUserService.OAuthLogin(oAuth2User);
       request.setAttribute("oAuthUser", user);
        // delegate to default implementation to fetch attributes from Google userinfo endpoint
        // process user in DB (but we do token generation in success handler)
        // we don't return anything special — just return the loaded OAuth2User for the auth flow
        // NOTE: we DO NOT generate the JWT here (we do that in success handler)
        return oAuth2User;
    }



}
