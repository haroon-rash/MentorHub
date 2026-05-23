package com.mentorhub.reviewratingservice.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.util.*;

@Configuration
public class CorsConfig {
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3005}") private String allowedOrigins;
    @Bean public CorsFilter corsFilter() { var c = new CorsConfiguration(); c.setAllowedOrigins(Arrays.asList(allowedOrigins.split(","))); c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("*")); c.setAllowCredentials(true); var s = new UrlBasedCorsConfigurationSource(); s.registerCorsConfiguration("/**", c); return new CorsFilter(s); }
}
