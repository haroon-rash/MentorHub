package com.qmeetx.authenticationservice.application.loginService;


import com.qmeetx.authenticationservice.api.dto.LoginRequestDTO;
import com.qmeetx.authenticationservice.domain.enums.UserRole;
import com.qmeetx.authenticationservice.domain.models.User;
import com.qmeetx.authenticationservice.domain.repository.UserRepository;
import com.qmeetx.authenticationservice.exceptions.PasswordNotMatchException;
import com.qmeetx.authenticationservice.exceptions.UserNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class LoginServiceImp implements LoginService {

    private final UserRepository userRepository;
private final PasswordEncoder passwordEncoder;
    public LoginServiceImp(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User validateLogin(LoginRequestDTO loginRequestDTO) {

      User user= userRepository.findByEmail(loginRequestDTO.getEmail());

      if(user==null){
          throw new UserNotFoundException("User with this Email is Not Exist :  "+loginRequestDTO.getEmail());

           }
     if (!passwordEncoder.matches(loginRequestDTO.getPassword(),user.getPassword())){
         throw new PasswordNotMatchException("password is Invalid ,please Try with correct Password");
     }

     if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.OWNER) {
         throw new IllegalStateException("Admin accounts must sign in via the admin portal.");
     }

     if (!user.isVerified()) {
         throw new IllegalStateException("Email not verified. Please verify OTP before login.");
     }

     return user;


    }
}
