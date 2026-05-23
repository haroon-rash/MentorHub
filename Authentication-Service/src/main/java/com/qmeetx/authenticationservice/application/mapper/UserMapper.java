package com.qmeetx.authenticationservice.application.mapper;


import com.qmeetx.authenticationservice.api.dto.SignupRequestDTO;
import com.qmeetx.authenticationservice.domain.models.User;


public class UserMapper {
    public static User maptoUser(SignupRequestDTO signupRequestDTO) {

        User user = new User();
        user.setEmail(signupRequestDTO.getEmail());
        user.setPassword(signupRequestDTO.getPassword());
        user.setName(signupRequestDTO.getName());

       /*
          user.setPhone(signupRequestDTO.getPhone());

        Organization organization =OrganizationMapper.mapToOrganization(signupRequestDTO) ;
        user.setOrganization(organization);
        user.setIndustry(signupRequestDTO.getIndustry());*/
        return user;

    }




}
