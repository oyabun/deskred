FROM python:3.11-slim

WORKDIR /app

# Copy application files
COPY nexus_server.py /app/
COPY index.html /app/

# Make server executable
RUN chmod +x nexus_server.py

# Expose port
EXPOSE 8080

# Run the web server
CMD ["python", "nexus_server.py"]
