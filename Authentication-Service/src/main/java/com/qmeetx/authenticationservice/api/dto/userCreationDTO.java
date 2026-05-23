package com.qmeetx.authenticationservice.api.dto;


import com.qmeetx.authenticationservice.domain.enums.EventSource;
import lombok.Data;

@Data
public class userCreationDTO {

    private   String authId;
    private String username;
    private String email;
    private String role;
    private Boolean isVerified;
    private String source= EventSource.AUTH.name();


}
