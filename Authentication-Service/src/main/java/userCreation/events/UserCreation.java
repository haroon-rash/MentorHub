package userCreation.events;

import com.fasterxml.jackson.databind.ObjectMapper;

public class UserCreation {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private String authId;
    private String name;
    private String role;
    private String email;
    private boolean isVerified;
    private String source;

    public UserCreation() {
    }

    public UserCreation(String authId, String name, String role, String email, boolean isVerified, String source) {
        this.authId = authId;
        this.name = name;
        this.role = role;
        this.email = email;
        this.isVerified = isVerified;
        this.source = source;
    }

    public static Builder newBuilder() {
        return new Builder();
    }

    public byte[] toByteArray() {
        try {
            return MAPPER.writeValueAsBytes(this);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize UserCreation", ex);
        }
    }

    public static UserCreation parseFrom(byte[] payload) {
        try {
            return MAPPER.readValue(payload, UserCreation.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse UserCreation", ex);
        }
    }

    public String getAuthId() {
        return authId;
    }

    public void setAuthId(String authId) {
        this.authId = authId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean getIsVerified() {
        return isVerified;
    }

    public void setIsVerified(boolean verified) {
        this.isVerified = verified;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public static final class Builder {
        private String authId;
        private String name;
        private String role;
        private String email;
        private boolean isVerified;
        private String source;

        public Builder setAuthId(String authId) {
            this.authId = authId;
            return this;
        }

        public Builder setName(String name) {
            this.name = name;
            return this;
        }

        public Builder setRole(String role) {
            this.role = role;
            return this;
        }

        public Builder setEmail(String email) {
            this.email = email;
            return this;
        }

        public Builder setIsVerified(boolean verified) {
            this.isVerified = verified;
            return this;
        }

        public Builder setSource(String source) {
            this.source = source;
            return this;
        }

        public UserCreation build() {
            return new UserCreation(authId, name, role, email, isVerified, source);
        }
    }
}
