package auth.events;

import com.fasterxml.jackson.databind.ObjectMapper;

public class OtpEvent {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private String name;
    private String email;

    public OtpEvent() {
    }

    public OtpEvent(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public static Builder newBuilder() {
        return new Builder();
    }

    public byte[] toByteArray() {
        try {
            return MAPPER.writeValueAsBytes(this);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize OtpEvent", ex);
        }
    }

    public static OtpEvent parseFrom(byte[] payload) {
        try {
            return MAPPER.readValue(payload, OtpEvent.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to parse OtpEvent", ex);
        }
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public static final class Builder {
        private String name;
        private String email;

        public Builder setName(String name) {
            this.name = name;
            return this;
        }

        public Builder setEmail(String email) {
            this.email = email;
            return this;
        }

        public OtpEvent build() {
            return new OtpEvent(name, email);
        }
    }
}
