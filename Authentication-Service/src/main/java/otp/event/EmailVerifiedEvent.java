package otp.event;

import com.fasterxml.jackson.databind.ObjectMapper;

public class EmailVerifiedEvent {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private String email;
    private boolean isVerified;

    public EmailVerifiedEvent() {
    }

    public EmailVerifiedEvent(String email, boolean isVerified) {
        this.email = email;
        this.isVerified = isVerified;
    }

    public static Builder newBuilder() {
        return new Builder();
    }

    public byte[] toByteArray() {
        try {
            return MAPPER.writeValueAsBytes(this);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize EmailVerifiedEvent", ex);
        }
    }

    public static EmailVerifiedEvent parseFrom(byte[] payload) {
        try {
            return MAPPER.readValue(payload, EmailVerifiedEvent.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse EmailVerifiedEvent", ex);
        }
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
        isVerified = verified;
    }

    public static final class Builder {
        private String email;
        private boolean isVerified;

        public Builder setEmail(String email) {
            this.email = email;
            return this;
        }

        public Builder setIsVerified(boolean verified) {
            this.isVerified = verified;
            return this;
        }

        public EmailVerifiedEvent build() {
            return new EmailVerifiedEvent(email, isVerified);
        }
    }
}
