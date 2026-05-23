package com.qmeetx.authenticationservice.domain.models;/*
package com.qmeetx.authservice.domain.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;


import java.util.List;
import java.util.UUID;
@Entity
@Data
public class Organization {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)

private UUID organizationID;

private String organizationName;
  @OneToMany(mappedBy = "organization")
public List<User> user;

@NotBlank()
@Column(unique = true)
  private String tenantId;


}
*/
