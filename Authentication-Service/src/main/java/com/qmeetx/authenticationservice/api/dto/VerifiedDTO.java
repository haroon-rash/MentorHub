package com.qmeetx.authenticationservice.api.dto;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class VerifiedDTO {

    String email;
    boolean Verified;
    public  boolean getVerified(){
        return Verified;
    }


}
