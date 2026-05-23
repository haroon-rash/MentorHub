#!/bin/bash
# ==========================================
# MentorHub Single-Click Start Script
# ==========================================
# This script will build and start all Docker containers
# for the MentorHub microservices application.

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "=========================================="
echo "🚀 Starting MentorHub Ecosystem..."
echo "=========================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running or not accessible."
    echo "Please start Docker and try again."
    exit 1
fi

# Clean up any dangling containers or networks (optional, uncomment if needed)
# docker compose down

echo "☕ Building Java Microservices..."
SERVICES=("Authentication-Service" "student-service" "tutor-service" "review-rating-service" "notification-service")

for SERVICE in "${SERVICES[@]}"; do
    if [ -d "$SERVICE" ]; then
        echo "🔧 Building $SERVICE..."
        (cd "$SERVICE" && mvn clean package -DskipTests)
    fi
done

# Build and start all services in detached mode
echo "📦 Building and spinning up containers..."
docker compose up --build -d --remove-orphans

echo ""
echo "✅ MentorHub is launching!"
echo "You can check the status of your containers using: docker compose ps"
echo "To view live logs, use: docker compose logs -f"
echo ""
echo "🌐 Local Access Links:"
echo "- Frontend:           http://localhost:3005"
echo "- API Gateway:        http://localhost:8080"
echo "- Mailpit (Emails):   http://localhost:8025"
echo ""
echo "Happy Mentoring!"
