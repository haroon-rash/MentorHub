package com.qmeetx.authenticationservice.application.oauth.Google;
import com.qmeetx.authenticationservice.domain.enums.AuthProvider;
import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.enums.UserReviewStatus;
import com.qmeetx.authenticationservice.domain.models.Provider;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.ProviderRepository;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.OAuthProcessingException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthUserServiceImp implements OAuthUserService {

    @Value("${app.security.super-admin-email:haroonurrasheed1212@gmail.com}")
    private String superAdminEmail;

    private final UserRepository userRepository;
    private final ProviderRepository providerRepository;



@Override
    @Transactional
    public User OAuthLogin(OAuth2User oAuth2User){

        String email =oAuth2User.getAttribute("email");
        //Google Unique Id of every users
        String sub = oAuth2User.getAttribute("sub");
        // return true only if email is verified

        boolean emailVerified = Boolean.TRUE.equals(oAuth2User.getAttribute("email_verified"));
        if(email==null){
            throw new OAuthProcessingException("Google Account did not Return an Email");
        }
        if (sub==null){
            throw new IllegalArgumentException("Google Account did not Return an Sub");
        }
        log.info("Google Login Attempts with : {} and  providerUserId : {}", email,sub);

        User user;



        Optional <Provider> existProvider = providerRepository.findByProviderNameAndProviderUserId(AuthProvider.GOOGLE,sub);
        if(existProvider.isPresent()) {
            user = existProvider.get().getUser();
            log.info("Existing Google Account-Linked with : {}", email);

        } else {
            //get 'LOCAL' USER
                user= userRepository.findByEmail(email);
        //If User is present
                if(user!=null){

             // Check this user is linked with 'GOOGLE' or not

                    boolean linked = user.getProviders().stream().anyMatch(p->AuthProvider.GOOGLE==p.getProviderName() && p.getProviderUserId().equals(sub));
             //if Not Linked Found Then Create provider
                    if(!linked){

                 Provider provider = new  Provider();
                 provider.setProviderUserId(sub);
                 provider.setProviderName(AuthProvider.GOOGLE);
                 provider.setUser(user);
                 user.getProviders().add(provider);
                 userRepository.save(user);


             }

                    if (isSuperAdminEmail(email) && user.getRole() != UserRole.OWNER) {
                        user.setRole(UserRole.OWNER);
                        user.setReviewStatus(UserReviewStatus.APPROVED);
                        userRepository.save(user);
                    }
          //if NOT USER is Found Then Create User and Provider with Null Password
        } else {
            user=new User();
            user.setEmail(email);
            user.setName(email.split("@")[0]);
            user.setRole(isSuperAdminEmail(email) ? UserRole.OWNER : UserRole.STUDENT);
            user.setVerified(emailVerified);
            user.setReviewStatus(UserReviewStatus.APPROVED);


            Provider provider = new  Provider();
            provider.setProviderUserId(sub);
            provider.setUser(user);
            provider.setProviderName(AuthProvider.GOOGLE);

            user.getProviders().add(provider);

            userRepository.save(user);


        }


        }

return user;
    }

    private boolean isSuperAdminEmail(String email) {
        return email != null && email.trim().equalsIgnoreCase(superAdminEmail);
    }




}
