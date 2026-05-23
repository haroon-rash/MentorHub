package com.qmeetx.authenticationservice.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequestDTO {

    @NotBlank(message = "Name is Required")
    String name;
    @NotBlank
    @Email(message = "Valid Email is required")
    String email;
    @NotBlank
    @Size(min = 8,message = "Please Enter minimum 8  Character ")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$",
            message = "Password must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character"
    )
    String password;

        // Optional: defaults to STUDENT when omitted.
    @Pattern(regexp = "^(?i)(STUDENT|TUTOR|ADMIN|OWNER)?$", message = "Role must be STUDENT, TUTOR, ADMIN, or OWNER")
        String role;


    /*


    @NotBlank(message = "Please Enter Phone no")
    @Pattern(regexp = "^[0-9]{10,15}$", message = "Phone number must be between 10 to 15 digits with digits only")
    String phone;
    @NotBlank(message = "Organization Name is Required")
    String organizationName;
    @NotBlank(message = "Industry is Required")
    String industry;*/

}
