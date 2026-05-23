package com.qmeetx.authenticationservice.exceptions;

public class PasswordNotMatchException extends RuntimeException {
  public PasswordNotMatchException(String message) {
    super(message);
  }
}
