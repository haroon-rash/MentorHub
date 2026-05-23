package com.qmeetx.authenticationservice.domain.Utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.RSAPublicKeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

@Component
public class keyloader {

    @Value("${jwt.private-key-path}")
    private String privateKeyPath;

    public PrivateKey loadKey() throws IOException, NoSuchAlgorithmException, InvalidKeySpecException {
        String keyContent;
        if (privateKeyPath != null && privateKeyPath.startsWith("classpath:")) {
            String resourcePath = privateKeyPath.substring("classpath:".length());
            if (!resourcePath.startsWith("/")) {
                 resourcePath = "/" + resourcePath;
            }
            try (java.io.InputStream is = getClass().getResourceAsStream(resourcePath)) {
                if (is == null) {
                    throw new IOException("Resource not found: " + resourcePath);
                }
                keyContent = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            }
        } else {
            keyContent = Files.readString(Path.of(privateKeyPath));
        }

        String key = keyContent
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] decode = Base64.getDecoder().decode(key);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decode);

        return KeyFactory.getInstance("RSA").generatePrivate(spec);
    }

    public PublicKey loadPublicKey() throws IOException, NoSuchAlgorithmException, InvalidKeySpecException {
        PrivateKey privateKey = loadKey();
        if (!(privateKey instanceof RSAPrivateCrtKey rsaPrivateKey)) {
            throw new InvalidKeySpecException("Private key is not an RSA private key");
        }

        RSAPublicKeySpec publicKeySpec = new RSAPublicKeySpec(rsaPrivateKey.getModulus(), rsaPrivateKey.getPublicExponent());
        return KeyFactory.getInstance("RSA").generatePublic(publicKeySpec);
    }



}
