#!/bin/bash
# restart.sh - Restart all CIA Web Docker services

echo "🔄 Restarting CIA Web services..."
echo ""

# Restart Docker services
docker-compose restart

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Quick health check
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✓ Services restarted successfully!"
else
    echo "⚠ API may still be starting. Check with: docker-compose logs api"
fi

echo ""
echo "Services should be available at:"
echo "  • API: http://localhost:3001"
echo "  • PostgreSQL: localhost:5432"
echo "  • MinIO: localhost:9000"
