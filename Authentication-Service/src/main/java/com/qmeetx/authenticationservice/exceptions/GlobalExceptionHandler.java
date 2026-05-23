package com.qmeetx.authenticationservice.exceptions;

import com.qmeetx.authenticationservice.api.dto.ApiError;
import com.qmeetx.authenticationservice.api.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
/* @ Used because there is global exception present
at QMEETX-Shared which execute At last if no EXCEPTION handler found
in this Module
* */
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {

    //Handle Email Already Exist Exception

    @ExceptionHandler(EmailAlreadyExistException.class)
 public ResponseEntity<ApiResponse<ApiError>> handleEmailAlreadyExistException(EmailAlreadyExistException ex,HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), request, null);
    }

//Handle DTO Validations (@NOT BLANK(),@SIZE() etc)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String,String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach((fielderror) -> {
            errors.put(fielderror.getField(),fielderror.getDefaultMessage());
        });

        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation failed", request, errors);
    }


    @ExceptionHandler(UserNotFoundException.class)
public ResponseEntity<ApiResponse<ApiError>> handleUserNotFoundException(UserNotFoundException ex,HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request, null);
    }

    @ExceptionHandler(PasswordNotMatchException.class)
    public ResponseEntity<ApiResponse<ApiError>> handlePasswordNotMatchException(PasswordNotMatchException ex,HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), request, null);
    }

//Handle OAuth Exception Email processing in OAuth
    @ExceptionHandler(OAuthProcessingException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleOAuthProcessingException(OAuthProcessingException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request, null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request, null);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleIllegalStateException(IllegalStateException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        String root = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        log.warn("Data integrity violation on {}: {}", request.getRequestURI(), root);

        String message = "Could not complete this request because of conflicting account data.";
        if (root != null) {
            if (root.contains("IX_user_accounts_auth_user_id") || root.contains("auth_user_id")) {
                message = "You already started signing up with this email. Check your inbox for the verification code, "
                        + "or open the verification page and use Resend code. If you finished signup before, try logging in.";
            } else if (root.toLowerCase().contains("email")) {
                message = "Email Already Exist";
            }
        }

        return buildErrorResponse(HttpStatus.CONFLICT, message, request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ApiError>> handleAnyUnhandledException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on path {}", request.getRequestURI(), ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", request, null);
    }

    private ResponseEntity<ApiResponse<ApiError>> buildErrorResponse(
            HttpStatus status,
            String message,
            HttpServletRequest request,
            Map<String, ?> details
    ) {
        ApiError apiError = ApiError.builder()
                .status(status.value())
                .error(status.getReasonPhrase())
                .path(request.getRequestURI())
                .details(details)
                .build();

        return ResponseEntity.status(status).body(ApiResponse.error(message, apiError));
    }





}
